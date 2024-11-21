import axios from 'axios';
import * as wsLib from 'ws';
const { setupWs, 
        request,
        getUaSocket,
        getSubdomainStructure 
    } = require('./wsService');

// Diese Funktion sendet einen POST-Request an die API, um die Teams abzurufen
export async function listTeams(accessToken: string, instanceURL: string): Promise<any[]> {
    try {
        const response = await axios.post(`${instanceURL}/team-service/listTeams`, {}, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (response.data.code === "Ok") {
            console.log("test teams");
            return response.data.data;
        } else {
            throw new Error(`Fehler beim Abrufen der Teams: ${response.data.errMessage}`);
        }
    } catch (error) {
        throw new Error(`Fehler beim Abrufen der Teams: ${error}`);
    }
}
  
  // Diese Funktion sendet einen POST-Request an die API, um die Workspaces abzurufen
  export async function listWorkspaces(accessToken: string, teams: Array<any>, instanceURL: string): Promise<{ [teamId: string]: Array<any> }> {
    try {
        let socket: any;
        let uaSocket: any;

        // Funktion für künstliche Verzögerungen (falls benötigt)
        const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

        // Map für die Ergebnisse
        const workspaceMap: { [teamId: string]: Array<any> } = {};
        let endpointId = 999;
        for (const team of teams) {
            // Initialisiere WebSocket-Verbindung, falls nicht vorhanden
            if (!socket) {
                const strippedURL = instanceURL.split("://")[1];
                const socketURL = `wss://${team.defaultDataCenterId}.${strippedURL}/ide-service`;
                console.log(`Socket URL: ${socketURL}`);
                socket = await setupWs(new wsLib.WebSocket(socketURL), "ide-service", accessToken);
                uaSocket = getUaSocket();
            }

            // Abrufen der Workspaces für das aktuelle Team
            const response = await axios.post(`${instanceURL}/workspace-service/listWorkspaces`, {
                teamId: team.id
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            if (response.data.code === "Ok") {
                // Subdomain-Struktur abrufen
                const structure = getSubdomainStructure(uaSocket, endpointId);
                
                // Konfiguration abrufen
                await request(uaSocket, "getBrowserConfig", {}, "ide-service", endpointId);

                const subDomainStructure = await structure;
                console.log(`Subdomain structure: ${subDomainStructure}`);

                // Workspaces anreichern
                const enrichedData = response.data.data.map((workspace: any) => ({
                    ...workspace,
                    subDomainStructure
                }));

                // Ergebnis im Map speichern
                workspaceMap[team.id] = enrichedData;
                endpointId++;
            } else {
                throw new Error(`Fehler beim Abrufen der Workspaces für Team ${team.id}: ${response.data.errMessage}`);
            }

            // Optional: Verzögerung einfügen (falls erforderlich)
            // await delay(100); // Beispiel: 100ms Verzögerung
        }
        console.log(`${JSON.stringify(workspaceMap)}`);
        return workspaceMap;
    } catch (error) {
        throw new Error(`Fehler beim Abrufen der Workspaces: ${error}`);
    }
}


export async function getUserData(accessToken: string, instanceURL: string): Promise<any> {
    try {
        const userResponse = await axios.post(`${instanceURL}/auth-service/getUser`, {}, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (userResponse.data.code !== "Ok") {
            throw new Error(`Fehler beim Abrufen des Users: ${userResponse.data.errMessage}`);
        }

        let userData = userResponse.data.data;
        console.log(`Userdaten: ${JSON.stringify(userData)}`);

        const avatarResponse = await axios.post(`${instanceURL}/auth-service/getAvatarURL`, [userData.userId], {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (avatarResponse.data.code !== "Ok") {
            throw new Error(`Fehler beim Abrufen des Avatars: ${avatarResponse.data.errMessage}`);
        }

        // const avatarURL = avatarResponse.data.avatarURL;
        console.log(`Avatar URL: ${JSON.stringify(avatarResponse.data.data[0])}`);

        userData = {
            ...userData,
            avatarURL: avatarResponse.data.data[0]
        };

        console.log(`Userdaten mit Avatar: ${JSON.stringify(userData)}`);

        return userData;
    } catch (error) {
        throw new Error(`Fehler beim Abrufen der Userdaten: ${error}`);
    }
}