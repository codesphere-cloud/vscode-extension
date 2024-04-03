// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.

(function () {
    const vscode = acquireVsCodeApi();

    const counter = /** @type {HTMLElement} */ (document.getElementById('button'));
    button.innerText = 'Codesphere rocks!';

    console.log('Hello from Codesphere!');
    
}());