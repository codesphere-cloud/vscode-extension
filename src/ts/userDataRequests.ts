import axios from 'axios';


// Diese Funktion sendet einen POST-Request an die API, um die Teams abzurufen
export async function listTeams(accessToken: string): Promise<any[]> {
    try {
        const response = await axios.post('https://codesphere.com/team-service/listTeams', {}, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (response.data.code === "Ok") {
            console.log("Teams erfolgreich abgerufen:");
            console.log(response.data.data); // Hier können Sie die Teams-Liste im Konsolenlog anzeigen lassen
            return response.data.data;
        } else {
            throw new Error(`Fehler beim Abrufen der Teams: ${response.data.errMessage}`);
        }
    } catch (error) {
        throw new Error(`Fehler beim Abrufen der Teams: ${error}`);
    }
}
  
  // Diese Funktion sendet einen POST-Request an die API, um die Workspaces abzurufen
  export async function listWorkspaces(accessToken: string, teams: Array<any>): Promise<{ [teamId: string]: Array<any> }> {
    try {
        console.log(`${teams} so sehen die teams aus`);
        const workspacePromises = teams.map(async (team) => {
            const response = await axios.post('https://codesphere.com/workspace-service/listWorkspaces', {
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

        console.log(`${workspaceMap} so sieht das workspaceMap aus`)

        return workspaceMap;
    } catch (error) {
        throw new Error(`Fehler beim Abrufen der Workspaces: ${error}`);
    }
}

// Diese Funktion sendet einen POST-Request an die API, um die Benutzerdaten abzurufen
export async function getUserData(accessToken: string): Promise<any[]> {
    try {
        const response = await axios.post('https://codesphere.com/auth-service/getUser', {}, {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        });

        if (response.data.code === "Ok") {
            console.log("User erfolgreich abgerufen:");
            console.log(response.data.data); // Hier können Sie die Benutzerdaten im Konsolenlog anzeigen lassen
            return response.data.data;
        } else {
            throw new Error(`Fehler beim Abrufen des Users: ${response.data.errMessage}`);
        }
    } catch (error) {
        throw new Error(`Fehler beim Abrufen der User: ${error}`);
    }
}