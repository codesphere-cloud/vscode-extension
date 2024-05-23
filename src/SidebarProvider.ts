import * as vscode from "vscode";
import { getNonce } from "./ts/getNonce";
import { signIn, genAccessToken } from "./ts/authentication";
import { listTeams, listWorkspaces, getUserData } from "./ts/userDataRequests";
const { setupWs, 
        request, 
        waitForWorkspaceRunning, 
        getUaSocket, 
        giveWorkspaceName,
        afterTunnelInit,
        tunnelIsReady,
        wakeUpWorkspace,
        doesTunnelAlreadyExist,
        getPidFromServer,
        waitForTerminal,
        waitForCiPipeline,
        checkCiPipelineState,
        serverIsUp } = require('./ts/wsService');
import { readBashFile } from "./ts/readBash";
import * as wsLib from 'ws';
import { sanitizeWorkspaceName } from "./ts/sanatizeWorkspaceNames";
import axios from 'axios';
import { exec } from 'child_process';

const extension_package = require('../package.json');
const version = extension_package.version;
// Definiere den Pfad zur VSIX-Datei
const vsixFile = 'codesphere-'+version+'.vsix';



export class SidebarProvider implements vscode.WebviewViewProvider {
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

    if (!cache.get("codesphere.isLoggedIn") || cache.get("codesphere.isLoggedIn") === false) {
      vscode.commands.executeCommand('setContext', 'codesphere.isLoggedIn', false);
      cache.update("codesphere.isLoggedIn", false);
      webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
      console.log('Congratulations, your extension "codesphere" is now active! Please Log in.');
    
      }
  
    if (cache.get("codesphere.isLoggedIn") === true) {
      vscode.commands.executeCommand('setContext', 'codesphere.isLoggedIn', true);
      cache.update("codesphere.isLoggedIn", true);
      webviewView.webview.html = this._getHtmlForWebviewAfterSignIn(webviewView.webview);
      console.log('Congratulations, your extension "codesphere" is now active! You are logged in.');
    }

    if (cache.get("codesphere.isLoggedIn") === true && cache.get('codesphere.currentWorkspace') !== '') {
      vscode.commands.executeCommand('setContext', 'codesphere.isLoggedIn', true);
      cache.update("codesphere.isLoggedIn", true);
      webviewView.webview.html = this._getHtmlWebviewOverview(webviewView.webview);
      console.log('Congratulations, your extension "codesphere" is now active! You are logged in.');

      let currentWorkspace = parseInt(cache.get('codesphere.currentWorkspace') as string);
      const workspacesInTeam: any = cache.get("codesphere.workspaces");
      let matchingObject = null;

      for (const teamId in workspacesInTeam) {
        const workspaces = workspacesInTeam[teamId]; // Hole die Liste der Arbeitsbereiche für das Team
        for (const workspace of workspaces) {
          if (parseInt(workspace.id) === currentWorkspace) {
            matchingObject = workspace;
            break; // Verlasse die Schleife, sobald ein Treffer gefunden wurde
          }
        }
        if (matchingObject) {
          break; // Verlasse die äußere Schleife, sobald ein Treffer gefunden wurde
        }
      }
      cache.update("codesphere.currentconnectedWorkspace", matchingObject);

      // Check if the workspace exists before using it
      if (matchingObject) {
        console.log('selectedWorkspace', matchingObject);
        
        this._view?.webview.postMessage({
          type: "overviewData",
          value: {
            workspace: matchingObject,
          },
        });
      } 
    }
    
    if (!cache.get("codesphere.isLoggedIn")) {
      vscode.commands.executeCommand('setContext', 'codesphere.isLoggedIn', false);
      cache.update("codesphere.isLoggedIn", false);
    }

    if (!cache.get("codesphere.accessTokenCache")) {
      cache.update("codesphere.accessTokenCache", "");
    }

    if (!cache.get("codesphere.teams")) {
      cache.update("codesphere.teams", []);
    }

    if (!cache.get("codesphere.workspaces")) {
      cache.update("codesphere.workspaces", {});
    }

    if (!cache.get("codesphere.userData")) {
      cache.update("codesphere.userData", {});
    }

    if (!cache.get("codesphere.lastCode")) {
      cache.update("codesphere.lastCode", "");
    }

    if (!cache.get("codesphere.activeTunnel")) {
      cache.update("codesphere.activeTunnel", {});
    }

