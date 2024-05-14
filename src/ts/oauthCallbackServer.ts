import express from 'express';
import { createServer, Server } from 'http';
const { setupWs, 
    request } = require('./wsService')
import * as wsLib from 'ws';
const app = express();
const port = 8080;

let server: Server;

app.get('/callback', async (req, res) => {
    const code = req.query.code as string;
    // Handle the OAuth callback code here
    let socket: any;
    const socketURL = `wss://2.codesphere.com/auth-service`;
    socket = await setupWs(new wsLib.WebSocket(socketURL), "auth-service");
    const sessionId = await request(socket, "authorizeWithOAuth", { code: code }, "authorizeWithOAuth", 6);
    console.log(sessionId)
    res.send(code);
    server.close(); // Close the server after handling the callback
});

export function startOAuthCallbackServer() {
    server = createServer(app);

    server.listen(port, () => {
        console.log(`OAuth callback server listening on port ${port}`);
    });
}

export function stopOAuthCallbackServer() {
    if (server) {
        server.close();
    }
}
