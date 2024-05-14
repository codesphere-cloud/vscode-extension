import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';
import { reloadCache } from './ts/reloadCache';
import { exec } from 'child_process';
const axios = require('axios');



export function activate(context: vscode.ExtensionContext) {

	const sidebarProvider = new SidebarProvider(context.extensionUri, context);

	const bashcommand = 'echo $WORKSPACE_ID';
	let workspaceId: string;

	// prüfen ob man sich in einem remote tunnmel befindet. Wenn ja dann wird der ordner angepasst.
	exec (bashcommand, (error, stdout, stderr) => {	
		if (error) {
			console.error(`exec error: ${error}`);
			return;
		}

		if (stderr) {
			console.error(`stderr: ${stderr}`);
			return;
		}

		console.log(`stdout: ${stdout}`);
		workspaceId = stdout ? stdout.trim() : ``;
		context.globalState.update("codesphere.currentWorkspace", workspaceId);


		if (workspaceId !== "") {
			const pwdUri = vscode.Uri.parse('home/user/app');
			vscode.commands.executeCommand('vscode.openFolder', pwdUri);
		}
	});



	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
		"codesphere-sidebar",
		sidebarProvider
		)
	);

	if (!context.globalState.get("codesphere.isLoggedIn") || context.globalState.get("codesphere.isLoggedIn") === false) {
		vscode.commands.executeCommand('setContext', 'codesphere.isLoggedIn', false);
		context.globalState.update("codesphere.isLoggedIn", false);
		console.log('Congratulations, your extension "codesphere" is now active! Please Log in.');
	  }

	if (context.globalState.get("codesphere.isLoggedIn") === true) {
		vscode.commands.executeCommand('setContext', 'codesphere.isLoggedIn', true);
		context.globalState.update("codesphere.isLoggedIn", true);
		console.log('Congratulations, your extension "codesphere" is now active! You are logged in.');
	}

  	



  const requiredExtensionId = 'ms-vscode.remote-server';
    const requiredExtension = vscode.extensions.getExtension(requiredExtensionId);

    if (!requiredExtension) {
        vscode.window.showInformationMessage(
            'The required extension is not installed. Click Install to install it now.',
            'Install'
        ).then(selection => {
            if (selection === 'Install') {
                vscode.commands.executeCommand('workbench.extensions.installExtension', requiredExtensionId);
            }
        });
    }

  context.subscriptions.push(
	vscode.commands.registerCommand('codesphere.reload', async () => {
		vscode.window.showInformationMessage('you are about to reload the cache');
		const accessToken = await context.secrets.get("codesphere.accessToken");
		if (accessToken) {
			reloadCache(accessToken, (error, teams, workspaces, userData) => {
				if (error) {
					vscode.window.showErrorMessage('An error occurred while reloading cache: ' + error.message);
					return;
				}
				console.log('teams', JSON.stringify(teams), 'workspaces', JSON.stringify(workspaces), 'userData', JSON.stringify(userData));
				context.globalState.update("codesphere.teams", teams);
				context.globalState.update("codesphere.workspaces", workspaces);
				context.globalState.update("codesphere.userData", userData);
				vscode.window.showInformationMessage(`Successfully reloaded cache`);
				vscode.commands.executeCommand('workbench.action.webview.reloadWebviewAction', 'codesphere-sidebar');
			});
		} else {
			vscode.window.showErrorMessage('Access token is undefined');
		}
	}));
	

	context.subscriptions.push(
		vscode.commands.registerCommand('codesphere.submenu', async () => {
			vscode.window.showInformationMessage("Do you want to log out?", "yes", "no").then((response) => {
				if (response === "yes") {
					context.secrets.delete('codesphere.accessToken');
					context.secrets.delete('codesphere.sessionId');
					context.globalState.update("codesphere.isLoggedIn", false);	
					sidebarProvider.updateWebviewContent();				
					vscode.window.showInformationMessage("Sucessfully logged out.");
					// After the user has successfully logged out
					vscode.commands.executeCommand('setContext', 'codesphere.isLoggedIn', false);
				} else if (response === "no") {
					vscode.window.showInformationMessage("You are still logged in.");
				}
			});
		  
		})
	  );

	  context.subscriptions.push(
		vscode.commands.registerCommand('codesphere.copycode', async () => {
			vscode.window.showInformationMessage("Code copied!");
		})
	  );

	  
};


// This method is called when your extension is deactivated
export function deactivate() {}