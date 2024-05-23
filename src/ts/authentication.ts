import axios from "axios";
import * as vscode from "vscode";

// Funktion zum Anmelden
export function signIn(email: string, password: string, callback: (error: any, sessionId?: string) => void) {
    const signInUrl = 'https://codesphere.com/auth-service/signIn';
  
    const requestData = {
        email: email,
        password: password
    };
  
    console.log('Signing in...');
  
    axios.post(signInUrl, requestData)
        .then(response => {
            const { data, status } = response;
            if (status === 200) {
                console.log('body', data);
                if (data.code === "Error") {
                    callback(new Error(data.errMessage)); // Fehler an die Callback-Funktion übergeben
                    return;
                }
                const sessionId = data.data.sessionId;
                callback(null, sessionId); // sessionId an die Callback-Funktion übergeben
            } else {
                console.log('error3', response);
                callback(new Error(response.statusText)); // Fehler an die Callback-Funktion übergeben
            }
        })
        .catch(error => {
            console.log('error1', error);
            callback(error); // Fehler an die Callback-Funktion übergeben
        });
  
    console.log('signed in');
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
