import wsLib from 'ws';
import * as vscode from "vscode";
import { parse } from 'path';
const fs = require('fs');

let wsSeq = 1;
let dsSocket: any;
let uaSocket: any;


const setupWs = (ws: any, name: string, accessToken: undefined, cache:any, workspaceID: string) => {
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
            uaSocket = ws;  // Update the reference to the current WebSocket for "user-activity"
          }

        // send authentication message to authenticate the websocket
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

        if (name === "deployment-service") {
            uaSocket = ws;  // Update the reference to the current WebSocket for "user-activity"
          }

        // send authentication message to authenticate the websocket
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

        if (name === "ide-service") {
            uaSocket = ws;  // Update the reference to the current WebSocket for "user-activity"
          }

        // send authentication message to authenticate the websocket
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
        // Handler für Nachrichten
        const nexLogHandler = (msg: any) => {
            const msgTest = msg.toString();
            if (msgTest.includes("and use code")) {
                const codeRegex = /use code\s*([A-Za-z0-9-]+)/i; 
                const codeMatch = msgTest.match(codeRegex);
                if (codeMatch && codeMatch.length > 1) {
                    const extractedCode = codeMatch[1];
                    cache.update(`codesphere.lastCode${workspaceID}`, extractedCode);
                    // Wenn der Code extrahiert wurde, erfülle die Promise und entferne den Handler
                    resolve(extractedCode);
                    deploymentSocket.off("message", nexLogHandler); // Entferne den Handler für zukünftige Nachrichten
                }
            }
        };

        // Handler für Fehler
        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };

        // Hinzufügen von Nachrichten- und Fehlerhandlern
        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const doesTunnelAlreadyExist = async (deploymentSocket: any, cache: any, workspaceID: any) => { 
    return new Promise((resolve, reject) => {
        // Handler für Nachrichten
        const nexLogHandler = (msg: any) => {
            const msgTest = msg.toString();
            if (msgTest.includes("How would you like to log in to Visual Studio Code?")) {
                resolve('not found');
                deploymentSocket.off("message", nexLogHandler); // Entferne den Handler für zukünftige Nachrichten
            }
            if (msgTest.includes("Connected to an existing tunnel process running on this machine.")) {
                resolve('found');
                deploymentSocket.off("message", nexLogHandler); // Entferne den Handler für zukünftige Nachrichten
            }
            if (msgTest.includes("Open this link in your browser")) {
                resolve('found-nopid');
                deploymentSocket.off("message", nexLogHandler); // Entferne den Handler für zukünftige Nachrichten
            }
        };

        // Handler für Fehler
        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };

        // Hinzufügen von Nachrichten- und Fehlerhandlern
        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const giveWorkspaceName = async (deploymentSocket: any) => {
    return new Promise<void>((resolve, reject) =>  {
        const nexLogHandler = (msg: any) => {
            const msgTest = msg.toString();
            if (msgTest.includes("What would you like to call this machine?")) {
                deploymentSocket.off("message", nexLogHandler); // Entferne den Handler für zukünftige Nachrichten
                resolve(); // Kein Argument erforderlich
            }
        };
        // Handler für Fehler
        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        // Hinzufügen von Nachrichten- und Fehlerhandlern
        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const serverIsUp = async (deploymentSocket: any, cache: any, workspaceName:any, workspaceId: any) => {
    return new Promise<void>((resolve, reject) =>  {
        const nexLogHandler = (msg: any) => {
            const msgTest = msg.toString();
            if (msgTest.includes(`Creating tunnel with the name: ${workspaceName}`)) {
                deploymentSocket.off("message", nexLogHandler); // Entferne den Handler für zukünftige Nachrichten
                resolve(); // Kein Argument erforderlich
            }
        };
        // Handler für Fehler
        const errorHandler = (err: any) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        // Hinzufügen von Nachrichten- und Fehlerhandlern
        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const afterTunnelInit = async (deploymentSocket: any, workspaceName: any) => {
    return new Promise<void>((resolve, reject) =>  {
        const nexLogHandler = (msg: any) => {
            const msgTest = msg.toString();
            if (msgTest.includes(`Open this link in your browser https://vscode.dev/tunnel/${workspaceName}/home/user/app`)) {
                deploymentSocket.off("message", nexLogHandler); // Entferne den Handler für zukünftige Nachrichten
                resolve(); // Kein Argument erforderlich
            }
        };
        // Handler für Fehler
        const errorHandler = (err: any): void => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        // Hinzufügen von Nachrichten- und Fehlerhandlern
        deploymentSocket.on("message", nexLogHandler);
        deploymentSocket.on("error", errorHandler);
    });
};

const tunnelIsReady = async (deploymentSocket: any) => {
    return new Promise<void>((resolve, reject) =>  {
        const nexLogHandler = (msg: any) => {
            const msgTest = msg.toString();
            if (msgTest.includes(`Extension install complete`)) {
                deploymentSocket.off("message", nexLogHandler); // Entferne den Handler für zukünftige Nachrichten
                resolve(); // Kein Argument erforderlich
            }
        };
        // Handler für Fehler
        const errorHandler = (err: any): void => {
            console.log("Socket exited with error:" + err);
            reject(err);
        };
        // Hinzufügen von Nachrichten- und Fehlerhandlern
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
                        console.log("Extracted PID: " + extractedPid);
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

                if (msgTest.includes(`"endpointId":${endpointId}`)) {
                    console.log(`tests14` + msgTest)
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
                    console.log(`ci-Structure` + msgTest)
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

const ciStageStatusHandler = async (deploymentSocket: any, endpointId: number, postMessage: Function, stage: string) => {
    return new Promise((resolve, reject) => {
        const ciStageStatus = (msg: any) => {
            try {
                let msgTest = msg.toString();
                let parsedMsg = JSON.parse(msgTest);

                if (msgTest.includes(`"endpointId":${endpointId}`)) {
                    // ci-pipeline has finished successfully
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
                    // ci-pipeline has failed
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
                    // ci-pipeline is still running
                    // return the state of each step, so the UI can be updated
                    if (parsedMsg.reply.state === "running") {
                        
                        postMessage('updateCiStageStatus', {status: parsedMsg.reply.steps, stage: stage, state: parsedMsg.reply.state} );
                        
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
    getRemoteURL,
    getGitHubToken,
    isVSIX,
    checkCiPipelineStructure,
    ciStepHandler,
    ciStageStatusHandler,
    getUaSocket: () => uaSocket,
    getDsSocket: () => dsSocket
};