import { listTeams, listWorkspaces, getUserData } from "./userDataRequests";



export async function reloadCache(accessToken: string, instanceURL: string, callback: (error: Error | null, team: Array<any>, workspaces: { [teamId: string]: any[] }, userData: Array<any> | null) => void) {
    try {
        const teamPromise = await listTeams(accessToken, instanceURL);
        const teams: Array<any> = await teamPromise;
        const workspacesPromise = await listWorkspaces(accessToken, teams, instanceURL);
        const userDataPromise = await getUserData(accessToken, instanceURL);

        const [team, workspaces, userData] = await Promise.all([teamPromise, workspacesPromise, userDataPromise]);

        callback(null, team, workspaces, userData);
    } catch (error) {
        callback(error as Error, [], {}, []);
    }
}