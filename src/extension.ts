import * as vscode from 'vscode';
import { SidebarProvider } from './SidebarProvider';
import { FileTreeProvider } from './FileTreeProvider';
import { CiPipelineProvider } from './CiPipelineProvider';	
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
	
	const rootPath: string = getWorkspaceRootPath();

	const sidebarProvider = new SidebarProvider(context.extensionUri, context);
	const noCurrentWorkspaceProvider = new NoCurrentWorkspaceProvider(context.extensionUri);
	const fileTreeProvider = new FileTreeProvider(rootPath);
	const ciPipelineProvider = new CiPipelineProvider(context.extensionUri, context);


	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
		"codesphere-sidebar",
		sidebarProvider,
		{
			webviewOptions: {
				retainContextWhenHidden: true
			}
		}
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

	context.subscriptions.push(
		vscode.window.registerWebviewViewProvider(
			'ci-pipeline',
			ciPipelineProvider,
			{
				webviewOptions: {
					retainContextWhenHidden: true
				}
			}
		),
		
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

	exec (bashcommand, (error, stdout, stderr) => {	
		if (error) {
			console.error(`exec error: ${error}`);
			return;
		}

		if (stderr) {
			console.error(`stderr: ${stderr}`);
			return;
		}

		workspaceId = stdout ? stdout.trim() : ``;
		context.globalState.update("codesphere.currentWorkspace", workspaceId);

		vscode.commands.executeCommand('setContext', 'codesphere.currentWorkspace', workspaceId);


		if (workspaceId !== "" && workspaceId !== "$WORKSPACE_ID") {
			const pwdUri = vscode.Uri.parse('home/user/app');
			vscode.workspace.getConfiguration('window').update('restoreWindows', 'none', vscode.ConfigurationTarget.Global);
			vscode.commands.executeCommand('vscode.openFolder', pwdUri);
		} else {
			vscode.workspace.getConfiguration('window').update('restoreWindows', 'all', vscode.ConfigurationTarget.Global);
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

	});

	if (!rootPath) {
		vscode.commands.executeCommand('setContext', 'codesphere.currentWorkspace', "");
	}

	if (rootPath) {
		if (!context.globalState.get("codesphere.currentWorkspace") || context.globalState.get("codesphere.currentWorkspace") === "") {
			vscode.commands.executeCommand('setContext', 'codesphere.currentWorkspace', "");
		}
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
			const instanceURL = await context.globalState.get("codesphere.instanceURL") as string;
			reloadCache(accessToken, instanceURL, (error, teams, workspaces, userData) => {
				if (error) {
					vscode.window.showErrorMessage('An error occurred while reloading cache: ' + error.message);
					return;
				}
				context.globalState.update("codesphere.workspaces", workspaces);
				context.globalState.update("codesphere.userData", userData);
				context.globalState.update("codesphere.teams", teams);
				vscode.commands.executeCommand('workbench.action.webview.reloadWebviewAction', 'codesphere-sidebar');
			});
		} else {
			vscode.window.showErrorMessage('Access token is undefined');
		}
		vscode.window.showInformationMessage('reload successful!');
	}));
	
	context.subscriptions.push(vscode.commands.registerCommand('codesphere.configureHosts', async () => {
        vscode.commands.executeCommand("workbench.action.openSettingsJson");
    }));

	context.subscriptions.push(
		vscode.commands.registerCommand('codesphere.openCiPipeline', async () => {
			vscode.commands.executeCommand("ci-pipeline.focus");
		})
	);


	context.subscriptions.push(
		vscode.commands.registerCommand('codesphere.submenu', async () => {
			vscode.window.showInformationMessage("Do you want to log out?", "yes", "no").then((response) => {
				if (response === "yes") {
					context.secrets.delete('codesphere.accessToken');
					context.secrets.delete('codesphere.sessionId');
					context.globalState.update("codesphere.isLoggedIn", false);	
					context.globalState.update("codesphere.accessTokenCache", "");
					context.globalState.update("codesphere.teams", []);
					context.globalState.update("codesphere.workspaces", {});
					context.globalState.update("codesphere.userData", {});

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
		vscode.commands.registerCommand('codesphere.openOverView', async () => {
			vscode.commands.executeCommand('setContext', 'codesphere.currentWorkspace', workspaceId);
		}));
};


// This method is called when your extension is deactivated
export function deactivate() {

}