import wsLib from 'ws';
import * as vscode from "vscode";
import { parse } from 'path';
const fs = require('fs');

let wsSeq = 1;
let dsSocket: any;
let uaSocket: any;
let wsSocket: any;


const setupWs = (ws: any, name: string, accessToken: undefined, cache?:any, workspaceID?: string) => {
    let reconnectAttempts = 0;
    const RECONNECT_ATTEMPTS = 10000;
    const RECONNECT_DELAY = 5000;
    ws.intentionallyClosed = false;

    ws.on('error', (error: { message: any; }) => {
        console.log(`WebSocket ${name} encountered an error: ${error.message}`);
    });

    ws.on('close', (e: any) => {
        console.log(`WebSocket ${name} closed with code: ${e}`);
        if(ws.intentionallyClosed) {
            console.log(`Websocker ${name} was intentionally closed`);
        } else if (reconnectAttempts < RECONNECT_ATTEMPTS) {
            console.log(`Attempting to reconnect to ${name}... (Attempt ${reconnectAttempts + 1}/${RECONNECT_ATTEMPTS})`);
            setTimeout(() => {
                const newWs = new wsLib.WebSocket(ws.url, { perMessageDeflate: false });
                setupWs(newWs, name, accessToken, cache, workspaceID);
                reconnectAttempts++;
            }, RECONNECT_DELAY);
        } else {
            console.log(`Failed to reconnect to ${name} after ${RECONNECT_ATTEMPTS} attempts.`);
        }
    });

    ws.on('open', () => {
        console.log(name + ' websocket opened successfully');

        if (name === "workspace-proxy") {
            uaSocket = ws;  
        }
        
        if (name === "deployment-service") {
        dsSocket = ws;  
        }

        if (name === "ide-service") {
            uaSocket = ws;  
        }

        if (name === "workspace-service") {
            wsSocket = ws;
        }

        ws.send(JSON.stringify({
            method: "setClientContext",
            endpointId: 1,
            args: {
                requestHeaders: {
                    Authorization: `Bearer ${accessToken}`
                },
                responseHeaders: {},
                httpStatusCode: 200
            }
        }));
    });

    ws.on("message", (data: { toString: () => any; }) => {
        console.log(`Received message from ${name} WebSocket: ${data.toString()}`);
        let msg = data.toString();
        
        
    });

    ws.setMaxListeners(200);

    return new Promise(resolve => {
        ws.on('open', () => resolve(ws));
    });
};

const request = (ws: any, method: any, args: any, name: any, wsId: any) => {
    const TIMEOUT = 10000;

    return new Promise((resolve, reject) => {
        const snd = {
            endpointId: wsId,
            method,
            args
        };
        ws.send(JSON.stringify(snd));
        console.log(`Sent message to ${name} WebSocket: ${JSON.stringify(snd.args)}`);

        const l = (recv: any) => {
            try {
                recv = JSON.parse(recv.toString());
                console.log(`Received message from ${name} WebSocket: ${JSON.stringify(recv)}`);
            } catch (e) {
                reject(e);
                return;
            }
            if (recv.endpointId !== snd.endpointId) {
                return;
            }
            ws.removeListener('message', l);
            if (recv.reply?.code === 'Error') {
                reject(new Error(recv.reply.errMessage));
                return;
            }
            resolve(recv.reply);
        };
        const timeout = setTimeout(() => {
            ws.removeListener('message', l);
            reject(new Error(`No response from ${name} WebSocket after ${TIMEOUT / 1000} seconds.`));
        }, TIMEOUT);
        ws.on('message', l);
    });
};

