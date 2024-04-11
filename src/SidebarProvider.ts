import * as vscode from "vscode";
import { getNonce } from "./ts/getNonce";
import { signIn, genAccessToken } from "./ts/authentication";
import { listTeams, listWorkspaces, getUserData } from "./ts/userDataRequests";



export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  _doc?: vscode.TextDocument;

  constructor(private readonly _extensionUri: vscode.Uri, public extensionContext: vscode.ExtensionContext) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;

    webviewView.webview.options = {
      // Allow scripts in the webview
      enableScripts: true,

      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    let cache = this.extensionContext.globalState;
    cache.update("codesphere.teams", null);
    cache.update("codesphere.workspaces", null);
    cache.setKeysForSync(["codesphere.teams", "codesphere.workspaces", "codesphere.userData"]);

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

          const accessToken = await this.extensionContext.secrets.get("codesphere.accessToken");
          try {
            const teams = await listTeams(accessToken as string);
            vscode.window.showInformationMessage(`Successfully listed teams: ${JSON.stringify(teams)}`);
            cache.update("codesphere.teams", teams);
        
            let teamArray = cache.get("codesphere.teams");
            this._view?.webview.postMessage({ type: "listTeams", value: `${JSON.stringify(teamArray)}` });
        } catch (error) {
            console.log('error', error);
        }

        try {
          const teams: Array<any> = cache.get("codesphere.teams") as Array<any>;
          const workspaces = await listWorkspaces(accessToken as string, teams);
          cache.update("codesphere.workspaces", workspaces);
          
          const message = cache.get("codesphere.workspaces");
          vscode.window.showInformationMessage(`Successfully listed workspaces: ${message}`);
        } catch (error) {
          console.log('error', error);
        }
      
      try {
          const userData = await getUserData(accessToken as string);
          vscode.window.showInformationMessage(`Successfully listed user: ${JSON.stringify(userData)}`);
          cache.update("codesphere.userData", userData);
      
          let user = cache.get("codesphere.userData");
          this._view?.webview.postMessage({ type: "getUserData", value: `${JSON.stringify(user)}` });
      } catch (error) {
          console.log(error);
      }


          break;
        }
        case "listTeams": {
          if (!data.value) {
            return;
          }
          

          let teamArray = cache.get("codesphere.teams");
          this._view?.webview.postMessage({ type: "listTeams", value: `${JSON.stringify(teamArray)}` });
          
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
        case "getWorkspaces": {
          if (!data.value) {
            return;
          }
          let workspaces = cache.get("codesphere.workspaces");
          this._view?.webview.postMessage({ type: "getWorkspaces", value: `${JSON.stringify(workspaces)}` });

          vscode.window.showInformationMessage(data.value);
          break;
        }
        case "getUserData": {
          if (!data.value) {
            return;
          }
          

          let user = cache.get("codesphere.userData");
          console.log(user);
          this._view?.webview.postMessage({ type: "getUserData", value: `${JSON.stringify(user)}` });
          
          vscode.window.showInformationMessage(data.value);
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