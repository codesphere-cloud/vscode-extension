import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';
import { FileTreeProvider } from './FileTreeProvider';
import { NoCurrentWorkspaceProvider } from './NoCurrentWorkspaceProvider';
import { reloadCache } from './ts/reloadCache';
import { exec } from 'child_process';
const axios = require('axios');


function getWorkspaceRootPath(): string  {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (workspaceFolders && workspaceFolders.length > 0) {
        return workspaceFolders[0].uri.fsPath;
    }
    return ``;
}


export function activate(context: vscode.ExtensionContext) {

		const sidebarProvider = new SidebarProvider(context.extensionUri, context);
		const noCurrentWorkspaceProvider = new NoCurrentWorkspaceProvider(context.extensionUri);
		const rootPath: string = getWorkspaceRootPath();
		const fileTreeProvider = new FileTreeProvider(rootPath);
		console.log('roothPath is: ', rootPath);

		context.subscriptions.push(
			vscode.window.registerWebviewViewProvider(
			"codesphere-sidebar",
			sidebarProvider
			)
		);

		context.subscriptions.push(
			vscode.window.registerWebviewViewProvider(
			"codesphere-noworkspace",
			noCurrentWorkspaceProvider
			)
		);

		context.subscriptions.push(
			vscode.window.createTreeView(
				'workspace-filetree', 
				{ treeDataProvider: fileTreeProvider }
				)
		);		

		const userData: any = context.globalState.get("codesphere.userData");
		const gitEmail: string = userData.email || "";
		let gitFirstName: string = userData.firstName || "";
		let gitLastName: string = userData.lastName || "";

		if (!gitFirstName && !gitLastName && gitEmail) {
			const emailParts = gitEmail.split("@");
			if (emailParts.length > 0) {
				gitFirstName = emailParts[0];
			}
		}

	const bashcommand = 'echo $WORKSPACE_ID';
	const gitBashEmail = `git config --global user.email "${gitEmail}"`;
	const gitBashName = `git config --global user.name "${gitFirstName} ${gitLastName}"`;
	let workspaceId: string = "";

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

		vscode.commands.executeCommand('setContext', 'codesphere.currentWorkspace', workspaceId);


		if (workspaceId !== "") {
			const pwdUri = vscode.Uri.parse('home/user/app');
			vscode.commands.executeCommand('vscode.openFolder', pwdUri);
		}
	});

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

	if (!rootPath) {
		vscode.window.showInformationMessage('No workspace folder found1');
		vscode.commands.executeCommand('setContext', 'codesphere.currentWorkspace', "");
	}

	if (rootPath) {
		if (!context.globalState.get("codesphere.currentWorkspace") || context.globalState.get("codesphere.currentWorkspace") === "") {
			vscode.window.showInformationMessage('No workspace folder found');
			vscode.commands.executeCommand('setContext', 'codesphere.currentWorkspace', "");
		}
		console.log('No workspace folder found2');
		vscode.commands.executeCommand('setContext', 'codesphere.currentWorkspace', workspaceId);
	} 

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

  context.subscriptions.push(
	vscode.commands.registerCommand('codesphere.reload', async () => {
		const accessToken = await context.secrets.get("codesphere.accessToken");
		if (accessToken) {
			reloadCache(accessToken, (error, teams, workspaces, userData) => {
				if (error) {
					vscode.window.showErrorMessage('An error occurred while reloading cache: ' + error.message);
					return;
				}
				context.globalState.update("codesphere.workspaces", workspaces);
				context.globalState.update("codesphere.userData", userData);
				vscode.commands.executeCommand('workbench.action.webview.reloadWebviewAction', 'codesphere-sidebar');
			});
		} else {
			vscode.window.showErrorMessage('Access token is undefined');
		}
		vscode.window.showInformationMessage('reload successful!');
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

	  context.subscriptions.push(
		vscode.commands.registerCommand('codesphere.backToMenu', async () => {
			vscode.commands.executeCommand('setContext', 'codesphere.currentWorkspace', "");
		})
	  );

	  context.subscriptions.push(
		vscode.commands.registerCommand('codesphere.openOverView', async (workspaceID) => {
			if (context.globalState.get("codesphere.currentWorkspace") === workspaceID) {
				vscode.commands.executeCommand('setContext', 'codesphere.currentWorkspace', workspaceId);
			} else {
				vscode.commands.executeCommand('setContext', 'codesphere.currentWorkspace', "");
			}
		})
	  );
};


// This method is called when your extension is deactivated
export function deactivate() {}