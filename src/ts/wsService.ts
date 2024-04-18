import wsLib from 'ws';

let wsSeq = 1;
let dsSocket: any;
let uaSocket: any;

const setupWs = (ws: any, name: string, accessToken: undefined) => {
    let reconnectAttempts = 0;
    const RECONNECT_ATTEMPTS = 10000;
    const RECONNECT_DELAY = 5000;
    ws.intentionallyClosed = false;

    ws.on('error', error => {
        console.log(`WebSocket ${name} encountered an error: ${error.message}`);
    });

    ws.on('close', (e) => {
        console.log(`WebSocket ${name} closed with code: ${e}`);
        if(ws.intentionallyClosed) {
            console.log(`Websocker ${name} was intentionally closed`);
        } else if (reconnectAttempts < RECONNECT_ATTEMPTS) {
            console.log(`Attempting to reconnect to ${name}... (Attempt ${reconnectAttempts + 1}/${RECONNECT_ATTEMPTS})`);
            setTimeout(() => {
                const newWs = new wsLib.WebSocket(ws.url, { perMessageDeflate: false });
                setupWs(newWs, name, accessToken);
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

    });

    ws.on("message", data => {
        console.log(`Received message from ${name} WebSocket: ${data.toString()}`);
    });

    return new Promise(resolve => {
        ws.on('open', () => resolve(ws));
    });
};

const request = (ws, method, args, name, wsId) => {
    const TIMEOUT = 10000;

    return new Promise((resolve, reject) => {
        const snd = {
            endpointId: wsId,
            method,
            args
        };
        ws.send(JSON.stringify(snd));
        console.log(`Sent message to ${name} WebSocket: ${JSON.stringify(snd.args)}`);

        const l = (recv) => {
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

const waitForWorkspaceRunning = (deploymentSocket) => {
    return new Promise((resolve, reject) => {
        deploymentSocket.on("message", (msg) => {
            const data = JSON.parse(msg);
            if (data.reply.status === "Workspace is running") {
                return resolve(data);
            }
        });
        deploymentSocket.on("error", (err) => {
            console.log("Socket exited with error:" + err);
            reject(err);
        });
    });
};

module.exports = {
    setupWs,
    request,
    waitForWorkspaceRunning,
    uaSocket,
    getUaSocket: () => uaSocket,
    getDsSocket: () => dsSocket
};