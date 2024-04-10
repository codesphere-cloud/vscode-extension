import * as vscode from "vscode";
import { SecretStorage, ExtensionContext } from "vscode";
import { getNonce } from "./getNonce";
import * as request from "request";
import axios from 'axios';


const requestOptions = {
  method: 'POST',
  url: 'https://codesphere.com/ide-service/getBrowserConfig',
  body: {},
  json: true
};

// Funktion zum Anmelden
function signIn(email: string, password: string, callback: (error: any, sessionId?: string) => void) {
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
function genAccessToken(sessionId: string, callback: (error: any, accessToken?: string) => void) {
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

// Diese Funktion sendet einen POST-Request an die API, um die Teams abzurufen
async function listTeams(accessToken: string, callback: (error: Error | null, teams: string[] | null) => void) {
  try {
      const response = await axios.post('https://codesphere.com/team-service/listTeams', {}, {
          headers: {
              Authorization: `Bearer ${accessToken}`
          }
      });

      if (response.data.code === "Ok") {
          console.log("Teams erfolgreich abgerufen:");
          console.log(response.data.data); // Hier können Sie die Teams-Liste im Konsolenlog anzeigen lassen
      } else {
          console.error(`Fehler beim Abrufen der Teams: ${response.data.errMessage}`);
      }
} catch (error: any) {
console.error(`Fehler beim Abrufen der Teams: ${error.message}`);
}
}



export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  _doc?: vscode.TextDocument;

  constructor(private readonly _extensionUri: vscode.Uri, public extensionContext: ExtensionContext) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      switch (data.type) {
    
        case "onInfo": {
          if (!data.value) {
            return;
          }
          vscode.window.showInformationMessage(data.value);
          break;
        }
        case "onError": {
          if (!data.value) {
            return;
          }
          vscode.window.showErrorMessage(data.value);
          break;
        }
        // Verwendung der Funktion signIn
        case "signin": {
          if (!data.value) {
            return;
          }
          
          // Variable zum Speichern der sessionId deklarieren
          let storedSessionId: string | undefined;
        
          signIn(data.value.email, data.value.password, async (error, sessionId) => {
            if (error) {
              console.log('error2', error);
              vscode.window.showErrorMessage('An error occurred while signing in: ' + error.message);
              this._view?.webview.postMessage({ type: "onError", value: error.message });
              return;
            }
        
            vscode.window.showInformationMessage(`Successfully signed in`);
            
            this.extensionContext.secrets.store("codesphere.sessionId", sessionId as string);
            // sessionId in der Variable speichern
            const storedSessionId: string | undefined = await this.extensionContext.secrets.get("codesphere.sessionId");
        
            // Die genAccessToken-Funktion aufrufen, wenn sessionId verfügbar ist
            
            genAccessToken(storedSessionId as string, async (error, accessToken) => {
              if (error) {
                vscode.window.showErrorMessage('An error occurred while generating access token: ' + error.message);
                return;
              }
      
              this.extensionContext.secrets.store("codesphere.accessToken", accessToken as string);

      
              vscode.window.showInformationMessage(`Successfully generated access token`);
              // After successful sign in, update the webview content
              webviewView.webview.html = this._getHtmlForWebviewAfterSignIn(webviewView.webview);
              // After the user has successfully logged in
              vscode.commands.executeCommand('setContext', 'codesphere.isLoggedIn', true);
            });
          });
          break;
        }
        case "test": {
          if (!data.value) {
            return;
          }
          const accessToken = await this.extensionContext.secrets.get("codesphere.accessToken");
          listTeams(accessToken as string, (error: Error | null, teams: string[] | null) => {
            if (error) {
              vscode.window.showErrorMessage('An error occurred while listing teams: ' + error.message);
              return;
            }
            const message = teams ? teams.join(', ') : 'No teams found.';
            vscode.window.showInformationMessage(`Successfully listed teams: ${message}`);
          });

          vscode.window.showInformationMessage(data.value);
          break;
        }
        case "logout": {
          if (!data.value) {
            return;
          }
          this.extensionContext.secrets.delete("codesphere.sessionId");
          this.extensionContext.secrets.delete("codesphere.accessToken");

          vscode.window.showInformationMessage("Successfully logged out");
          // After successful sign in, update the webview content
          webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
          break;
        }
        }
        
      });
    }
      public updateWebviewContent() {
        if (this._view) {
          this._view.webview.html = this._getHtmlForWebview(this._view.webview);
        }
      }

      

    public revive(panel: vscode.WebviewView) {
      this._view = panel;
    }

  private _getHtmlForWebview(webview: vscode.Webview) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.js")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled/sidebar.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${
      webview.cspSource
    }; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();
        </script>
			</head>
      <body>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }

  private _getHtmlForWebviewAfterSignIn(webview: vscode.Webview) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled/codesphere.js")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled/codesphere.css")
    );
    const styleVSCodeUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "vscode.css")
    );

    // Use a nonce to only allow a specific script to be run.
    const nonce = getNonce();

    return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
        -->
        <meta http-equiv="Content-Security-Policy" content="img-src https: data:; style-src 'unsafe-inline' ${
      webview.cspSource
    }; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
        <link href="${styleMainUri}" rel="stylesheet">
        <script nonce="${nonce}">
          const vscode = acquireVsCodeApi();
        </script>
			</head>
      <body>
				<script nonce="${nonce}" src="${scriptUri}"></script>
			</body>
			</html>`;
  }
}