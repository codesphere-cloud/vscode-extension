<script>
    import { onMount } from "svelte";
    import * as vscode from "vscode";
    import "vscode-webview"

    let overviewData;
    let workspaceDeployed = false;
    let animateCircles = false; // Zustand für die Animation
    let creatingTunnel = false;
    let loadingMessage;
    let activeWorkspace;
    let workspaceAboutToConnect = false;
    let code;
    let connectedWorkspace = false;
    let activeWorkspaces;

    // function to wakr up on-demand workspaces on Codesphere
    function activateWorkspace (workspaceId, teamDatacenterId){
        vscode.postMessage({
            type: 'activateWorkspace',
            value: {
                workspaceId: workspaceId,
                datacenterId: teamDatacenterId
            }
        });
    }

    // funtion to set up the vscode server on Codesphere if it is not already running
    function openSocket(workspaceId, workspaceName, teamDatacenterId) {
        loadingMessage = "Waiting for authorization..."
        creatingTunnel = true;
        console.log(`creatingTunnel: ${creatingTunnel}`);

        vscode.postMessage({
            type: 'opensocket',
            value: {
                workspaceId: workspaceId,
                workspaceName: workspaceName,
                datacenterId: teamDatacenterId
            }
        });
    }

    // function to trigger the connection to the remote server
    function openTunnel(workspaceId, workspaceName, teamDatacenterId) {
        vscode.postMessage({
            type: 'openTunnel',
            value: {
                workspaceId: workspaceId,
                workspaceName: workspaceName,
                datacenterId: teamDatacenterId
            }
        });
    }

    // function to test whether the access Token is still valid
    function testAccessToken() {
        vscode.postMessage({
            type: 'testConnection',
            value: {
            }
        });
    }

    // function to copy the github code to the clipboard
    function copyCode() {
        var codeBox = document.getElementById("codeBox");

        var selection = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(codeBox);
        selection.removeAllRanges();
        selection.addRange(range);

        document.execCommand("copy");

        selection.removeAllRanges();

        vscode.postMessage({
            type: 'copycode',
            value: {
            }
        });
    }

    // function to get back to team overview
    function backToSidebar() {
        vscode.postMessage({
            type: 'openSidebar',
            value: {
            }
        });
    }

    // function to fetch the currently connected workspace
    function getconnectedWorkspace() {
        vscode.postMessage({
            type: 'getConnectedWorkspace',
            value: {
            }
        });
    }

    function getWorkspaceData() {
        vscode.postMessage({
            type: 'getWorkspaceData',
            value: {
            }
        });
    }

    function getActiveWorkspaces() {
        vscode.postMessage({
            type: 'getActiveWorkspaces',
            value: {
            }
        });
    }

    onMount(() => {
        
        window.addEventListener('message', event => {
            const message = event.data; // The JSON data our extension sent
            console.log(`message received: ${JSON.stringify(message)}`);
            switch (message.type) {
                case 'overviewData':
                    overviewData = message.value;
                    console.log(`overviewData: ${JSON.stringify(overviewData)}`);
                    activateWorkspace(overviewData.workspace.id, overviewData.workspace.dataCenterId);
                    break;
                case 'resourcesDeployed':
                    workspaceDeployed = true;
                    break;
                case 'gitHubAuth':
                    // define code which will affect the DOM depending on the message
                    code = message.value.code; 
                    workspaceAboutToConnect = true;
                    console.log(`${code} type user: ${typeof code}`);
                    break;
                case 'loading':
                    // sets the state of loading for animation
                    loadingMessage = message.value.state;
                    if (loadingMessage === 'Setting up server...') {
                        workspaceAboutToConnect = false;
                    } 
                    break;
                case 'loadingFinished':
                    // sets the state of loading for animation
                    creatingTunnel = false;
                    break;
                case 'connectedWorkspace':
                    if (message.value === overviewData.workspace.id) {
                        connectedWorkspace = true;
                        vscode.postMessage({
                            type: 'getActiveWorkspaces',
                            value: {
                            }
                        });
                    }
                    break;
                case 'activeWorkspaces':
                    console.log(`${message.value} type user: ${typeof message.value}`);
                    activeWorkspaces = message.value;
                    console.log(`activeWorkspaces3333: ${overviewData.workspace.id}`)
                    console.log(`activeWorkspaces2222: ${activeWorkspaces[overviewData.workspace.id]}`);
                    if (activeWorkspaces[overviewData.workspace.id]) {
                        console.log(`activeWorkspaces[overviewData.workspace.id]: ${activeWorkspaces[overviewData.workspace.id]}`);
                        activeWorkspace = true;
                    }
                    break;
                case 'removeWorkspace':
                    // sets the state of loading for animation
                    activeWorkspace = false;
                    
                    vscode.postMessage({
                        type: 'getActiveWorkspaces',
                        value: {
                        }
                    });
                    break;
                    
            }
        });
    });

    onMount(getActiveWorkspaces);
    onMount(getWorkspaceData)
    onMount(testAccessToken);
    onMount(getconnectedWorkspace);

    

</script>

