import * as vscode from "vscode";
import { getNonce } from "./ts/getNonce";
import * as wsLib from 'ws';
const { setupWs, 
        request,  
        getUaSocket,
        checkCiPipelineStructure 
    } = require('./ts/wsService');

export class CiPipelineProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;
  
    constructor(private readonly _extensionUri: vscode.Uri, public extensionContext: vscode.ExtensionContext) {}
    
    

    public resolveWebviewView(webviewView: vscode.WebviewView) {
      this._view = webviewView;
      let cache = this.extensionContext.globalState;

      webviewView.webview.options = {
        // Allow scripts in the webview
        enableScripts: true,
  
        localResourceRoots: [this._extensionUri],
      };

      webviewView.webview.html = this._getHtmlWebview(webviewView.webview);

      webviewView.webview.onDidReceiveMessage(async (data) => {
        let socket: any;
        let uaSocket = getUaSocket();

        switch (data.type) {
            case "getCiPipelineStages": {
                const socketURL = `wss://${data.value.dataCenterId}.codesphere.com/workspace-proxy`;
                console.log(socketURL + `socketURL`);
                const accessToken = await this.extensionContext.secrets.get("codesphere.accessToken") as string;
                const workspaceID: number = parseInt(data.value.workspaceId); 
                socket = await setupWs(new wsLib.WebSocket(socketURL), "workspace-proxy", accessToken, cache, workspaceID);

                uaSocket = getUaSocket();
                let ciStructure: any;
                const ciPipelineCheck = checkCiPipelineStructure(uaSocket, 324);
                ciPipelineCheck.then((ci: any) => {
                    ciStructure = ci;
                    console.log('ciStructure: ' + JSON.stringify(ciStructure));
                    this._view?.webview.postMessage({ 
                        type: "CIPipelineStages", 
                        value: {   
                            'CIArray': `${JSON.stringify(ciStructure)}`
                        }
                    });
                  }
                ); 

                await request(uaSocket, "pipelineStream", { workspaceId: workspaceID}, "workspace-proxy", 324);

                break;
                }
            
            case "currentWorkspace": {
                const workspace: any = await cache.get("codesphere.workspaceOverview");

                const workspaceId = workspace.id;
                const teamId = workspace.teamId;
                const dataCenterId = workspace.dataCenterId;

                this._view?.webview.postMessage({ 
                    type: "currentWorkspace", 
                    value: {   
                        'currentWorkspace': `${workspaceId}`,
                        'teamId': `${teamId}`,
                        'dcId': `${dataCenterId}`
                    }
                });

                break;
            }
            }
        });
    }

    
    public updateWebviewContent() {
      if (this._view) {
        this._view.webview.html = this._getHtmlWebview(this._view.webview);
      }
    }
      
    public revive(panel: vscode.WebviewView) {
      this._view = panel;
    }
    

    private _getHtmlWebview(webview: vscode.Webview) {
        const styleResetUri = webview.asWebviewUri(
          vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
        );
        const scriptUri = webview.asWebviewUri(
          vscode.Uri.joinPath(this._extensionUri, "out", "compiled/cipipeline.js")
        );
        const styleMainUri = webview.asWebviewUri(
          vscode.Uri.joinPath(this._extensionUri, "out", "compiled/cipipeline.css")
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