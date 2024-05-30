import axios from "axios";
import * as vscode from "vscode";

// Funktion zum Anmelden
export function signIn(email: string, password: string): Promise<string> {
    const signInUrl = 'https://codesphere.com/auth-service/signIn';

    const requestData = {
        email: email,
        password: password
    };

    console.log('Signing in...');

    return axios.post(signInUrl, requestData)
        .then(response => {
            const { data, status } = response;
            if (status === 200) {
                console.log('body', data);
                if (data.code === "Error") {
                    throw new Error(data.errMessage); // Fehler werfen
                }
                return data.data.sessionId; // sessionId zurückgeben
            } else {
                console.log('error3', response);
                throw new Error(response.statusText); // Fehler werfen
            }
        })
        .catch(error => {
            console.log('error1', error);
            throw error; // Fehler weiterwerfen
        });
}

// Funktion zum Generieren des Access Tokens
export function genAccessToken(sessionId: string, callback: (error: any, accessToken?: string) => void) {
    const genAccessTokenUrl = 'https://codesphere.com/auth-service/genAccessToken';

    const requestData = {
        id: sessionId
    };

    axios.post(genAccessTokenUrl, requestData)
        .then(response => {
            const { data, status } = response;
            if (status === 200) {
                console.log('body', data);
                const accessToken = data.data.accessToken;
                callback(null, accessToken); // accessToken an die Callback-Funktion übergeben
            } else {
                vscode.window.showErrorMessage('Failed to generate access token: ' + data.errMessage);
                callback(new Error(data.errMessage));
            }
        })
        .catch(error => {
            console.log('error', error);
            callback(error); // Fehler an die Callback-Funktion übergeben
            vscode.window.showErrorMessage('An error occurred while generating access token: ' + error.message);
        });
}