const waitForWorkspaceRunning = async (deploymentSocket: any, cache: any, workspaceID: any) => {
    return new Promise((resolve, reject) => {
        const nexLogHandler = (msg: any) => {
            const msgTest = msg.toString();
            if (msgTest.includes("and use code")) {
                const codeRegex = /use code\s*([A-Za-z0-9-]+)/i; 
                const codeMatch = msgTest.match(codeRegex);
                if (codeMatch && codeMatch.length > 1) {
                    const extractedCode = codeMatch[1];
                    cache.update(`codesphere.lastCode${workspaceID}`, extractedCode);
                    resolve(extractedCode);
                    deploymentSocket.off("message", nexLogHandler); 
                }
            }
        };

        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };

        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const doesTunnelAlreadyExist = async (deploymentSocket: any, cache: any, workspaceID: any) => { 
    return new Promise((resolve, reject) => {
        const nexLogHandler = (msg: any) => {
            const msgTest = msg.toString();
            if (msgTest.includes("How would you like to log in to Visual Studio Code?")) {
                resolve('not found');
                deploymentSocket.off("message", nexLogHandler); 
            }
            if (msgTest.includes("Connected to an existing tunnel process running on this machine.")) {
                resolve('found');
                deploymentSocket.off("message", nexLogHandler); 
            }
            if (msgTest.includes("Open this link in your browser")) {
                resolve('found-nopid');
                deploymentSocket.off("message", nexLogHandler); 
            }
        };

        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };

        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const giveWorkspaceName = async (deploymentSocket: any) => {
    return new Promise<void>((resolve, reject) =>  {
        const nexLogHandler = (msg: any) => {
            const msgTest = msg.toString();
            if (msgTest.includes("What would you like to call this machine?")) {
                deploymentSocket.off("message", nexLogHandler); 
                resolve(); 
            }
        };
        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const serverIsUp = async (deploymentSocket: any, cache: any, workspaceName:any, workspaceId: any) => {
    return new Promise<void>((resolve, reject) =>  {
        const nexLogHandler = (msg: any) => {
            const msgTest = msg.toString();
            if (msgTest.includes(`Creating tunnel with the name: ${workspaceName}`)) {
                deploymentSocket.off("message", nexLogHandler); 
                resolve(); 
            }
        };
        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const afterTunnelInit = async (deploymentSocket: any, workspaceName: any) => {
    return new Promise<void>((resolve, reject) =>  {
        const nexLogHandler = (msg: any) => {
            const msgTest = msg.toString();
            if (msgTest.includes(`Open this link in your browser https://vscode.dev/tunnel/${workspaceName}/home/user/app`)) {
                deploymentSocket.off("message", nexLogHandler); 
                resolve(); 
            }
        };
        const errorHandler = (err: any): void => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const tunnelIsReady = async (deploymentSocket: any) => {
    return new Promise<void>((resolve, reject) =>  {
        const nexLogHandler = (msg: any) => {
            const msgTest = msg.toString();
            if (msgTest.includes(`Extension install complete`)) {
                deploymentSocket.off("message", nexLogHandler); 
                resolve(); 
            }
        };
        
        const errorHandler = (err: any): void => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const wakeUpWorkspace = async (deploymentSocket: any) => {
    return new Promise<void>((resolve, reject) => {
        const nexLogHandler = (msg: any) => {
            try {
                let msgTest = msg.toString();
                if (msgTest.includes("Workspace already deployed") || msgTest.includes("Resources are deployed")) {
                    deploymentSocket.off("message", nexLogHandler);
                    resolve();
                }
                
            } catch (error) {
                console.error("Error parsing message:", error);
                reject(error);
            }
        };

        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        
        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const getPidFromServer = async (deploymentSocket: any) => {
    return new Promise<void>((resolve, reject) => {
        const nexLogHandler = (msg: any) => {
            try {
                let msgTest = msg.toString();
                if (msgTest.includes("./.codesphere-internal/code tunnel")) {
                    const pidRegex = /user\s+(\d+)/i; 
                    const pidMatch = msgTest.match(pidRegex);
                    if (pidMatch && pidMatch.length > 1) {
                        const extractedPid = pidMatch[1];
                        resolve(extractedPid);
                        deploymentSocket.off("message", nexLogHandler);
                    }
                }
            } catch (error) {
                console.error("Error parsing message:", error);
                reject(error);
            }
        };

        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        
        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const waitForTerminal = async (deploymentSocket: any) => {
    return new Promise<void>((resolve, reject) => {
        const nexLogHandler = (msg: any) => {
            try {
                let msgTest = msg.toString();
                if (msgTest.includes("Welcome to Codesphere!")) {
                    deploymentSocket.off("message", nexLogHandler);
                    resolve();
                }
            } catch (error) {
                console.error("Error parsing message:", error);
                reject(error);
            }
        };

        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        
        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const waitForCiPipeline = async (deploymentSocket: any, endpoint: number) => { 
    return new Promise((resolve, reject) => {
        const nexLogHandler = (msg: any) => {
            try {
                let msgTest = msg.toString();
                if (msgTest.includes("success") && msgTest.includes(`"endpointId":${endpoint}`)) {
                    deploymentSocket.off("message", nexLogHandler);
                    resolve('success');
                }
                if (msgTest.includes("failure") && msgTest.includes(`"endpointId":${endpoint}`)) {
                    deploymentSocket.off("message", nexLogHandler);
                    resolve('failure');
                }
            } catch (error) {
                console.error("Error parsing message:", error);
                reject(error);
            }
        };

        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        
        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const checkCiPipelineState = async (deploymentSocket: any, endpointId: number) => {
    return new Promise((resolve, reject) => {
        const nexLogHandler = (msg: any) => {
            try {
                let msgTest = msg.toString();
                let parsedMsg = JSON.parse(msgTest);
                
                console.log("runstage state: ", parsedMsg);
                if (msgTest.includes(`"endpointId":${endpointId}`)) {
                    deploymentSocket.off("message", nexLogHandler);
                    deploymentSocket.off("error", errorHandler);
                    resolve(parsedMsg.reply);
                }
            } catch (error) {
                console.error("Error parsing message:", error);
                reject(error);
            }
        };

        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };

        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const checkMSDCiPipelineState = async (deploymentSocket: any, endpointId: number, replicaCount: number, runStageServices: any) => {
    return new Promise((resolve, reject) => {

        let count = 0;

        // all replicas are placed into the empty Array
        Object.values(runStageServices).forEach((service: any) => {
            service.replicas = [];
        });
        const nexLogHandler = (msg: any) => {
            try {
                let msgTest = msg.toString();
                let parsedMsg = JSON.parse(msgTest);
            
                if (msgTest.includes(`"endpointId":${endpointId}`)) {
                    if (parsedMsg.reply.server !== "codesphere-ide") {
                        const serverName = parsedMsg.reply.server; 
                        const hostname = parsedMsg.reply.hostname; 
            
                        if (runStageServices[serverName]) {
                            if (typeof runStageServices[serverName].replicas !== "object" || Array.isArray(runStageServices[serverName].replicas)) {
                                runStageServices[serverName].replicas = {};
                            }
            
                            if (!runStageServices[serverName].replicas[hostname]) {
                                runStageServices[serverName].replicas[hostname] = {}; 
                            }
            
                            console.log(
                                `Hostname ${hostname} wurde zu ${serverName}.replicas hinzugefügt.`
                            );
                            count++;
                        } else {
                            console.log(`Server ${serverName} existiert nicht in runStageServices.`);
                        }
                    }
                }
            
                if (parsedMsg.reply.server === "codesphere-ide") {
                    count++;
                }
            
                if (count === replicaCount) {
                    deploymentSocket.off("message", nexLogHandler);
                    deploymentSocket.off("error", errorHandler);
                    console.log("Alle Hostnamen wurden erfolgreich in runStageServices eingetragen.");
                    console.log("gtt ", runStageServices);
                    resolve(runStageServices);
                }
            } catch (error) {
                console.error("Error parsing message:", error);
                reject(error);
            }
        };

        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };

        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const getRemoteURL = async (deploymentSocket: any) => {
    return new Promise((resolve, reject) => {
        const nexLogHandler = (msg: any) => {
            try {
                let msgTest = msg.toString();

                if (msgTest.includes("https://github.com/")) {
                    const urlRegex = /https:\/\/github.com\/([A-Za-z0-9-]+\/[A-Za-z0-9-]+)/i; 
                    const urlMatch = msgTest.match(urlRegex);
                    if (urlMatch && urlMatch.length > 1) {
                        const extractedUrl = urlMatch[1];
                        resolve(extractedUrl);
                        deploymentSocket.off("message", nexLogHandler);
                        deploymentSocket.off("error", errorHandler);
                    }
                }
            } catch (error) {
                console.error("Error parsing message:", error);
                reject(error);
            }
        };

        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        
        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const getGitHubToken = async (deploymentSocket: any) => {
    return new Promise((resolve, reject) => {
        const nexLogHandler = (msg: any) => {
            try {
                let msgTest = msg.toString();
                let parsedMsg = JSON.parse(msgTest);

                if (msgTest.includes("token")) {
                    resolve(parsedMsg.reply.data.token);
                    deploymentSocket.off("message", nexLogHandler);
                    deploymentSocket.off("error", errorHandler);
                }
            } catch (error) {
                console.error("Error parsing message:", error);
                reject(error);
            }
        };

        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        
        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const isVSIX = async (deploymentSocket: any) => {
    return new Promise((resolve, reject) => {
        const nexLogHandler = (msg: any) => {
            try {
                let msgTest = msg.toString();
                if (msgTest.includes("true")) {
                    resolve(true);
                    deploymentSocket.off("message", nexLogHandler);
                    deploymentSocket.off("error", errorHandler);
                }
                if (msgTest.includes("false")) {
                    resolve(false);
                    deploymentSocket.off("message", nexLogHandler);
                    deploymentSocket.off("error", errorHandler);
                }
            } catch (error) {
                console.error("Error parsing message:", error);
                reject(error);
            }
        };

        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        
        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const checkCiPipelineStructure = async (deploymentSocket: any, endpointId: number) => {
    return new Promise((resolve, reject) => {
        const nexLogHandler = (msg: any) => {
            try {
                let msgTest = msg.toString();
                let parsedMsg = JSON.parse(msgTest);

                if (msgTest.includes(`"endpointId":${endpointId}`)) {
                    deploymentSocket.off("message", nexLogHandler);
                    deploymentSocket.off("error", errorHandler);
                    resolve(parsedMsg.reply);
                }
            } catch (error) {
                console.error("Error parsing message:", error);
                reject(error);
            }
        };

        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };

        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};


const ciStepHandler = async (deploymentSocket: any, endpointId: number, endpointArray: Array<number>, postMessage: Function, stage: string) => {
    return new Promise((resolve, reject) => {
        const ciStageStatus = (msg: any) => {
            try {
                let msgTest = msg.toString();
                let parsedMsg = JSON.parse(msgTest);
                
                if (endpointArray.some(id => msgTest.includes(`"endpointId":${id}`))) {
                    if (parsedMsg.reply && parsedMsg.reply[0] && parsedMsg.reply[0].data) {
                        postMessage('updateCiPipelineLogs', {
                            step: (parsedMsg.endpointId - 400),
                            log: parsedMsg.reply[0].data,
                            stage: stage
                        });
                    }
                }

                else if (endpointArray.some(endpointId => msgTest.includes(`"endpointId":${endpointId}`)) && 
                    parsedMsg.reply.complete) {
                    resolve('');
                    cleanup();
                }
            } catch (error) {
                console.error("Error parsing message:", error);
                reject(error);
            }
        };

        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        
        
        deploymentSocket.on("message", ciStageStatus);
        deploymentSocket.on("error", errorHandler);

        const cleanup = () => {
            deploymentSocket.off("message", ciStageStatus);
            deploymentSocket.off("error", errorHandler);
        };
    });
};

const ciStepHandlerMSD = async (deploymentSocket: any, replicaStepEndpoints: Record<string, { steps: Record<number, number> }>, postMessage: Function, stage: string) => {
    return new Promise((resolve, reject) => {
        const ciStageStatus = (msg: any) => {
            try {
                let msgTest = msg.toString();
                let parsedMsg = JSON.parse(msgTest);

                console.log("CiStepHandlerMSD: ", parsedMsg);
                // Iteriere über alle ReplicaKeys
                for (const replicaKey in replicaStepEndpoints) {
                    const steps = replicaStepEndpoints[replicaKey].steps;

                    // Überprüfe alle Schritte für das aktuelle Replica
                    for (const stepIndex in steps) {
                        const endpointId = steps[stepIndex];  // EndpointId für diesen Step und Replica

                        // Überprüfe, ob die msg die richtige endpointId enthält
                        if (msgTest.includes(`"endpointId":${endpointId}`)) {
                            if (parsedMsg.reply) {
                                console.log("parsedMsg LOGS: ", parsedMsg.reply[0].data, "\nreplicaKey", replicaKey, "\nstepIndex", stepIndex, "\nendpointId", endpointId);
                                
                                postMessage('updateCiPipelineLogsMSD', 
                                    {
                                        log: parsedMsg.reply[0].data, 
                                        stepIndex: stepIndex, 
                                        replicaKey: replicaKey
                                    } 
                                );
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Error parsing message:", error);
                reject(error);
            }
        };

        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        
        
        deploymentSocket.on("message", ciStageStatus);
        deploymentSocket.on("error", errorHandler);

        const cleanup = () => {
            deploymentSocket.off("message", ciStageStatus);
            deploymentSocket.off("error", errorHandler);
        };
    });
};

const ciStageStatusHandler = async (deploymentSocket: any, endpointId: number, postMessage: Function, stage: string) => {
    return new Promise((resolve, reject) => {
        const ciStageStatus = (msg: any) => {
            try {
                let msgTest = msg.toString();
                let parsedMsg = JSON.parse(msgTest);

                if (msgTest.includes(`"endpointId":${endpointId}`)) {
                    if (parsedMsg.reply.state === "success") {
                        
                        deploymentSocket.off("message", ciStageStatus);
                        deploymentSocket.off("error", errorHandler);
                        if (stage === 'prepare') {
                            postMessage('ciPipelineStatus', {prepare: parsedMsg.reply, dynamic: 'prepare'} );
                            postMessage('setActionButtion', {stage: 'prepare'});
                        }
                        if (stage === 'test') {
                            postMessage('ciPipelineStatus', {test: parsedMsg.reply, dynamic: 'test'} );
                            postMessage('setActionButtion', {stage: 'test'});
                        }
                        if (stage === 'run') {
                            postMessage('ciPipelineStatus', {run: parsedMsg.reply, dynamic: 'run'} );
                            postMessage('setActionButtion', {stage: 'run'});
                        }
                        resolve('success');
                    }
                    if (parsedMsg.reply.state === "failure" || parsedMsg.reply.state === 'aborted') {
                        deploymentSocket.off("message", ciStageStatus);
                        deploymentSocket.off("error", errorHandler);

                        if (stage === 'prepare') {
                            postMessage('ciPipelineStatus', {prepare: parsedMsg.reply, dynamic: 'prepare'} );
                            postMessage('setActionButtion', {stage: 'prepare'});
                        }
                        if (stage === 'test') {
                            postMessage('ciPipelineStatus', {test: parsedMsg.reply, dynamic: 'test'} );
                            postMessage('setActionButtion', {stage: 'test'});
                        }
                        if (stage === 'run') {
                            postMessage('ciPipelineStatus', {run: parsedMsg.reply, dynamic: 'run'} );
                            postMessage('setActionButtion', {stage: 'run'});
                        }
                        resolve('failure');
                    }
                    if (parsedMsg.reply.state === "running") {
                        
                        postMessage('updateCiStageStatus', {status: parsedMsg.reply.steps, stage: stage, state: parsedMsg.reply.state} );
                        // FIXME
                    }
                }
            } catch (error) {
                console.error("Error parsing message:", error);
                reject(error);
            }
        };

        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        
        
        deploymentSocket.on("message", ciStageStatus);
        deploymentSocket.on("error", errorHandler);
    });
};

const ciStageStatusHandlerMSD = async (deploymentSocket: any, endpointArrayReplica: Record<string, number>, postMessage: Function, stage: string) => {
    return new Promise((resolve, reject) => {
        const ciStageStatus = (msg: any) => {
            try {
                let msgTest = msg.toString();
                let parsedMsg = JSON.parse(msgTest);
                console.log('loooool', parsedMsg);
                console.log('loooool', endpointArrayReplica);

                if (Object.values(endpointArrayReplica).includes(parsedMsg.endpointId)) {
                    // Zugehörigen replicaKey finden
                    const replicaKey = Object.entries(endpointArrayReplica).find(
                        ([key, value]) => value === parsedMsg.endpointId
                    )?.[0]; // Der Key wird hier extrahiert

                    if (parsedMsg.reply) {
                        console.log(
                            'parsedMsg.reply: ',
                            parsedMsg.reply,
                            '\nreplicaKey: ',
                            replicaKey,
                            '\nendpointId',
                            parsedMsg.endpointId // Ausgabe des replicaKeys
                        );
                        //TODO: use postMessage to send data to webview, so that the run Stage status can be updated
                        postMessage('updateCiStageStatusMSD', 
                            {
                                stateReplica: parsedMsg.reply.state, 
                                stepsReplica: parsedMsg.reply.steps, 
                                replicaKey: replicaKey
                            } 
                        );
                    }
                }
            } catch (error) {
                console.error("Error parsing message:", error);
                reject(error);
            }
        };

        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        
        
        deploymentSocket.on("message", ciStageStatus);
        deploymentSocket.on("error", errorHandler);
    });
};


const getSubdomainStructure = async (deploymentSocket: any, endpointId: any) => {
    return new Promise((resolve, reject) => {
        const nexLogHandler = (msg: any) => {
            try {
                let msgTest = msg.toString();
                let parsedMsg = JSON.parse(msgTest);
                if (msgTest.includes(`"endpointId":${endpointId}`)) {
                    let workspaceHostingBaseDomain = parsedMsg.reply.data.workspaceHostingBaseDomain;
                    resolve(workspaceHostingBaseDomain);
                    deploymentSocket.off("message", nexLogHandler);
                }
                
            } catch (error) {
                console.error("Error parsing message:", error);
                reject(error);
            }
        };

        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        
        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};


const landscapeShape = async (deploymentSocket: any, endpointId: any) => {
    return new Promise((resolve, reject) => {
        const nexLogHandler = (msg: any) => {
            try {
                let msgTest = msg.toString();
                let parsedMsg = JSON.parse(msgTest);
                if (msgTest.includes(`"endpointId":${endpointId}`)) {
                    deploymentSocket.off("message", nexLogHandler);
                    resolve(parsedMsg.reply);
                }
                
            } catch (error) {
                console.error("Error parsing message:", error);
                reject(error);
            }
        };

        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        
        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};


                
module.exports = {
    setupWs,
    request,
    waitForWorkspaceRunning,
    giveWorkspaceName,
    serverIsUp,
    afterTunnelInit,
    tunnelIsReady,
    wakeUpWorkspace,
    uaSocket,
    doesTunnelAlreadyExist,
    getPidFromServer,
    waitForTerminal,
    waitForCiPipeline,
    checkCiPipelineState,
    checkMSDCiPipelineState,
    getRemoteURL,
    getGitHubToken,
    isVSIX,
    checkCiPipelineStructure,
    ciStepHandler,
    ciStepHandlerMSD,
    ciStageStatusHandler,
    ciStageStatusHandlerMSD,
    getSubdomainStructure,
    landscapeShape,
    getUaSocket: () => uaSocket,
    getDsSocket: () => dsSocket,
    getWsSocket: () => wsSocket
};