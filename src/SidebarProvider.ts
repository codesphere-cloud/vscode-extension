import * as vscode from "vscode";
import { getNonce } from "./ts/getNonce";
import { signIn, genAccessToken } from "./ts/authentication";
import { listTeams, listWorkspaces, getUserData } from "./ts/userDataRequests";
import { reloadCache } from "./ts/reloadCache";
const { setupWs, 
        request, 
        waitForWorkspaceRunning, 
        getUaSocket, 
        getDsSocket,
        giveWorkspaceName,
        afterTunnelInit,
        tunnelIsReady,
        wakeUpWorkspace,
        doesTunnelAlreadyExist,
        getPidFromServer,
        waitForCiPipeline,
        checkCiPipelineState,
        getRemoteURL,
        getGitHubToken,
        isVSIX,
        serverIsUp } = require('./ts/wsService');
import { readBashFile } from "./ts/readBash";
import * as wsLib from 'ws';
import { sanitizeWorkspaceName } from "./ts/sanatizeWorkspaceNames";
import axios from 'axios';
import { exec } from 'child_process';

const extension_package = require('../package.json');
const version = extension_package.version;
// Thats the name of the vsix file for developement
const vsixFile = 'codesphere-'+version+'.vsix';



export class SidebarProvider implements vscode.WebviewViewProvider {
  _view?: vscode.WebviewView;
  _doc?: vscode.TextDocument;

  constructor(private readonly _extensionUri: vscode.Uri, public extensionContext: vscode.ExtensionContext) {}

