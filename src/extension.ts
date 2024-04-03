import * as vscode from 'vscode';
import { HelloWorldPanel } from './HelloWorldPanel';
import { SidebarProvider } from './SidebarProvider';


export function activate(context: vscode.ExtensionContext) {
	console.log('Congratulations, your extension "codesphere" is now active!');
	
	const sidebarProvider = new SidebarProvider(context.extensionUri);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "codesphere-sidebar",
      sidebarProvider
    )
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
};


// This method is called when your extension is deactivated
export function deactivate() {}