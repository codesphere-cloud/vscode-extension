import * as request from "request";
import * as vscode from "vscode";

// Funktion zum Anmelden
export function signIn(email: string, password: string, callback: (error: any, sessionId?: string) => void) {
    const signInUrl = 'https://codesphere.com/auth-service/signIn';
  
    const requestData = {
        email: email,
        password: password
    };
  
    console.log('Signing in...');
  
    request.post({
        url: signInUrl,
        json: requestData
    }, (error, response, body) => {
        if (error) {
          console.log('error1', error);
          
            callback(new Error(body.errMessage)); // Fehler an die Callback-Funktion übergeben
            return;
        }
  
        if (response.statusCode === 200) {
          console.log('body', body);
            if (body.code === "Error") {
                callback(new Error(body.errMessage)); // Fehler an die Callback-Funktion übergeben
                return;
            }
            const sessionId = body.data.sessionId;
            callback(null, sessionId); // sessionId an die Callback-Funktion übergeben
        } else {
          console.log('error3', response);
            callback(new Error(response.statusMessage)); // Fehler an die Callback-Funktion übergeben
        }
    });
  
    console.log('signed in');
  }
  
  
// Funktion zum Generieren des Access Tokens
export function genAccessToken(sessionId: string, callback: (error: any, accessToken?: string) => void) {
const genAccessTokenUrl = 'https://codesphere.com/auth-service/genAccessToken';

const requestData = {
    id: sessionId
};

console.log('Generating access token...');

request.post({
    url: genAccessTokenUrl,
    json: requestData
}, (error, response, body) => {
    if (error) {
        console.log('error', error);
        console.log('body', body);
        callback(error);
        vscode.window.showErrorMessage('An error occurred while generating access token: ' + error.message);
        return;
    }

    if (response.statusCode === 200) {
        vscode.window.showInformationMessage(`Successfully signed in2`);
        console.log('body', body);
        const accessToken = body.data.accessToken;
        callback(null, accessToken); // sessionId an die Callback-Funktion übergeben


    } else {
        vscode.window.showErrorMessage('Failed to generate access token: ' + body.errMessage);
        callback(new Error(body.errMessage));
    }
});
}