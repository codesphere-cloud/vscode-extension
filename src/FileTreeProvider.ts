import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

class FileTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly resourceUri?: vscode.Uri,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
    }

    iconPath = {
        light: path.join(__filename, '..', '..', 'resources', 'light', 'file.svg'),
        dark: path.join(__filename, '..', '..', 'resources', 'dark', 'file.svg')
    };
}

export class FileTreeProvider implements vscode.TreeDataProvider<FileTreeItem> {
    constructor(private workspaceRoot: string) {}

    getTreeItem(element: FileTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: FileTreeItem): Thenable<FileTreeItem[]> {
        if (!this.workspaceRoot) {
            vscode.window.showInformationMessage('No workspace folder found');
            return Promise.resolve([]);
        }

        const directoryPath = element ? element.resourceUri?.fsPath : this.workspaceRoot;
        return Promise.resolve(this.getFiles(directoryPath || ''));
    }

    private getFiles(directoryPath: string): FileTreeItem[] {
        if (!fs.existsSync(directoryPath)) {
            return [];
        }

        const files = fs.readdirSync(directoryPath);
        const items: FileTreeItem[] = [];

        for (const file of files) {
            const fullPath = path.join(directoryPath, file);
            const stat = fs.lstatSync(fullPath);
            const resourceUri = vscode.Uri.file(fullPath);

            if (stat.isDirectory()) {
                items.push(new FileTreeItem(
                    file,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    resourceUri
                ));
            } else {
                items.push(new FileTreeItem(
                    file,
                    vscode.TreeItemCollapsibleState.None,
                    resourceUri,
                    {
                        command: 'vscode.open',
                        title: 'Open File',
                        arguments: [resourceUri]
                    }
                ));
            }
        }

        return items;
    }

    private _onDidChangeTreeData: vscode.EventEmitter<FileTreeItem | undefined | void> = new vscode.EventEmitter<FileTreeItem | undefined | void>();
    readonly onDidChangeTreeData: vscode.Event<FileTreeItem | undefined | void> = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }
}