  public resolveWebviewView(webviewView: vscode.WebviewView) {
    this._view = webviewView;
    let cache = this.extensionContext.globalState;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    if (!cache.get("codesphere.isLoggedIn") || cache.get("codesphere.isLoggedIn") === false) {
      vscode.commands.executeCommand('setContext', 'codesphere.isLoggedIn', false);
      cache.update("codesphere.isLoggedIn", false);
      webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
      console.log('Congratulations, your extension "codesphere" is now active! Please Log in.');
    
      }
  
    if (cache.get("codesphere.isLoggedIn") === true && cache.get('codesphere.currentWorkspace') === '') {
      vscode.commands.executeCommand('setContext', 'codesphere.isLoggedIn', true);
      cache.update("codesphere.isLoggedIn", true);
      webviewView.webview.html = this._getHtmlForWebviewAfterSignIn(webviewView.webview);
      console.log('Congratulations, your extension "codesphere" is now active! You are logged in.');
    }

    if (cache.get("codesphere.isLoggedIn") === true && cache.get('codesphere.currentWorkspace') !== '') {
      vscode.commands.executeCommand('setContext', 'codesphere.isLoggedIn', true);
      cache.update("codesphere.isLoggedIn", true);
      webviewView.webview.html = this._getHtmlWebviewOverview(webviewView.webview);
      // todo: instead of passing just the workspace id we need to pass the whole workspace object

      let currentWorkspace = parseInt(cache.get('codesphere.currentWorkspace') as string);
      const workspacesInTeam: any = cache.get("codesphere.workspaces");
      let matchingObject = null;

      for (const teamId in workspacesInTeam) {
        const workspaces = workspacesInTeam[teamId]; 
        for (const workspace of workspaces) {
          if (parseInt(workspace.id) === currentWorkspace) {
            matchingObject = workspace;
            break; 
          }
        }
        if (matchingObject) {
          break; 
        }
      }

      console.log('matchingObject', matchingObject);
      cache.update("codesphere.workspaceOverview", matchingObject);

      if (matchingObject) {
        this._view?.webview.postMessage({
          type: "overviewData",
          value: {
            workspace: matchingObject,
          },
        });
      } 

      // cache.update('codesphere.workspaceOverview', cache.get('codesphere.currentWorkspace'));
      vscode.commands.executeCommand('setContext', 'codesphere.workspaceOverview', cache.get('codesphere.currentWorkspace'));
      console.log('Congratulations, your extension "codesphere" is now active! You are logged in.');
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

    if (!cache.get("codesphere.workspaceOverview")) {
      cache.update("codesphere.workspaceOverview", '');
    }

    if (!cache.get("codesphere.instanceURL")) {
      cache.update("codesphere.instanceURL", 'https://codesphere.com');
    }

    cache.setKeysForSync(["codesphere.isLoggedIn", 
                          "codesphere.accessTokenCache", 
                          "codesphere.teams", 
                          "codesphere.workspaces", 
                          "codesphere.userData", 
                          "codesphere.lastCode", 
                          "codesphere.activeTunnel",
                          "codesphere.currentWorkspace",
                          "codesphere.workspaceOverview",
                          "codesphere.instanceURL"]);

    let instanceURL: string = cache.get("codesphere.instanceURL") as string;
    instanceURL = instanceURL.replace(/^https?:\/\//, '');
    instanceURL = instanceURL.replace(/\/$/, '');

    webviewView.webview.onDidReceiveMessage(async (data) => {
      let socket: any;
      let uaSocket = getUaSocket();
      let uaSocket2 = getUaSocket();
      let testSocket: any;

      switch (data.type) {
        case "testConnection": {
          try {
              const accessToken = await cache.get("codesphere.accessTokenCache") as string;
              instanceURL = cache.get("codesphere.instanceURL") as string;
              instanceURL = instanceURL.replace(/^https?:\/\//, '');
              instanceURL = instanceURL.replace(/\/$/, '');
              
              const url = `https://${instanceURL}/team-service/listTeams`;
              
              const response = await axios.post(url, {}, {
                  headers: {
                      Authorization: `Bearer ${accessToken}`
                  },
                  timeout: 5000
              });

              if (response.data.code === "Ok") {
                  console.log("Token is valid");
              } else {
                  console.log(`Fehler bei testConnection: ${response.data}`);
                  webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
                  console.log('Token is invalid1');
                  throw new Error(`Fehler beim Abrufen der Teams: ${response.data}`);
              }
          } catch (error) {
            webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
            console.log('Token is invalid2');

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
          const socketURL = `wss://${data.value.datacenterId}.${instanceURL}/workspace-proxy`;
          const accessToken = await this.extensionContext.secrets.get("codesphere.accessToken") as string;
          const teamId = data.value.teamId;
          socket = await setupWs(new wsLib.WebSocket(socketURL), "workspace-proxy", accessToken, cache, workspaceId);

          uaSocket = getUaSocket();

          await request(uaSocket, "terminalSessionsStream", { workspaceId: workspaceId }, "terminalSessionsStream", 2);

          const terminalSessionsResponse = await request(uaSocket, "createTmuxSession", { workspaceId: workspaceId }, "workspace-proxy", 3);
          const tmuxSessionName = terminalSessionsResponse.data.name;

          await request(uaSocket, "terminalStream", { method: "init", teamId: teamId, workspaceId: workspaceId, tmuxSessionName: tmuxSessionName }, "workspace-proxy", 4);

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
            
            await request(uaSocket, "terminalStream", { method: "init", teamId: teamId, workspaceId: workspaceId, tmuxSessionName: tmuxSessionNameBgProcess }, "workspace-proxy", 7);
            await request(uaSocket, "terminalStream", { method: "data", data: "nohup ./.codesphere-internal/code tunnel > .codesphere-internal/nohup.out 2>&1 &\r" }, "workspace-proxy", 7);
            await request(uaSocket, "terminalStream", { method: "data", data: "^Z\r" }, "workspace-proxy", 7);
            await request(uaSocket, "terminalStream", { method: "data", data: "bg\r" }, "workspace-proxy", 7);
            await request(uaSocket, "terminalStream", { method: "data", data: "disown\r" }, "workspace-proxy", 7);

            await request(uaSocket, "killTmuxSession", { workspaceId: workspaceId, sessionName: tmuxSessionNameBgProcess}, "workspace-proxy", 12);
  
            // const pidTerminal = await request(uaSocket, "createTmuxSession", { workspaceId: workspaceId }, "workspace-proxy", 3);
            // const pidTerminalName = pidTerminal.data.name;
  
            // await request(uaSocket, "terminalStream", { method: "init", teamId: teamId, workspaceId: workspaceId, tmuxSessionName: pidTerminalName }, "workspace-proxy", 8);
            // await request(uaSocket, "terminalStream", { method: "data", data: "ps aux\r" }, "workspace-proxy", 8);
            
            let activeTunnel: any = cache.get(`codesphere.activeTunnel`);
            activeTunnel[workspaceId] = {};
            cache.update(`codesphere.activeTunnel`, activeTunnel);

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

            // getPidFromServer(uaSocket).then(async (pid: string) => {
            //   let activeTunnel: any = cache.get(`codesphere.activeTunnel`);
            //   activeTunnel[workspaceId] = {};
            //   activeTunnel[workspaceId]['pid'] = `${pid}`;
            //   cache.update(`codesphere.activeTunnel`, activeTunnel);
  
            //   await request(uaSocket, "killTmuxSession", { workspaceId: workspaceId, sessionName: pidTerminalName}, "workspace-proxy", 11);
            //   await request(uaSocket, "killTmuxSession", { workspaceId: workspaceId, sessionName: tmuxSessionNameBgProcess}, "workspace-proxy", 12);

            //   this._view?.webview.postMessage({ 
            //     type: "loadingFinished", 
            //     value: {   
            //         'workspaceId': `${workspaceId}`
            //     }
            //   });
  
            //   this._view?.webview.postMessage({ 
            //     type: "is connected", 
            //     value: {  
            //         'activeTunnels': `${cache.get(`codesphere.activeTunnel`)}`
            //     }
            //   });
            //   activeTunnel = cache.get(`codesphere.activeTunnel`);
            //   this._view?.webview.postMessage({ type: "activeWorkspaces", value: activeTunnel });
            // });
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

        const delay = (ms: any) => new Promise(resolve => setTimeout(resolve, ms));
        afterTunnelInit(uaSocket, sanitizedName).then (async () => {
          const isVSIXWorkspace = isVSIX(uaSocket);
          let workspaceDev;
          
          isVSIXWorkspace.then((vsixState: boolean) => {
            workspaceDev = vsixState;
            delay(100);
            if (!workspaceDev) {
                request(uaSocket, "terminalStream", { method: "data", data: "./.codesphere-internal/code tunnel --install-extension Codesphere.codesphere" +"\r"}, "workspace-proxy", 4);
            } else {
                request(uaSocket, "terminalStream", { method: "data", data: `./.codesphere-internal/code tunnel --install-extension ./.codesphere-internal/${vsixFile} \r`}, "workspace-proxy", 4);
            }
          });
          delay(300);
            request(uaSocket, "terminalStream", { method: "data", data: ""}, "workspace-proxy", 4);
            request(uaSocket, "terminalStream", { method: "data", data: "echo $USE_VSIX \r"}, "workspace-proxy", 4);
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

          request(uaSocket, "killTmuxSession", { workspaceId: workspaceId, sessionName: tmuxSessionName}, "workspace-proxy", 5);

          const terminalSessionsBgProcess = await request(uaSocket, "createTmuxSession", { workspaceId: workspaceId }, "workspace-proxy", 3);
          const tmuxSessionNameBgProcess = terminalSessionsBgProcess.data.name;
          
          await request(uaSocket, "terminalStream", { method: "init", teamId: teamId, workspaceId: workspaceId, tmuxSessionName: tmuxSessionNameBgProcess }, "workspace-proxy", 7);
          await request(uaSocket, "terminalStream", { method: "data", data: "nohup ./.codesphere-internal/code tunnel > .codesphere-internal/nohup.out 2>&1 &\r" }, "workspace-proxy", 7);
          await request(uaSocket, "terminalStream", { method: "data", data: "^Z\r" }, "workspace-proxy", 7);
          await request(uaSocket, "terminalStream", { method: "data", data: "bg\r" }, "workspace-proxy", 7);
          await request(uaSocket, "terminalStream", { method: "data", data: "disown\r" }, "workspace-proxy", 7);

          await request(uaSocket, "killTmuxSession", { workspaceId: workspaceId, sessionName: tmuxSessionNameBgProcess}, "workspace-proxy", 12);

          // const pidTerminal = await request(uaSocket, "createTmuxSession", { workspaceId: workspaceId }, "workspace-proxy", 3);
          
          // const pidTerminalName = pidTerminal.data.name;

          // await request(uaSocket, "terminalStream", { method: "init", teamId: teamId, workspaceId: workspaceId, tmuxSessionName: pidTerminalName }, "workspace-proxy", 8);
          // await request(uaSocket, "terminalStream", { method: "data", data: "ps aux\r" }, "workspace-proxy", 8);

          // await request(uaSocket, "killTmuxSession", { workspaceId: workspaceId, sessionName: pidTerminalName}, "workspace-proxy", 11);
          

          // getPidFromServer(uaSocket).then(async (pid: string) => {
          //   cache.update(`codesphere.pid${workspaceId}`, pid);

          //   let activeTunnel = JSON.stringify(cache.get(`codesphere.activeTunnel`));
          //   let activeTunnnel = JSON.parse(activeTunnel);
          //   activeTunnnel[workspaceId]['pid'] = `${pid}`;
          //   cache.update(`codesphere.activeTunnel`, activeTunnnel);
          // });

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
          const socketURL = `wss://${data.value.datacenterId}.${instanceURL}/workspace-proxy`;
          const accessToken = await this.extensionContext.secrets.get("codesphere.accessToken") as string;
          const teamId = data.value.teamId;
          socket = await setupWs(new wsLib.WebSocket(socketURL), "workspace-proxy", accessToken, cache, workspaceId);

          let uaSocketconnect = getUaSocket();

          await request(uaSocketconnect, "terminalSessionsStream", { workspaceId: workspaceId }, "terminalSessionsStream", 10);

          // Warte auf die Antwort des vorherigen Requests und extrahiere den tmuxSessionName
          const terminalSessionsResponse = await request(uaSocketconnect, "createTmuxSession", { workspaceId: workspaceId }, "workspace-proxy", 14);
          const tmuxSessionName = terminalSessionsResponse.data.name;

          await request(uaSocketconnect, "terminalStream", { method: "init", teamId: teamId, workspaceId: workspaceId, tmuxSessionName: tmuxSessionName }, "workspace-proxy", 15);
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
            
            await request(uaSocketconnect, "terminalStream", { method: "init", teamId: teamId, workspaceId: workspaceId, tmuxSessionName: tmuxSessionNameBgProcess2 }, "workspace-proxy", 7);
            
            // wait 500 ms
            await new Promise(resolve => setTimeout(resolve, 500));

            request(uaSocketconnect, "terminalStream", { method: "data", data: "nohup ./.codesphere-internal/code tunnel > .codesphere-internal/nohup.out 2>&1 &" }, "workspace-proxy", 7);

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
        
        case "startCiStage": {
          if (!data.value) {
            return;
          }

          const workspaceId = data.value.workspaceId;
          const stage = data.value.stage;

          const socketURL = `wss://${data.value.dcId}.${instanceURL}/workspace-proxy`;
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

        case "getInstanceURL": {
          if (!data.value) {
            return;
          }
          let instanceURL = cache.get("codesphere.instanceURL");
          this._view?.webview.postMessage({ type: "getInstanceURL", value: instanceURL });
          break;
        }

        case "updateInstanceURL": {
          if (!data.value) {
            return;
          }
          let url = data.value.url;
          await cache.update("codesphere.instanceURL", url);
          this._view?.webview.postMessage({ type: "updateInstanceURL"});

          break;
        }
        
        case "signin": {
          if (!data.value) {
              return;
          }
      
          try {
            const instanceURL = cache.get("codesphere.instanceURL");
              const sessionId = await signIn(data.value.email, data.value.password, instanceURL as string);
      
              await this.extensionContext.secrets.store("codesphere.sessionId", sessionId as string);
      
              const storedSessionId = await this.extensionContext.secrets.get("codesphere.sessionId");

              const accessToken = await new Promise<string>((resolve, reject) => {
                  genAccessToken(storedSessionId as string, instanceURL as string, (error: Error | null, accessToken?: string) => {
                      if (error) {
                          return reject(error);
                      }
                      if (!accessToken) {
                          return reject(new Error('Access token is undefined.'));
                      }
                      resolve(accessToken);
                  });
              });
      
              await this.extensionContext.secrets.store("codesphere.accessToken", accessToken);
              cache.update("codesphere.accessTokenCache", accessToken);
                    
              // TODO: replace this call to the onMount function in webview to ensure, that all data get fetched when open the webview
              // right now the data might be in an old state when opening the webview when already signed in
              await reloadCache(accessToken, instanceURL as string, (error, teams, workspaces, userData) => {
                if (error) {
                  vscode.window.showErrorMessage('An error occurred while reloading cache: ' + error.message);
                  return;
                }
                // TODO: add connected domain of workspace if exists
                // domain must be fetched from /deployment-service websocket method: listDomainsByTeams
                // and then added to the right workspace object
                cache.update("codesphere.workspaces", workspaces);
                cache.update("codesphere.userData", userData);
                cache.update("codesphere.teams", teams);
              });
      
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
      
              exec(gitBashEmail, (error, stdout, stderr) => {
                  if (error) {
                      console.error(`exec error: ${error}`);
                      return;
                  }
      
                  if (stderr) {
                      console.error(`stderr: ${stderr}`);
                      return;
                  }
      
              });
      
              exec(gitBashName, (error, stdout, stderr) => {
                  if (error) {
                      console.error(`exec error: ${error}`);
                      return;
                  }
      
                  if (stderr) {
                      console.error(`stderrr: ${stderr}`);
                      return;
                  }
      
              });
      
              webviewView.webview.html = this._getHtmlForWebviewAfterSignIn(webviewView.webview);
              vscode.commands.executeCommand('setContext', 'codesphere.isLoggedIn', true);
              cache.update("codesphere.isLoggedIn", true);
      
          } catch (error: any) {
              console.log('error found', error);
              this._view?.webview.postMessage({ type: "onError", value: error });
              this._view?.webview.postMessage({ type: "onError", value: `${error.message}` });
          }
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
        // case "logout": {
        //   if (!data.value) {
        //     return;
        //   }
        //   this.extensionContext.secrets.delete("codesphere.sessionId");
        //   this.extensionContext.secrets.delete("codesphere.accessToken");

        //   vscode.window.showInformationMessage("Successfully logged out");
        //   cache.update("codesphere.isLoggedIn", false);
        //   cache.update("codesphere.accessTokenCache", "");
        //   console.log(`Logged out ${cache.get("codesphere.accessTokenCache")}`);
        //   webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);
        //   break;
        // }
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
          const socketURL = `wss://${data.value.datacenterId}.${instanceURL}/deployment-service`;
          const accessToken = await this.extensionContext.secrets.get("codesphere.accessToken") as string;
          socket = await setupWs(new wsLib.WebSocket(socketURL), "deployment-service", accessToken, cache, workspaceId);
          uaSocket2 = getDsSocket();

          const codePromise = wakeUpWorkspace(uaSocket2);
          
          await request(uaSocket2, "info", { workspaceId: workspaceId }, "deployment-service", 2);
          await request(uaSocket2, "startWorkspace", { workspaceId: workspaceId }, "deployment-service", 3);

          await codePromise.then(async () => {
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
          vscode.commands.executeCommand('setContext', 'codesphere.workspaceOverview', data.value.workspaceId);
          const workspacesInTeam: any = cache.get("codesphere.workspaces");
          const teamId = data.value.teamId; 
        
          // Find the workspace object where workspaceId matches data.value.workspaceId
          let selectedWorkspace = workspacesInTeam[teamId].find(
            (workspace: any) => workspace.id === data.value.workspaceId
          );
          
          cache.update("codesphere.currentconnectedWorkspace", selectedWorkspace);
          cache.update("codesphere.workspaceOverview", selectedWorkspace);

          if (selectedWorkspace === cache.get("codesphere.currentWorkspace")) {
            vscode.commands.executeCommand('codesphere.openOverView', selectedWorkspace);
          }
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
          vscode.commands.executeCommand('setContext', 'codesphere.workspaceOverview', '');
          cache.update('codesphere.workspaceOverview', '');
          vscode.commands.executeCommand('codesphere.backToMenu');
          break;
        }

        case 'focusPanel': {
          vscode.commands.executeCommand('codesphere.openCiPipeline');
          break;
        }

        case "getCiStageStatus": {
          if (!data.value) {
            return;
          }
          const delay = (ms: any) => new Promise(resolve => setTimeout(resolve, ms));
          const workspaceId = data.value.workspaceId;
          const socketURL = `wss://${data.value.datacenterId}.${instanceURL}/workspace-proxy`;
          const accessToken = cache.get("codesphere.accessTokenCache");
          socket = await setupWs(new wsLib.WebSocket(socketURL), "workspace-proxy", accessToken, cache, workspaceId);
          let uaSocketconnect2 = getUaSocket();

          let prepare;
          let test;
          let run;

          const prepareCheck = checkCiPipelineState(uaSocketconnect2, 35);
          const testCheck = checkCiPipelineState(uaSocketconnect2, 136);
          const runCheck = checkCiPipelineState(uaSocketconnect2, 237);

          testCheck.then((resultTest: any) => {
            test = resultTest;
          }
          );

          runCheck.then((resultRun: any) => {
            run = resultRun;
          });

          prepareCheck.then((result: any) => {
            prepare = result;
          });
          
          await request(uaSocketconnect2, "executionInfo", { workspaceId: workspaceId, stage: 'test' }, "workspace-proxy", 136);
          
          await delay(100);
          await request(uaSocketconnect2, "executionInfo", { workspaceId: workspaceId, stage: 'run' }, "workspace-proxy", 237);
          
          await delay(100);

          await request(uaSocketconnect2, "executionInfo", { workspaceId: workspaceId, stage: 'prepare' }, "workspace-proxy", 35);
          
          await delay(100);
          
          this._view?.webview.postMessage({
            type: "ciPipelineStatus",
            value: {
              prepare: prepare,
              test: test,
              run: run
            },
          });
          break;
        }
        // this case is not used anymore
        // case "gitPull": {
        //   if (!data.value) {
        //     return;
        //   }
        //   vscode.commands.executeCommand('remote-explorer.signIntoTunnelGithub', 'hello-react');
        //   const accessToken = cache.get("codesphere.accessTokenCache");
        //   const workspaceId = data.value.workspaceId;
        //   const socketURLPull = `wss://${data.value.dataCenterId}.${instanceURL}/workspace-proxy`;
        //   const socketURLGitHubToken = `wss://${data.value.dataCenterId}.${instanceURL}/ide-service`;
        //   const delay = (ms: any) => new Promise(resolve => setTimeout(resolve, ms));

        //   // generate gitHub accessToken
        //   socket = await setupWs(new wsLib.WebSocket(socketURLGitHubToken), "ide-service", accessToken, cache, workspaceId);
        //   let uaSocketconnect4 = getUaSocket();
        //   let gitHubAccessToken;

        //   const gettingGitHubToken = getGitHubToken(uaSocketconnect4);
          
        //   // store the token in a variable
        //   gettingGitHubToken.then(async (gitHubToken: string) => {
        //     gitHubAccessToken = gitHubToken;
        //   });

        //   await request(uaSocketconnect4, "getAccessToken", "github", "ide-service", 77)
        //   await delay(100);
        //   // connect to workspace-proxy
        //   socket = await setupWs(new wsLib.WebSocket(socketURLPull), "workspace-proxy", accessToken, cache, workspaceId);
        //   let uaSocketconnect3 = getUaSocket();
        //   let email = (cache.get("codesphere.userData")as any).email;
        //   const gettingRemoteURL = getRemoteURL(uaSocketconnect3);

        //   gettingRemoteURL.then(async (remoteURL: string) => {
        //     await request(uaSocketconnect3, "exec", { workspaceId: workspaceId, command: ["pull"], committer:{name: "", email: email}, remote: {accessToken: gitHubAccessToken,  operation: {hostname: "github.com"}}}, "workspace-proxy", 79);
        //   });
        
        //   await request(uaSocketconnect3, "exec", { workspaceId: workspaceId, command: ["config", "--get", "remote.origin.url"] }, "workspace-proxy", 78);
        //   break;
        // }
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



