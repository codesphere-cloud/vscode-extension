import * as vscode from 'vscode';
import { HelloWorldPanel } from './HelloWorldPanel';
import { SidebarProvider } from './SidebarProvider';
const axios = require('axios');



export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "codesphere" is now active!');
	
	const sidebarProvider = new SidebarProvider(context.extensionUri, context);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "codesphere-sidebar",
      sidebarProvider
    )
  );

  context.subscriptions.push(
	vscode.commands.registerCommand('codesphere.notLoggedIn', () => {
	  vscode.window.showInformationMessage('You need to log in to use this feature.');
	})
  );
	
	context.subscriptions.push(
		vscode.commands.registerCommand('codesphere.helloWorld', () => {
			HelloWorldPanel.createOrShow(context.extensionUri);
	})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('codesphere.refresh', () => {
			HelloWorldPanel.kill();
			HelloWorldPanel.createOrShow(context.extensionUri);
			setTimeout(() => {

			vscode.commands.executeCommand('workbench.action.webview.openDeveloperTools');
			}, 500);
		})
	);

	context.subscriptions.push(
		vscode.commands.registerCommand("codesphere.askQuestion", () => {
			vscode.window.showInformationMessage("How was your day?", "good", "bad").then((response) => {
				if (response === "good") {
					vscode.window.showInformationMessage("That's great to hear!");
				} else if (response === "bad") {
					vscode.window.showInformationMessage("That's too bad.");
				}
			});
		})
	);

	

	context.subscriptions.push(
		vscode.commands.registerCommand('codesphere.submenu', async () => {
			vscode.window.showInformationMessage("Do you want to log out??", "yes", "no").then((response) => {
				if (response === "yes") {
					context.secrets.delete('codesphere.accessToken');
					context.secrets.delete('codesphere.sessionId');
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

	  
};


// This method is called when your extension is deactivated
export function deactivate() {}