    cache.setKeysForSync(["codesphere.isLoggedIn", 
                          "codesphere.accessTokenCache", 
                          "codesphere.teams", 
                          "codesphere.workspaces", 
                          "codesphere.userData", 
                          "codesphere.lastCode", 
                          "codesphere.activeTunnel",
                          "codesphere.currentWorkspace"]);

    webviewView.webview.onDidReceiveMessage(async (data) => {
      let socket: any;
      let uaSocket = getUaSocket();
      let uaSocket2 = getUaSocket();
      let testSocket: any;

      switch (data.type) {
        case "testConnection": {
          try {
              const response = await axios.post('https://codesphere.com/team-service/listTeams', {}, {
                  headers: {
                      Authorization: `Bearer ${cache.get("codesphere.accessTokenCache")}`
                  }
              });
              if (response.data.code === "Ok") {
                  console.log("Token is valid");
              } else {
                  webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
                  console.log('Token is invalid');
                  throw new Error(`Fehler beim Abrufen der Teams: ${response.data.errMessage}`);
              }
          } catch (error) {
            webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
            console.log('Token is invalid');

              throw new Error(`Fehler beim Abrufen der Teams: ${error}`);
          }
          
          break;
        }
        case "opensocket": {
          if (!data.value) {
            return;
          }
          const workspaceId = data.value.workspaceId;
          const workspaceName = data.value.workspaceName;
          const socketURL = `wss://${data.value.datacenterId}.codesphere.com/workspace-proxy`;
          const accessToken = await this.extensionContext.secrets.get("codesphere.accessToken") as string;
          const teamId = data.value.teamId;
          socket = await setupWs(new wsLib.WebSocket(socketURL), "workspace-proxy", accessToken, cache, workspaceId);

          uaSocket = getUaSocket();

          await request(uaSocket, "terminalSessionsStream", { workspaceId: workspaceId }, "terminalSessionsStream", 2);

          // Warte auf die Antwort des vorherigen Requests und extrahiere den tmuxSessionName
          const terminalSessionsResponse = await request(uaSocket, "createTmuxSession", { workspaceId: workspaceId }, "workspace-proxy", 3);
          const tmuxSessionName = terminalSessionsResponse.data.name;

          await request(uaSocket, "terminalStream", { method: "init", teamId: 35678, workspaceId: workspaceId, tmuxSessionName: tmuxSessionName }, "workspace-proxy", 4);
          
          let activeTunnel: any= cache.get(`codesphere.activeTunnel`);

          const bashFilePath  = vscode.Uri.joinPath(this._extensionUri, "src", "sh", "installVSCodeServer.sh");
          const bashScript = await readBashFile(bashFilePath.fsPath);
          await request(uaSocket, "terminalStream", { method: "data", data: bashScript }, "workspace-proxy", 4);

          const codePromise = waitForWorkspaceRunning(uaSocket, cache, workspaceId);

          let tunnelExists = await doesTunnelAlreadyExist(uaSocket);
          if (tunnelExists === 'not found') {
            console.log('not found');
          } 
          
          if (tunnelExists === 'found-nopid') {
            const terminalSessionsBgProcess = await request(uaSocket, "createTmuxSession", { workspaceId: workspaceId }, "workspace-proxy", 3);
            const tmuxSessionNameBgProcess = terminalSessionsBgProcess.data.name;
            
            await request(uaSocket, "terminalStream", { method: "init", teamId: 35678, workspaceId: workspaceId, tmuxSessionName: tmuxSessionNameBgProcess }, "workspace-proxy", 7);
            await request(uaSocket, "terminalStream", { method: "data", data: "nohup ./code tunnel\r" }, "workspace-proxy", 7);
            await request(uaSocket, "terminalStream", { method: "data", data: "^Z\r" }, "workspace-proxy", 7);
            await request(uaSocket, "terminalStream", { method: "data", data: "bg\r" }, "workspace-proxy", 7);
            await request(uaSocket, "terminalStream", { method: "data", data: "disown\r" }, "workspace-proxy", 7);
  
            const pidTerminal = await request(uaSocket, "createTmuxSession", { workspaceId: workspaceId }, "workspace-proxy", 3);
            const pidTerminalName = pidTerminal.data.name;
  
            await request(uaSocket, "terminalStream", { method: "init", teamId: 35678, workspaceId: workspaceId, tmuxSessionName: pidTerminalName }, "workspace-proxy", 8);
            await request(uaSocket, "terminalStream", { method: "data", data: "ps aux\r" }, "workspace-proxy", 8);
  
            getPidFromServer(uaSocket).then(async (pid: string) => {
              let activeTunnel: any = cache.get(`codesphere.activeTunnel`);
              activeTunnel[workspaceId] = {};
              activeTunnel[workspaceId]['pid'] = `${pid}`;
              cache.update(`codesphere.activeTunnel`, activeTunnel);
  
              await request(uaSocket, "killTmuxSession", { workspaceId: workspaceId, sessionName: pidTerminalName}, "workspace-proxy", 11);
              await request(uaSocket, "killTmuxSession", { workspaceId: workspaceId, sessionName: tmuxSessionNameBgProcess}, "workspace-proxy", 12);

              this._view?.webview.postMessage({ 
                type: "loadingFinished", 
                value: {   
                    'workspaceId': `${workspaceId}`
                }
              });
  
              this._view?.webview.postMessage({ 
                type: "is connected", 
                value: {  
                    'activeTunnels': `${cache.get(`codesphere.activeTunnel`)}`
                }
              });
              activeTunnel = cache.get(`codesphere.activeTunnel`);
              this._view?.webview.postMessage({ type: "activeWorkspaces", value: activeTunnel });
            });
          }
          
          await request(uaSocket, "terminalStream", { method: "data", data: "[B\r" }, "workspace-proxy", 4);

          const code = await codePromise;

          this._view?.webview.postMessage({ 
            type: "gitHubAuth", 
            value: {  
                'code': code, 
                'state': workspaceId
            }
        });

        let sanitizedName = sanitizeWorkspaceName(workspaceName);

        giveWorkspaceName(uaSocket).then (async () => {
          this._view?.webview.postMessage({ 
            type: "loading", 
            value: {   
              'state': `Setting up server. This might take up to 2 minutes...`,
              'workspaceId': `${workspaceId}`
            }
        });
          await request(uaSocket, "terminalStream", { method: "data", data: sanitizedName + "[B\r"}, "workspace-proxy", 4);
        });

        serverIsUp(uaSocket, cache, sanitizedName, workspaceId).then(async () => {
        });

        afterTunnelInit(uaSocket, sanitizedName).then (async () => {
          await request(uaSocket, "terminalStream", { method: "data", data: ""}, "workspace-proxy", 4);
          await request(uaSocket, "terminalStream", { method: "data", data: "./code tunnel --install-extension " + vsixFile + "\r"}, "workspace-proxy", 4);
        });
        
        tunnelIsReady(uaSocket).then (async () => {
          let activeTunnel = JSON.stringify(cache.get(`codesphere.activeTunnel`));
          let activeTunnnel = JSON.parse(activeTunnel);
          activeTunnnel[workspaceId] = {};
          cache.update(`codesphere.activeTunnel`, activeTunnnel);
          this._view?.webview.postMessage({ 
            type: "loadingFinished", 
            value: {   
                'workspaceId': `${workspaceId}`
            }
          });

          this._view?.webview.postMessage({ 
            type: "is connected", 
            value: {  
                'activeTunnels': `${cache.get(`codesphere.activeTunnel`)}`
            }
          });

          let activeTunnel2 = cache.get(`codesphere.activeTunnel`);
          this._view?.webview.postMessage({ type: "activeWorkspaces", value: activeTunnel2 });
          
          vscode.window.showInformationMessage('Server is up');

          request(uaSocket, "killTmuxSession", { workspaceId: workspaceId, sessionName: tmuxSessionName}, "workspace-proxy", 5);

          const terminalSessionsBgProcess = await request(uaSocket, "createTmuxSession", { workspaceId: workspaceId }, "workspace-proxy", 3);
          const tmuxSessionNameBgProcess = terminalSessionsBgProcess.data.name;
          
          await request(uaSocket, "terminalStream", { method: "init", teamId: 35678, workspaceId: workspaceId, tmuxSessionName: tmuxSessionNameBgProcess }, "workspace-proxy", 7);
          await request(uaSocket, "terminalStream", { method: "data", data: "nohup ./code tunnel\r" }, "workspace-proxy", 7);
          await request(uaSocket, "terminalStream", { method: "data", data: "^Z\r" }, "workspace-proxy", 7);
          await request(uaSocket, "terminalStream", { method: "data", data: "bg\r" }, "workspace-proxy", 7);
          await request(uaSocket, "terminalStream", { method: "data", data: "disown\r" }, "workspace-proxy", 7);

          const pidTerminal = await request(uaSocket, "createTmuxSession", { workspaceId: workspaceId }, "workspace-proxy", 3);
          const pidTerminalName = pidTerminal.data.name;

          await request(uaSocket, "terminalStream", { method: "init", teamId: 35678, workspaceId: workspaceId, tmuxSessionName: pidTerminalName }, "workspace-proxy", 8);
          await request(uaSocket, "terminalStream", { method: "data", data: "ps aux\r" }, "workspace-proxy", 8);

          getPidFromServer(uaSocket).then(async (pid: string) => {
            cache.update(`codesphere.pid${workspaceId}`, pid);

            let activeTunnel = JSON.stringify(cache.get(`codesphere.activeTunnel`));
            let activeTunnnel = JSON.parse(activeTunnel);
            activeTunnnel[workspaceId]['pid'] = `${pid}`;
            cache.update(`codesphere.activeTunnel`, activeTunnnel);

            await request(uaSocket, "killTmuxSession", { workspaceId: workspaceId, sessionName: pidTerminalName}, "workspace-proxy", 11);
            await request(uaSocket, "killTmuxSession", { workspaceId: workspaceId, sessionName: tmuxSessionNameBgProcess}, "workspace-proxy", 12);
          });

        });

          break;
        }
        case "getActiveWorkspaces": {
          if (!data.value) {
            return;
          }
          let activeTunnels = cache.get("codesphere.activeTunnel");
          this._view?.webview.postMessage({ type: "activeWorkspaces", value: activeTunnels });
          break;
        }

        case "on Error": {
          if (!data.value) {
            return;
          }
          vscode.window.showErrorMessage(data.value);
          break;
        }
    
        case "getConnectedWorkspace": {
          if (!data.value) {
            return;
          }
          let currentWorkspace: any = cache.get('codesphere.currentWorkspace');
          this._view?.webview.postMessage({ type: "connectedWorkspace", value: currentWorkspace });
          break;
        }

        case "copycode": {
          if (!data.value) {
            return;
          }
          vscode.commands.executeCommand('codesphere.copycode');
          break;
        }

        case "openTunnel": {
          if (!data.value) {
            return;
          }
          const workspaceId = data.value.workspaceId;
          const workspaceName = data.value.workspaceName;
          const socketURL = `wss://${data.value.datacenterId}.codesphere.com/workspace-proxy`;
          const accessToken = await this.extensionContext.secrets.get("codesphere.accessToken") as string;
          socket = await setupWs(new wsLib.WebSocket(socketURL), "workspace-proxy", accessToken, cache, workspaceId);

          let uaSocketconnect = getUaSocket();

          await request(uaSocketconnect, "terminalSessionsStream", { workspaceId: workspaceId }, "terminalSessionsStream", 10);

          // Warte auf die Antwort des vorherigen Requests und extrahiere den tmuxSessionName
          const terminalSessionsResponse = await request(uaSocketconnect, "createTmuxSession", { workspaceId: workspaceId }, "workspace-proxy", 14);
          const tmuxSessionName = terminalSessionsResponse.data.name;

          await request(uaSocketconnect, "terminalStream", { method: "init", teamId: 35678, workspaceId: workspaceId, tmuxSessionName: tmuxSessionName }, "workspace-proxy", 15);
          const bashFilePath  = vscode.Uri.joinPath(this._extensionUri, "src", "sh", "installVSCodeServer.sh");
          const bashScript = await readBashFile(bashFilePath.fsPath);
          await request(uaSocketconnect, "terminalStream", { method: "data", data: bashScript }, "workspace-proxy", 15);

          let tunnelExists = await doesTunnelAlreadyExist(uaSocketconnect);
          
          if (tunnelExists === 'not found') {
            let activeTunnel: any = cache.get(`codesphere.activeTunnel`);
            delete activeTunnel[workspaceId];
            cache.update(`codesphere.activeTunnel`, activeTunnel);
            this._view?.webview.postMessage({
              type: "removeWorkspace",
              value: {
                'workspaceId': `${workspaceId}`
              }
            });
            request(uaSocketconnect, "killTmuxSession", { workspaceId: workspaceId, sessionName: tmuxSessionName}, "workspace-proxy", 5);
            break;
            
          } 

          if (tunnelExists === 'found' || tunnelExists === 'found-nopid') {            
            request(uaSocketconnect, "killTmuxSession", { workspaceId: workspaceId, sessionName: tmuxSessionName}, "workspace-proxy", 14);

            const terminalSessionsBgProcess2 = await request(uaSocketconnect, "createTmuxSession", { workspaceId: workspaceId }, "workspace-proxy", 3);
            const tmuxSessionNameBgProcess2 = terminalSessionsBgProcess2.data.name;
            
            await request(uaSocketconnect, "terminalStream", { method: "init", teamId: 35678, workspaceId: workspaceId, tmuxSessionName: tmuxSessionNameBgProcess2 }, "workspace-proxy", 7);
            
            // wait 500 ms
            await new Promise(resolve => setTimeout(resolve, 500));

            request(uaSocketconnect, "terminalStream", { method: "data", data: "nohup ./code tunnel" }, "workspace-proxy", 7);

            // wait 500 ms
            await new Promise(resolve => setTimeout(resolve, 500));

            request(uaSocketconnect, "terminalStream", { method: "data", data: "\r" }, "workspace-proxy", 7);
            request(uaSocketconnect, "terminalStream", { method: "data", data: "\r" }, "workspace-proxy", 7);
            request(uaSocketconnect, "terminalStream", { method: "data", data: "bg\r" }, "workspace-proxy", 7);
            request(uaSocketconnect, "terminalStream", { method: "data", data: "disown\r" }, "workspace-proxy", 7);

            await new Promise(resolve => setTimeout(resolve, 500));

            await request(uaSocketconnect, "killTmuxSession", { workspaceId: workspaceId, sessionName: tmuxSessionNameBgProcess2}, "workspace-proxy", 17);
          }
          vscode.commands.executeCommand('remote-tunnels.connectCurrentWindowToTunnel');
          break;
          }
        
        // Verwendung der Funktion signIn
        case "startCiStage": {
          if (!data.value) {
            return;
          }

          const workspaceId = data.value.workspaceId;
          const stage = data.value.stage;

          const socketURL = `wss://${data.value.dcId}.codesphere.com/workspace-proxy`;
          const accessToken = await this.extensionContext.secrets.get("codesphere.accessToken") as string;
          socket = await setupWs(new wsLib.WebSocket(socketURL), "workspace-proxy", accessToken, cache, workspaceId);

          let uaSocket = getUaSocket();

          await request(uaSocket, "executionInfo", { workspaceId: workspaceId, stage: stage }, "workspace-proxy", 31);

          await request(uaSocket, "startPipeline", { workspaceId: workspaceId, stage: stage }, "workspace-proxy", 32);

          waitForCiPipeline(uaSocket).then(async (result: any) => {
            this._view?.webview.postMessage({ 
              type: "ciPipelineFinished", 
              value: {   
                  workspaceId: workspaceId,
                  stage: stage,
                  result: result
              }
            });
          });

          break;

        }
        case "signin": {
          if (!data.value) {
            return;
          }
        
          signIn(data.value.email, data.value.password, async (error, sessionId) => {
            if (error) {
              console.log('error2', error);
              this._view?.webview.postMessage({ type: "onError", value: error });
              this._view?.webview.postMessage({ type: "onError", value: `${error.message}` });
              vscode.window.showErrorMessage('An error occurred while signing in: ' + error.message);
              console.log('error34', error.message);
              return;
            }
        
            vscode.window.showInformationMessage(`Successfully signed in`);
            
            this.extensionContext.secrets.store("codesphere.sessionId", sessionId as string);
            
            const storedSessionId: string | undefined = await this.extensionContext.secrets.get("codesphere.sessionId");
            genAccessToken(storedSessionId as string, async (error: Error | null, accessToken?: string) => {
              if (error) {
                  vscode.window.showErrorMessage('An error occurred while generating access token: ' + error.message);
                return;
                }

              if (!accessToken) {
                  vscode.window.showErrorMessage('Access token is undefined.');
                  return;
               }

              this.extensionContext.secrets.store("codesphere.accessToken", accessToken);
             cache.update("codesphere.accessTokenCache", accessToken);

              vscode.window.showInformationMessage('Successfully generated access token');
              
             webviewView.webview.html = this._getHtmlForWebviewAfterSignIn(webviewView.webview);
              vscode.commands.executeCommand('setContext', 'codesphere.isLoggedIn', true);
              cache.update("codesphere.isLoggedIn", true);
            });
          });

          const accessToken = await cache.get("codesphere.accessTokenCache");
          try {
            const teams = await listTeams(accessToken as string);
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
          } catch (error) {
            console.log('error', error);
          }
      
          try {
              const userData = await getUserData(accessToken as string);
              cache.update("codesphere.userData", userData);
              let user = cache.get("codesphere.userData");
              this._view?.webview.postMessage({ type: "getUserData", value: `${JSON.stringify(user)}` });
          } catch (error) {
              console.log(error);
          }

          const userGitData: any = cache.get("codesphere.userData");
              const gitEmail: string = userGitData.email || "";
              let gitFirstName: string = userGitData.firstName || "";
              let gitLastName: string = userGitData.lastName || "";

              if (!gitFirstName && !gitLastName && gitEmail) {
                const emailParts = gitEmail.split("@");
                if (emailParts.length > 0) {
                  gitFirstName = emailParts[0];
                }
              }

              const gitBashEmail = `git config --global user.email "${gitEmail}"`;
              const gitBashName = `git config --global user.name "${gitFirstName} ${gitLastName}"`;

              exec (gitBashEmail, (error, stdout, stderr) => {
                if (error) {
                  console.error(`exec error: ${error}`);
                  return;
                }

                if (stderr) {
                  console.error(`stderr: ${stderr}`);
                  return;
                }

                console.log(`stdout: ${stdout}`);
              });

              exec (gitBashName, (error, stdout, stderr) => {
                if (error) {
                  console.error(`exec error: ${error}`);
                  return;
                }

                if (stderr) {
                  console.error(`stderr: ${stderr}`);
                  return;
                }

                console.log(`stdout: ${stdout}`);
              });

          break;
        }
        
        case "listTeams": {
          if (!data.value) {
            return;
          }
          let teamArray = cache.get("codesphere.teams");
          this._view?.webview.postMessage({ type: "listTeams", value: `${JSON.stringify(teamArray)}` });
          break;
        }
        case "logout": {
          if (!data.value) {
            return;
          }
          this.extensionContext.secrets.delete("codesphere.sessionId");
          this.extensionContext.secrets.delete("codesphere.accessToken");

          vscode.window.showInformationMessage("Successfully logged out");
          cache.update("codesphere.isLoggedIn", false);
          webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
          break;
        }
        case "getWorkspaces": {
          if (!data.value) {
            return;
          }
          let workspaces = cache.get("codesphere.workspaces");
          this._view?.webview.postMessage({ type: "getWorkspaces", value: `${JSON.stringify(workspaces)}` });
          break;
        }

        case "activateWorkspace": {
          // wakes up sleeping on-demand workspaces when open workspace accordion in the UI
          const workspaceId = data.value.workspaceId;
          const socketURL = `wss://${data.value.datacenterId}.codesphere.com/deployment-service`;
          const accessToken = await this.extensionContext.secrets.get("codesphere.accessToken") as string;
          socket = await setupWs(new wsLib.WebSocket(socketURL), "deployment-service", accessToken, cache, workspaceId);
          uaSocket2 = getUaSocket();

          const codePromise = wakeUpWorkspace(uaSocket2);
          
          await request(uaSocket2, "info", { workspaceId: workspaceId }, "deployment-service", 2);
          await request(uaSocket2, "startWorkspace", { workspaceId: workspaceId }, "deployment-service", 3);

          await codePromise.then(async () => {
            console.log('workspace is up');
            this._view?.webview.postMessage({ 
              type: "resourcesDeployed", 
              value: {   
                  'workspaceId': workspaceId
              }
            });
          });
          break;
        }
        case "getUserData": {
          if (!data.value) {
            return;
          }
        let user = cache.get("codesphere.userData");
        this._view?.webview.postMessage({ type: "getUserData", value: `${JSON.stringify(user)}` });
          break;  
        }

        case "openOverview": {
          if (!data.value) {
            return;
          }
          webviewView.webview.html = this._getHtmlWebviewOverview(webviewView.webview);
          const workspacesInTeam: any = cache.get("codesphere.workspaces");
          const teamId = data.value.teamId; 
        
          // Find the workspace object where workspaceId matches data.value.workspaceId
          let selectedWorkspace = workspacesInTeam[teamId].find(
            (workspace: any) => workspace.id === data.value.workspaceId
          );
          
          cache.update("codesphere.currentconnectedWorkspace", selectedWorkspace);

          if (cache.get("codesphere.currentWorkspace") === selectedWorkspace) {
            vscode.commands.executeCommand('setContext', 'codesphere.currentWorkspace', selectedWorkspace);
          }
          vscode.commands.executeCommand('codesphere.openOverView', `${selectedWorkspace}`);
          
          // Check if the workspace exists before using it
          if (selectedWorkspace) {            
            this._view?.webview.postMessage({
              type: "overviewData",
              value: {
                workspace: selectedWorkspace,
              },
            });
          } else {
            console.error("Workspace not found with ID:", data.value.workspaceId);
          }
          break;
        }

        case "getWorkspaceData": {
          const workspace: any = cache.get("codesphere.currentconnectedWorkspace");          
        
          if (workspace) {            
            this._view?.webview.postMessage({
              type: "overviewData",
              value: {
                workspace: workspace,
              },
            });
          } else {
            console.error("Workspace not found with ID:", data.value.workspaceId);
          }
          break;
        }
        
        case "openSidebar": {
          if (!data.value) {
            return;
          }
          webviewView.webview.html = this._getHtmlForWebviewAfterSignIn(webviewView.webview);
          vscode.commands.executeCommand('setContext', 'codesphere.currentWorkspace', "");
          vscode.commands.executeCommand('codesphere.backToMenu');
          break;
        }

        case "getCiStageStatus": {
          if (!data.value) {
            return;
          }
          console.log('tests2');
          const delay = (ms: any) => new Promise(resolve => setTimeout(resolve, ms));
          const workspaceId = data.value.workspaceId;
          const socketURL = `wss://${data.value.datacenterId}.codesphere.com/workspace-proxy`;
          const accessToken = cache.get("codesphere.accessTokenCache");
          console.log('tests3')
          socket = await setupWs(new wsLib.WebSocket(socketURL), "workspace-proxy", accessToken, cache, workspaceId);
          console.log('tests4')
          let uaSocketconnect2 = getUaSocket();

          let prepare;
          let test;
          let run;

          console.log('tests', workspaceId);

          const prepareCheck = checkCiPipelineState(uaSocketconnect2, 35);
          const testCheck = checkCiPipelineState(uaSocketconnect2, 136);
          const runCheck = checkCiPipelineState(uaSocketconnect2, 237);

          testCheck.then((resultTest: any) => {
            test = resultTest;
            console.log('tests122', test);
          }
          );

          runCheck.then((resultRun: any) => {
            run = resultRun;
            console.log('tests122', run);
          });

          prepareCheck.then((result: any) => {
            prepare = result;
            console.log('tests122', prepare);
          });
          
          await delay(100);
          console.log('tests5')
          await request(uaSocketconnect2, "executionInfo", { workspaceId: workspaceId, stage: 'test' }, "workspace-proxy", 136);
          
          
          await delay(200);
          console.log('tests6')
          await request(uaSocketconnect2, "executionInfo", { workspaceId: workspaceId, stage: 'run' }, "workspace-proxy", 237);
          
          await delay(100);

          await request(uaSocketconnect2, "executionInfo", { workspaceId: workspaceId, stage: 'prepare' }, "workspace-proxy", 35);
          
          await delay(100);
          console.log('tests7')
          
          this._view?.webview.postMessage({
            type: "ciPipelineStatus",
            value: {
              prepare: prepare,
              test: test,
              run: run
            },
          });
          
        }
      }
    }
    );
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
    }; script-src 'unsafe-inline' ${
      webview.cspSource
    };">
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

  private _getHtmlWebviewOverview(webview: vscode.Webview) {
    const styleResetUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
    );
    const scriptUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled/overview.js")
    );
    const styleMainUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, "out", "compiled/overview.css")
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
    }; script-src 'unsafe-inline' ${
      webview.cspSource
    };">
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



