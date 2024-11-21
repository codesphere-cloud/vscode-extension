import axios from "axios";
import * as vscode from "vscode";

export function signIn(email: string, password: string, instanceURL: string): Promise<string> {
    const signInUrl = `${instanceURL}/auth-service/signIn`;

    const requestData = {
        email: email,
        password: password
    };

    console.log('Signing in...');

    return axios.post(signInUrl, requestData)
        .then(response => {
            const { data, status } = response;
            if (status === 200) {
                if (data.code === "Error") {
                    throw new Error(data.errMessage); 
                }
                return data.data.sessionId; 
            } else {
                console.log('error3', response);
                throw new Error(response.statusText); 
            }
        })
        .catch(error => {
            console.log('error1', error);
            throw error; 
        });
}


export function genAccessToken(sessionId: string, instanceURL: string, callback: (error: any, accessToken?: string) => void) {
    const genAccessTokenUrl = `${instanceURL}/auth-service/genAccessToken`;

    const requestData = {
        id: sessionId
    };

    axios.post(genAccessTokenUrl, requestData)
        .then(response => {
            const { data, status } = response;
            if (status === 200) {
                const accessToken = data.data.accessToken;
                callback(null, accessToken); 
            } else {
                vscode.window.showErrorMessage('Failed to generate access token: ' + data.errMessage);
                callback(new Error(data.errMessage));
            }
        })
        .catch(error => {
            console.log('error', error);
            callback(error); 
            vscode.window.showErrorMessage('An error occurred while generating access token: ' + error.message);
        });
}
