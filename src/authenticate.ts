import * as vscode from 'vscode';

export const authenticate = () => {
    console.log('authenticate');

    vscode.commands.executeCommand('vscode.open', vscode.Uri.parse('')  );
};