import { listTeams, listWorkspaces, getUserData } from "./userDataRequests";



export async function reloadCache(accessToken: string, callback: (error: Error | null, team: Array<any>, workspaces: { [teamId: string]: any[] }, userData: Array<any> | null) => void) {
    try {
        const teamPromise = await listTeams(accessToken);
        const teams: Array<any> = await teamPromise;
        const workspacesPromise = await listWorkspaces(accessToken, teams);
        const userDataPromise = await getUserData(accessToken);

        const [team, workspaces, userData] = await Promise.all([teamPromise, workspacesPromise, userDataPromise]);

        callback(null, team, workspaces, userData);
    } catch (error) {
        callback(error, [], {}, []);
    }
}