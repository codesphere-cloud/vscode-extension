import axios from 'axios';


// Diese Funktion sendet einen POST-Request an die API, um die Teams abzurufen
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
  
  // Diese Funktion sendet einen POST-Request an die API, um die Workspaces abzurufen
  export async function listWorkspaces(accessToken: string, teams: Array<any>, instanceURL: string): Promise<{ [teamId: string]: Array<any> }> {
    try {
        const workspacePromises = teams.map(async (team) => {
            const response = await axios.post(`${instanceURL}/workspace-service/listWorkspaces`, {
                teamId: team.id
            }, {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                }
            });

            if (response.data.code === "Ok") {
                return response.data.data;
            } else {
                throw new Error(`Fehler beim Abrufen der Workspaces für Team ${team.id}: ${response.data.errMessage}`);
            }
        });

        const workspaceArrays = await Promise.all(workspacePromises);

        const workspaceMap: { [teamId: string]: Array<any> } = {};
        teams.forEach((team, index) => {
            workspaceMap[team.id] = workspaceArrays[index];
        });

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