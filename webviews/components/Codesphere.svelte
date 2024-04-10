<script>
    import "vscode-webview"

    function listTeams() {
        vscode.postMessage({
            type: 'test',
            value: {
            }
        });
    }

    function logout() {
        vscode.postMessage({
            type: 'logout',
            value: {
            }
        });
    }
</script>

<button on:click={listTeams}>test</button>