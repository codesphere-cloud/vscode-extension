import WebSocket from 'ws';

export async function setupWebSocket(websocketUrl: string, accessToken: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
        const socket = new WebSocket(websocketUrl);

        socket.onopen = () => {
            console.log('WebSocket connection opened');
            
            const authMessage = {
                method: 'setClientContext',
                endpointId: 43,
                args: {
                    requestHeaders: {
                        Authorization: `Bearer ${accessToken}`
                    }
                }
            };
            socket.send(JSON.stringify(authMessage));

            const terminalSessionsStream = {
                method: 'terminalSessionsStream',
                endpointId: 44,
                args: {
                    workspaceId: 55894
                }
            };
            socket.send(JSON.stringify(terminalSessionsStream));
        };

        socket.onerror = (error) => {
            reject(error);
        };

        socket.onclose = () => {
            console.log('WebSocket connection closed');
        };

        socket.onmessage = (event) => {
            console.log('Received message:', event.data);
            // Handle incoming messages here
        };

        resolve(socket);
    });
}
