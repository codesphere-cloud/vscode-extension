import * as vscode from "vscode";
import { getNonce } from "./ts/getNonce";
import * as wsLib from 'ws';
const { setupWs, 
        request,  
        getUaSocket,
        getDsSocket,
        getWsSocket,
        checkCiPipelineStructure,
        checkCiPipelineState,
        checkMSDCiPipelineState,
        ciStepHandler,
        ciStepHandlerMSD,
        ciStageStatusHandler, 
        ciStageStatusHandlerMSD,
        landscapeShape,
    } = require('./ts/wsService');

export class CiPipelineProvider implements vscode.WebviewViewProvider {
    _view?: vscode.WebviewView;
    _doc?: vscode.TextDocument;

    
    
  constructor(private readonly _extensionUri: vscode.Uri, public extensionContext: vscode.ExtensionContext) {
    this.postMessageToWebview = this.postMessageToWebview.bind(this);
  }
    
  postMessageToWebview(type: string, values: any): any {
      this._view?.webview.postMessage({
          type: type,
          value: values
      });
  }
    

    public resolveWebviewView(webviewView: vscode.WebviewView) {
      this._view = webviewView;
      let cache = this.extensionContext.globalState;

      webviewView.webview.options = {
        enableScripts: true,
        localResourceRoots: [this._extensionUri],
      };

      webviewView.webview.html = this._getHtmlWebview(webviewView.webview);

      let socket: any;
      let uaSocket = getUaSocket();
      let instanceURL: string = cache.get("codesphere.instanceURL") as string;
      instanceURL = instanceURL.replace(/^https?:\/\//, '');
      instanceURL = instanceURL.replace(/\/$/, '');


      webviewView.webview.onDidReceiveMessage(async (data) => {
        switch (data.type) {
            case "getCiPipelineStages": {
                const socketURL = `wss://${data.value.dataCenterId}.${instanceURL}/workspace-proxy`;
                const accessToken = await this.extensionContext.secrets.get("codesphere.accessToken") as string;
                const workspaceID: number = parseInt(data.value.workspaceId); 
                socket = await setupWs(new wsLib.WebSocket(socketURL), "workspace-proxy", accessToken, cache, workspaceID);

                uaSocket = getUaSocket();
                let ciStructure: any;
                const ciPipelineCheck = checkCiPipelineStructure(uaSocket, 324);
                ciPipelineCheck.then((ci: any) => {
                    ciStructure = ci;
                    console.log("ciStructure: ", JSON.stringify(ciStructure));
                    if (ciStructure.schemaVersion !== "v0.2") {
                        console.log("ciPipeline schema version is not v0.2");
                        this._view?.webview.postMessage({ 
                          type: "CIPipelineStages", 
                          value: {   
                              'CIArray': `${JSON.stringify(ciStructure)}`
                          }
                      });
                    } else {
                        console.log("ciPipeline schema version is v0.2");
                        console.log(data.value.origin);
                        if (data.value.origin === "msd") {

                          this._view?.webview.postMessage({ 
                            type: "CIPipelineStages", 
                            value: {   
                                'CIArray': `${JSON.stringify(ciStructure)}`
                            }
                        });
                        } else {
                          webviewView.webview.html = this._getHtmlWebviewMSD(webviewView.webview);
                        }
                    }
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

            case "stopCiStage": {
              await request(uaSocket, "abortPipeline", { workspaceId: parseInt(data.value.workspaceId), stage: data.value.stage }, "workspace-proxy", 666);

              this._view?.webview.postMessage({
                type: "setActionButtion",
                value: {
                  stage: data.value.stage
                }
              });
              break;
            }

            case "getCiStageStatus": {
              if (!data.value) {
                return;
              }
              const delay = (ms: any) => new Promise(resolve => setTimeout(resolve, ms));
              const workspaceId = parseInt(data.value.workspaceId);
              const socketURL = `wss://${data.value.datacenterId}.${instanceURL}/workspace-proxy`;
              const accessToken = cache.get("codesphere.accessTokenCache");
              socket = await setupWs(new wsLib.WebSocket(socketURL), "workspace-proxy", accessToken, cache, workspaceId);
              let uaSocketconnect2 = getUaSocket();

              const runStageServices = data.value.runStageServices;


    
              let prepare;
              let test;
              let run;
              
              const prepareCheck = checkCiPipelineState(uaSocketconnect2, 35);
              const testCheck = checkCiPipelineState(uaSocketconnect2, 136);
              
              prepareCheck.then((result: any) => {
                prepare = result;
                
              });

              testCheck.then((resultTest: any) => {
                test = resultTest;
              }
              );              
              
              if (data.value.origin === "msd") {

                const socketURLWs = `wss://${data.value.datacenterId}.${instanceURL}/workspace-service`;
                socket = await setupWs(new wsLib.WebSocket(socketURLWs), "workspace-service", accessToken, cache, workspaceId);
                let wsSocket = getWsSocket();
                let landscapeStructure;

                const landscapeShapeData = landscapeShape(wsSocket, 56);

                landscapeShapeData.then(async (result: any) => {
                  console.log("landscapeShape: ", result);
                  landscapeStructure = result.map(({ workspaceId, ...rest }) => rest);
                  console.log("landscapeShape: ", result);

                  const waitForLandscapeUpdate = landscapeShape(wsSocket, 57);
                  // TODO: instead of just updating the Landscape this should check wether its synced or not
                  // if not synced a message needs to be sent to the webview, so the snyc button can be showed to the user (and break this code block)
                  // after the user clicks on the sync button the landscape should be updated with this case, but we need an additional key-value pair
                  // which indicates, that the user wants to update the landscape
                  await request(wsSocket, "updateLandscape", { servers: landscapeStructure, workspaceId: workspaceId }, "workspace-service", 57);

                  await waitForLandscapeUpdate.then(async (result: any) => {
                    console.log("waited for update: ", result);
                  });

                });

                await request(wsSocket, "landscapeStream", { workspaceId: workspaceId }, "landscapeStream", 56);

                delay(400);

                console.log("runStageServices: ", runStageServices);
                let uaSocketDeploymentService = getDsSocket();

                const MSDrunCheck = checkMSDCiPipelineState(uaSocketDeploymentService, 50, data.value.replicaCount, runStageServices);

                await request(uaSocketDeploymentService, "info", { workspaceId: workspaceId }, "info", 50);

                await MSDrunCheck.then(async (resultRun: any) => {
                  run = resultRun;
                  console.log("runstructure: ", run);
                });
              
                let endpoint = 237;
                let runCheck;
                Object.entries(run).forEach(async ([serviceName, service]: [string, any]) => {
                  console.log("service: ", serviceName);
                
                  const replicas = service.replicas;
                  for (const replicaKey of Object.keys(replicas)) {
                    console.log("Replica: ", replicaKey);

                    runCheck = checkCiPipelineState(uaSocketconnect2, endpoint);
                    runCheck.then((resultRun: any) => {
                      console.log("resultRun: ", resultRun, "\nrun: ", run);
                      run[serviceName].replicas[replicaKey] = resultRun;
                      console.log("resultRun2: ", run);
                      
                    });
                
                    await request(
                      uaSocketconnect2,
                      "executionInfo",
                      {
                        replica: replicaKey,
                        server: serviceName,
                        stage: "run",
                        workspaceId: workspaceId,
                      },
                      "workspace-proxy",
                      endpoint
                    );
                
                    endpoint++;
                  }
                });

               } else if (!data.value.origin) {
                const runCheck = checkCiPipelineState(uaSocketconnect2, 237);

                runCheck.then((resultRun: any) => {
                  run = resultRun;
                });

                await request(uaSocketconnect2, "executionInfo", { workspaceId: workspaceId, stage: 'run' }, "workspace-proxy", 237);
                await delay(200);

              }
              
              await request(uaSocketconnect2, "executionInfo", { workspaceId: workspaceId, stage: 'test' }, "workspace-proxy", 136);
              
              await delay(200);
    
              await request(uaSocketconnect2, "executionInfo", { workspaceId: workspaceId, stage: 'prepare' }, "workspace-proxy", 35);
              
              await delay(500);
              
              this._view?.webview.postMessage({
                type: "ciPipelineStatus",
                value: {
                  prepare: prepare,
                  test: test,
                  run: run,
                  dynamic: false
                },
              });
              break;
            }

            

            case "startCiStage": {
              if (!data.value) {
                return;
              }
              
              const delay = (ms: any) => new Promise(resolve => setTimeout(resolve, ms));
              const workspaceId = parseInt(data.value.workspaceId);
              const stage = data.value.stage;
              let endpoint: number = 777;
              const socketURL = `wss://${data.value.dataCenterId}.${instanceURL}/workspace-proxy`;
              const accessToken = await this.extensionContext.secrets.get("codesphere.accessToken") as string;
              socket = await setupWs(new wsLib.WebSocket(socketURL), "workspace-proxy", accessToken, cache, workspaceId);
              let uaSocket = getUaSocket();
              let ciStageFinished = false; 
              let ciPipelineStatus;
              let runStageServices = data.value.msd;

              if (stage === "prepare") {
                endpoint = 36;
              }
              if (stage === "test") {
                endpoint = 137;
              }
              if (stage === "run") {
                endpoint = 238;
              }

              if ((stage === "prepare" || stage === "test" || stage === "run" && !runStageServices )) {
                await request(uaSocket, "executionInfo", { workspaceId: workspaceId, stage: stage }, "workspace-proxy", endpoint);

                const endpointArray = Array.from({length: data.value.stepcount}, (_, i) => 400 + i);     
      
                await request(uaSocket, "startPipeline", { workspaceId: workspaceId, stage: stage }, "workspace-proxy", 32);
                
                for (let i = 0; i < data.value.stepcount; i++) {
                  request(uaSocket, "logs", { workspaceId: workspaceId, stage: stage, step:i }, "workspace-proxy", (400+i));
                }
                
                ciStageStatusHandler(uaSocket, endpoint, this.postMessageToWebview, stage).then((status: any) => {
                  ciPipelineStatus = status;
                });

                let log = ciStepHandler(uaSocket, endpoint, endpointArray, this.postMessageToWebview, stage);

                
                while (!ciStageFinished) {
                    await delay(1000);

                    if (ciPipelineStatus === 'success') {
                      ciStageFinished = true;
                    }

                    if (ciPipelineStatus === 'failure') {
                      ciStageFinished = true;
                    }
                }
                
                break;
              } else if (stage === "run" && runStageServices) {
                const generateReplicaEndpoints = (services: any) => {
                  let endpointCounter = 401;
                  const replicaEndpoints: Record<string, number> = {};
              
                  for (const serviceKey in services) {
                      const service = services[serviceKey];
                      if (service.replicas) {
                          for (const replicaKey in service.replicas) {
                              replicaEndpoints[replicaKey] = endpointCounter++;
                          }
                      }
                  }
              
                  return replicaEndpoints;
              };
                
                const endpointArrayReplica = generateReplicaEndpoints(runStageServices);
                console.log("endpointArrayReplica: ", endpointArrayReplica);

                let status = ciStageStatusHandlerMSD(uaSocket, endpointArrayReplica, this.postMessageToWebview, stage);

                Object.entries(runStageServices).forEach(async ([serviceName, service]: [string, any]) => {
                  console.log("service: ", serviceName);
                
                  const replicas = service.replicas;

                  for (const replicaKey of Object.keys(replicas)) {
                    console.log("Replica: ", replicaKey);

                    let endpointReplica = endpointArrayReplica[replicaKey];

                    console.log("endpointReplica: ", endpointReplica);

                    await request(
                      uaSocket,
                      "executionInfo",
                      {
                        replica: replicaKey,
                        server: serviceName,
                        stage: "run",
                        workspaceId: workspaceId,
                      },
                      "workspace-proxy",
                      endpointReplica
                    );
                  }
                }
                );

                await request(uaSocket, "startPipeline", { workspaceId: workspaceId, stage: stage }, "workspace-proxy", 32);

                const generateReplicaStepEndpoints = (services: any) => {
                  let endpointCounter = 501;
                  const replicaStepEndpoints: Record<string, { steps: Record<number, number> }> = {};
              
                  for (const serviceKey in services) {
                      const service = services[serviceKey];
                      if (service.replicas) {
                          for (const replicaKey in service.replicas) {
                              const replica = service.replicas[replicaKey];
                              
                              // Initialisiere die steps für das aktuelle Replica
                              replicaStepEndpoints[replicaKey] = { steps: {} };
              
                              // Gehe alle Steps des Replicas durch und weise jedem Step eine eigene EndpointId zu
                              replica.steps.forEach((step: any, index: number) => {
                                  replicaStepEndpoints[replicaKey].steps[index] = endpointCounter++;
                              });
                          }
                      }
                  }
              
                  return replicaStepEndpoints;
              };

              const replicaStepEndpoints = generateReplicaStepEndpoints(runStageServices);

              console.log("Replica Step Endpoints", replicaStepEndpoints);

              let log = ciStepHandlerMSD(uaSocket, replicaStepEndpoints, this.postMessageToWebview, stage);
                Object.entries(runStageServices).forEach(async ([serviceName, service]: [string, any]) => {
                  console.log("service: ", serviceName);
              
                  const replicas = service.replicas;
                  for (const replicaKey of Object.keys(replicas)) {
                      console.log("Replica: ", replicaKey);
              
                      const steps = replicas[replicaKey].steps;
                      for (const stepIndex in steps) {
                          const endpointId = replicaStepEndpoints[replicaKey].steps[stepIndex];
                          console.log(`Sending request for step ${stepIndex} with endpointId ${endpointId}`);
              
                          request(
                              uaSocket,
                              "logs",
                              { workspaceId: workspaceId, stage: stage, step: parseInt(stepIndex), replica: replicaKey, server: serviceName },
                              "workspace-proxy",
                              endpointId
                          );
                      }
                  }
              });


              }

            }
          };
      }
    );
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

    private _getHtmlWebviewMSD(webview: vscode.Webview) {
      const styleResetUri = webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, "media", "reset.css")
      );
      const scriptUri = webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, "out", "compiled/msdcipipeline.js")
      );
      const styleMainUri = webview.asWebviewUri(
        vscode.Uri.joinPath(this._extensionUri, "out", "compiled/msdcipipeline.css")
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