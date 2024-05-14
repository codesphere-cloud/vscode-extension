import * as vscode from 'vscode';
import { AuthorizationCode } from 'simple-oauth2'
import { startOAuthCallbackServer, stopOAuthCallbackServer } from './oauthCallbackServer';


const githubOAuthConfig = {
    client: {
        id: 'Ov23lif3yydQqJSNxmuN',
        secret: '693dc4976ef8555fdfb59336fbd2275afbea7643',
    },
    auth: {
        tokenHost: 'https://github.com',
        tokenPath: '/login/oauth/access_token',
        authorizePath: '/login/oauth/authorize',
    },
};

const oauth2Client = new AuthorizationCode(githubOAuthConfig);

export async function signInToGitHub(callback: (error: any, sessionId?: string) => void) {
    try {
        const redirectUri = await vscode.env.asExternalUri(vscode.Uri.parse('http://localhost:8080/callback'));
        const authorizationUri = oauth2Client.authorizeURL({
            redirect_uri: redirectUri.toString(),
            scope: 'user', // Specify required scopes
        });

        // Start the OAuth callback server before opening the authorization URL
        startOAuthCallbackServer();

        await vscode.env.openExternal(vscode.Uri.parse(authorizationUri));

        vscode.window.showInformationMessage('Initiated GitHub sign-in process.');




        return
    } catch (error) {
        // Type assertion to specify the type of 'error' as 'Error'
        const err = error as Error;
        vscode.window.showErrorMessage('Error initiating GitHub sign-in: ' + err.message);
    }
}

// Ensure the OAuth callback server is stopped when the extension deactivates
export function deactivate() {
    stopOAuthCallbackServer();
}
