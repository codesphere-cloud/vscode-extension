import axios from 'axios';
import * as wsLib from 'ws';
const { setupWs, 
        request,
        getUaSocket,
        getSubdomainStructure 
    } = require('./wsService');

export async function listTeams(accessToken: string, instanceURL: string): Promise<any[]> {
    try {
        const response = await axios.post(`${instanceURL}/team-service/listTeams`, {}, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (response.data.code === "Ok") {
            return response.data.data;
        } else {
            throw new Error(`Fehler beim Abrufen der Teams: ${response.data.errMessage}`);
        }
    } catch (error) {
        throw new Error(`Fehler beim Abrufen der Teams: ${error}`);
    }
}
  
  export async function listWorkspaces(accessToken: string, teams: Array<any>, instanceURL: string): Promise<{ [teamId: string]: Array<any> }> {
    try {
        let socket: any;
        let uaSocket: any;
        let socketURL: any;
        const strippedURL = instanceURL.split("://")[1];

        const workspaceMap: { [teamId: string]: Array<any> } = {};
        let endpointId = 999;
        for (const team of teams) {
            if (!socket || socketURL !== `wss://${team.defaultDataCenterId}.${strippedURL}/ide-service`) {
                socketURL = `wss://${team.defaultDataCenterId}.${strippedURL}/ide-service`;
                socket = await setupWs(new wsLib.WebSocket(socketURL), "ide-service", accessToken);
                uaSocket = getUaSocket();
            }

            const response = await axios.post(`${instanceURL}/workspace-service/listWorkspaces`, {
                teamId: team.id
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            if (response.data.code === "Ok") {
                const structure = getSubdomainStructure(uaSocket, endpointId);
                
                await request(uaSocket, "getBrowserConfig", {}, "ide-service", endpointId);

                const subDomainStructure = await structure;

                const enrichedData = response.data.data.map((workspace: any) => ({
                    ...workspace,
                    subDomainStructure
                }));

                workspaceMap[team.id] = enrichedData;
                endpointId++;
            } else {
                throw new Error(`Fehler beim Abrufen der Workspaces für Team ${team.id}: ${response.data.errMessage}`);
            }
        }
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

        const avatarResponse = await axios.post(`${instanceURL}/auth-service/getAvatarURL`, [userData.userId], {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (avatarResponse.data.code !== "Ok") {
            throw new Error(`Fehler beim Abrufen des Avatars: ${avatarResponse.data.errMessage}`);
        }


        userData = {
            ...userData,
            avatarURL: avatarResponse.data.data[0]
        };


        return userData;
    } catch (error) {
        throw new Error(`Fehler beim Abrufen der Userdaten: ${error}`);
    }
}