<style>
    .circle-container {
        position: relative;
        width: 30px; /* Anpassen je nach Bedarf */
        height: 30px; /* Anpassen je nach Bedarf */
    }

    .inner-circle {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        background-color: #00BCFF;
        animation-duration: 1500ms;
        animation-timing-function: ease-out;
        animation-fill-mode: both;
        opacity: calc(1 - 0.1);
    }

    .outer-circle {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        border-radius: 50%;
        background-color: #814BF6;
        animation-duration: 1500ms;
        animation-timing-function: ease-in;
        animation-fill-mode: both;
        opacity: calc(1 - 0.1);
    }

    .inner-circle {
        width: 15px; /* Anpassen je nach Bedarf */
        height: 15px; /* Anpassen je nach Bedarf */
        z-index: 1;
        animation-name: inner-bounce;
        animation-iteration-count: infinite;
    }

    .outer-circle {
        width: 15px; /* Anpassen je nach Bedarf */
        height: 15px; /* Anpassen je nach Bedarf */
        z-index: 0;
        animation-name: outer-bounce;
        animation-iteration-count: infinite;
    }

    @keyframes inner-bounce {
        0%, 100% {
        width: 15px; /* Anpassen je nach Bedarf */
        height: 15px; /* Anpassen je nach Bedarf */
        }
        50% {
        width: 5px; /* Anpassen je nach Bedarf */
        height: 5px; /* Anpassen je nach Bedarf */
        }
    }

    @keyframes outer-bounce {
        0%, 100% {
        width: 15px; /* Anpassen je nach Bedarf */
        height: 15px; /* Anpassen je nach Bedarf */
        }
        50% {
        width: 25px; /* Anpassen je nach Bedarf */
        height: 25px; /* Anpassen je nach Bedarf */
        }
    }

    .animation-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: start;
        gap: 2px;
    }

    button.connect {
        border: none;
        padding: 5px;
        width: 100px;
        text-align: center;
        outline: 1px solid transparent;
        outline-offset: 2px !important;
        color: var(--vscode-button-foreground);
        background: var(--vscode-button-background);
    }

    .codeProvider {
        display: flex;
        flex-direction: column;
        justify-content:space-evenly;
        gap: 10px;
        padding: 10px;
        max-width: 190px;
    }

    .codeProviderInside {
        display: flex;
        flex-direction: column;
        font-size: 15px;
    }

    .spaceForLink {
        margin-bottom: 5px;
        overflow:hidden;
    }

    .icon {
        padding: 5px;
        cursor: pointer;
        border-radius: 5px;
        transition: background-color 0.3s;
    }

    .icon:hover {
        background-color: rgb(43, 44, 44);
    }

    /* CSS für den Text */
    .codeBox {
        margin-right: 10px; /* Optional: Abstand zwischen Text und Icon */
    }

    .codeAndIcon {
        display: flex; 
        flex-direction: row;
        align-items: center; 
        justify-content: start;
    }

    .workspace-title {
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 10px;
    }

    .back-button {
        cursor: pointer;
        margin-bottom: 10px;
    }
</style>

<div>
    <div class="back-button" on:click={() => backToSidebar()} role=presentation>
        ◀ Back
    </div>
    <div>
        
    </div>

    {#if workspaceDeployed === true}
        <div class="workspace-title">
            {overviewData.workspace.name}
        </div>
        
    {/if}
    {#if workspaceDeployed === false}
        <div class="animation-container">
            <div class="circle-container">
                <div class="inner-circle" class:animate={animateCircles}></div>
                <div class="outer-circle" class:animate={animateCircles}></div>
            </div>
            <p>Connecting to workspace...</p>
        </div>
        {#if animateCircles} <!-- Nur wenn die Animation aktiv ist -->
            <script>
                startAnimation(); // Starte die Animation
            </script>
        {/if}
    {/if}
    {#if !creatingTunnel && !activeWorkspace && workspaceDeployed === true}
        <button class="connect" on:click={() => openSocket(overviewData.workspace.id, overviewData.workspace.name, overviewData.workspace.dataCenterId)}>create tunnel</button>
    {/if} 

    {#if creatingTunnel === true}
        <div class="animation-container">
            <div class="circle-container">
                <div class="inner-circle" class:animate={animateCircles}></div>
                <div class="outer-circle" class:animate={animateCircles}></div>
            </div>
            <p>{loadingMessage}</p>
        </div>
        {#if animateCircles} <!-- Nur wenn die Animation aktiv ist -->
            <script>
                startAnimation(); // Starte die Animation
            </script>
        {/if}
    {/if}

    {#if workspaceAboutToConnect === true}
        <div class="codeProvider">
            <div class="codeProviderInside">
                <p class="spaceForLink">please use this link</p>
                <a href="https://github.com/login/device">https://github.com/login/device</a>
            </div>
            <div class="codeProviderInside">
                <p>and use this code</p>
                <p class="spaceForLink"></p>
                <div class="codeAndIcon">
                    <p class="codeBox" id="codeBox">{code}</p>
                    <div class="icon" on:click={() => copyCode()} role="presentation">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                        </svg>
                    </div>
                </div>
            </div>
        </div>
    {/if}

    {#if activeWorkspace === true && workspaceDeployed === true && connectedWorkspace === false}
        <div class="codeProvider">
            <div class="codeProviderInside">
                <p class="spaceForLink">Workspace is connected</p>
                <button on:click= {() => openTunnel(overviewData.workspace.id, overviewData.workspace.name, overviewData.workspace.dataCenterId)}> open connection
                </button>
            </div>
        </div>
    {/if}

</div>