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
    let workspaceURL;
    let prepareStageSate = false; // Zustand für die Animation
    let prepareStageSuccess = ''; // Zustand ob stage erfolgreich war oder einen Fehler hatte
    let testStageSate = false; // Zustand für die Animation
    let testStageSuccess = '';
    let runStageSate = false; // Zustand für die Animation
    let runStageSuccess = '';
    let pullState = false;
    let pushState = false;
    let codesphereURL;

    function getInstanceURL() {
        vscode.postMessage({
            type: 'getInstanceURL',
            value: {
            }
        });
    }

    function openCiPanel () {
        vscode.postMessage({
            type: 'focusPanel',
            value: {
            }
        });
    }

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

    // function to create the deployment URL for the workspace
    // TODO: instead of contructing the workspaceURL here, you can fetch it instead of globalStorage
    // there might be connected a domain to a workspace, so if this is the case use the domain instead of base subdomain
    function createWorkspaceURL(subDomainStructure, wsId) {
        workspaceURL = `https://${wsId}-3000.${subDomainStructure}`
    }

    // funtion to set up the vscode server on Codesphere if it is not already running
    function openSocket(workspaceId, workspaceName, teamDatacenterId, teamId) {
        loadingMessage = "Waiting for authorization..."
        creatingTunnel = true;
        vscode.postMessage({
            type: 'opensocket',
            value: {
                workspaceId: workspaceId,
                workspaceName: workspaceName,
                datacenterId: teamDatacenterId,
                teamId: teamId
            }
        });
    }

    // function to trigger the connection to the remote server
    function openTunnel(workspaceId, workspaceName, teamDatacenterId, teamId) {
        vscode.postMessage({
            type: 'openTunnel',
            value: {
                workspaceId: workspaceId,
                workspaceName: workspaceName,
                datacenterId: teamDatacenterId,
                teamId: teamId
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

    function startCiStage(workspaceId, stage, dataCenterId) {
        vscode.postMessage({
            type: 'startCiStage',
            value: {
                workspaceId: workspaceId,
                stage: stage,
                dcId: dataCenterId
            }
        });
    }

    function startTestStage(workspaceId, dataCenterId) {
        testStageSate = true;
        testStageSuccess = '';
        let stage = "test";
        startCiStage(workspaceId, stage, dataCenterId);
    }

    function startPrepareStage(workspaceId, dataCenterId) {
        prepareStageSate = true;
        prepareStageSuccess = '';
        let stage = "prepare";
        startCiStage(workspaceId, stage, dataCenterId);
    }

    function startRunStage(workspaceId, dataCenterId) {
        runStageSate = true;
        runStageSuccess = '';
        let stage = "run";
        startCiStage(workspaceId, stage, dataCenterId);
    }

    function getCiStageStatus(workspaceId, dcId) {
        vscode.postMessage({
            type: 'getCiStageStatus',
            value: {
                workspaceId: workspaceId,
                datacenterId: dcId
            }
        });
    }

    function gitPull(workspaceId, dscId) {
        vscode.postMessage({
            type: 'gitPull',
            value: {
                workspaceId: workspaceId,
                dataCenterId: dscId
            }
        });
    }

    function gitPush(workspaceId, dcId) {
        vscode.postMessage({
            type: 'gitPush',
            value: {
                workspaceId: workspaceId,
                dataCenterId: dcId
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
                    activateWorkspace(overviewData.workspace.id, overviewData.workspace.dataCenterId);
                    createWorkspaceURL(overviewData.workspace.subDomainStructure, overviewData.workspace.id);
                    getconnectedWorkspace();
                    break;
                case 'resourcesDeployed':
                    workspaceDeployed = true;
                    getCiStageStatus(overviewData.workspace.id, overviewData.workspace.dataCenterId);
                    break;
                case 'gitHubAuth':
                    // define code which will affect the DOM depending on the message
                    code = message.value.code; 
                    workspaceAboutToConnect = true;
                    break;
                case 'loading':
                    // sets the state of loading for animation
                    loadingMessage = message.value.state;
                    if (loadingMessage === 'Setting up server. This might take up to 2 minutes...') {
                        workspaceAboutToConnect = false;
                    } 
                    break;
                case 'loadingFinished':
                    // sets the state of loading for animation
                    creatingTunnel = false;
                    break;
                case 'connectedWorkspace':
                    if (parseInt(message.value) === parseInt(overviewData.workspace.id)) {
                        connectedWorkspace = true;
                        vscode.postMessage({
                            type: 'getActiveWorkspaces',
                            value: {
                            }
                        });
                    }
                    break;
                case 'activeWorkspaces':
                    if (message.value[overviewData.workspace.id]) {
                        activeWorkspace = true;
                    }
                    break;
                case 'removeWorkspace':
                    activeWorkspace = false;
                    vscode.postMessage({
                        type: 'getActiveWorkspaces',
                        value: {
                        }
                    });
                    break;
                case 'ciPipelineFinished':
                    if (message.value.stage === 'prepare') {
                        prepareStageSate = false;
                        prepareStageSuccess = message.value.result;
                    } else if (message.value.stage === 'test') {
                        testStageSate = false;
                        testStageSuccess = message.value.result;
                    } else if (message.value.stage === 'run') {
                        runStageSate = false;
                        runStageSuccess = message.value.result;
                    }
                    break;
                case 'ciPipelineStatus':
                    prepareStageSuccess = message.value.prepare;
                    if (prepareStageSuccess === 'running') {
                        prepareStageSate = true;
                    }
                    testStageSuccess = message.value.test;
                    if (testStageSuccess === 'running') {
                        testStageSate = true;
                    }
                    runStageSuccess = message.value.run;
                    if (runStageSuccess === 'running') {
                        runStageSate = true;
                    }
                    break;
                case 'gitPull':
                    pullState = false;
                    break;
                case 'gitPush':
                    pushState = false;
                    break;
                case 'getInstanceURL':
                    codesphereURL = message.value;
                    break;
            }   
        });
    });

    // these function will be executed when opening the webview
    onMount(getActiveWorkspaces);
    onMount(getWorkspaceData)
    onMount(testAccessToken);
    onMount(getconnectedWorkspace);
    onMount(createWorkspaceURL);
    onMount(getInstanceURL);
</script>

<style>
    .circle-container {
        position: relative;
        width: 30px; 
        height: 30px; 
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
        width: 15px; 
        height: 15px; 
        z-index: 1;
        animation-name: inner-bounce;
        animation-iteration-count: infinite;
    }

    .outer-circle {
        width: 15px; 
        height: 15px; 
        z-index: 0;
        animation-name: outer-bounce;
        animation-iteration-count: infinite;
    }

    @keyframes inner-bounce {
        0%, 100% {
        width: 15px; 
        height: 15px; 
        }
        50% {
        width: 5px; 
        height: 5px; 
        }
    }

    @keyframes outer-bounce {
        0%, 100% {
        width: 15px; 
        height: 15px; 
        }
        50% {
        width: 25px; 
        height: 25px; 
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
        border: '';
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

    .codeBox {
        margin-right: 10px; 
    }

    .codeAndIcon {
        display: flex; 
        flex-direction: row;
        align-items: center; 
        justify-content: start;
    }

    .back-button {
        cursor: pointer;
        margin-bottom: 10px;
    }

    .openDeploymentButton {
        width: 150px;
        padding: 8px;
        border: solid 1px #808080;
        border-radius: 5px;
        cursor: pointer;
        transition: background-color 0.3s;
        text-decoration: none;
        display: flex;
        align-items: center;
        gap: 4px;
    }

    .openDeploymentButton:hover {
        background: #80808026;
    }

    .content-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .action-buttons {
        display: flex;
        flex-direction: column;
        gap: 12px;
        
    }

    #create-tunnel-button {
        width: 150px;
        border-radius: 4px;
        padding-top: 12px;
        padding-bottom: 12px;
    }

    #create-tunnel-button:hover {
        opacity: 80%;
    }

</style>

<div class="content-container">
    <div class="back-button" on:click={() => backToSidebar()} role=presentation>
        ◀ Back
    </div>
    {#if workspaceDeployed === true}
        <h2 class="workspace-title">
            {overviewData.workspace.name}
        </h2>
        
    {/if}

    <div class="action-buttons">
        {#if workspaceDeployed === false}
            <div class="animation-container">
                <div class="circle-container">
                    <div class="inner-circle" class:animate={animateCircles}></div>
                    <div class="outer-circle" class:animate={animateCircles}></div>
                </div>
                <p>Connecting to workspace...</p>
            </div>
            {#if animateCircles} 
                <script>
                    startAnimation(); 
                </script>
            {/if}
        {/if}
        {#if !creatingTunnel && !activeWorkspace && workspaceDeployed === true}
            <button id="create-tunnel-button" class="connect" on:click={() => openSocket(overviewData.workspace.id, overviewData.workspace.name, overviewData.workspace.dataCenterId, overviewData.workspace.teamId)}>create tunnel</button>
        {/if}
    </div>

    {#if creatingTunnel === true}
        <div class="animation-container">
            <div class="circle-container">
                <div class="inner-circle" class:animate={animateCircles}></div>
                <div class="outer-circle" class:animate={animateCircles}></div>
            </div>
            <p>{loadingMessage}</p>
        </div>
        {#if animateCircles} 
            <script>
                startAnimation(); 
            </script>
        {/if}
    {/if}

    {#if workspaceAboutToConnect === true}
        <div class="codeProvider">
            <div class="codeProviderInside">
                <div class="codeProviderInside">
                    <p>please copy this code</p>
                    <p class="spaceForLink"></p>
                    <div class="codeAndIcon">
                        <p class="codeBox" id="codeBox">{code}</p>
                        <div class="icon" on:click={() => copyCode()} role="presentation">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="''" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
                                <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                            </svg>
                        </div>
                    </div>
                </div>
                <p class="spaceForLink">and paste it here:</p>
                <a href="https://github.com/login/device">https://github.com/login/device</a>
            </div>
        </div>
    {/if}

    {#if activeWorkspace === true && workspaceDeployed === true && connectedWorkspace === false}
        <div class="action-buttons">
            <a href='{workspaceURL}' class="openDeploymentButton">
                <span>Open deployment</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M1.17188 1.7873C1.17188 1.51807 1.39014 1.2998 1.65937 1.2998H10.343C10.6122 1.2998 10.8305 1.51807 10.8305 1.7873V7.73631C10.8305 8.00555 10.6122 8.22381 10.343 8.22381H1.65937C1.39014 8.22381 1.17188 8.00555 1.17188 7.73631V1.7873ZM2.14687 2.2748V7.24881H9.85551V2.2748H2.14687Z"></path>
                    <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M6.63516 7.65234V9.84527H5.66016V7.65234H6.63516Z"></path>
                    <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M3.51953 9.6623C3.51953 9.39307 3.73779 9.1748 4.00703 9.1748H8.28481C8.55405 9.1748 8.77231 9.39307 8.77231 9.6623C8.77231 9.93154 8.55405 10.1498 8.28481 10.1498H4.00703C3.73779 10.1498 3.51953 9.93154 3.51953 9.6623Z"></path>
                </svg>
            </a>
            <div class="openDeploymentButton" on:click={() => openCiPanel()} role=presentation>
                <span>Open CI-Pipeline</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" height="16" width="16">
                    <path fill="currentColor" d="M14.0917 1.2398C14.4471 1.29057 14.6941 1.61981 14.6433 1.97519L14.1433 5.47519C14.1189 5.64585 14.0277 5.79983 13.8898 5.90327C13.7519 6.0067 13.5786 6.05111 13.4079 6.02673L9.90791 5.52674C9.55254 5.47597 9.3056 5.14672 9.35637 4.79134C9.40714 4.43597 9.73638 4.18903 10.0918 4.2398L12.0733 4.52287C10.809 3.09408 9.30174 2.53327 7.99984 2.53327C5.04513 2.53327 2.64982 4.92855 2.64982 7.88327C2.64982 8.24225 2.3588 8.53327 1.99982 8.53327C1.64083 8.53327 1.34982 8.24225 1.34982 7.88327C1.34982 4.21057 4.32717 1.23327 7.99984 1.23327C9.7129 1.23327 11.5804 1.98295 13.0832 3.70321L13.3564 1.79134C13.4071 1.43597 13.7364 1.18903 14.0917 1.2398Z" clip-rule="evenodd" fill-rule="evenodd"></path>
                    <path fill="currentColor" d="M1.90801 14.5267C1.55264 14.476 1.3057 14.1467 1.35647 13.7913L1.85646 10.2913C1.88084 10.1207 1.97202 9.96671 2.10993 9.86327C2.24784 9.75984 2.4212 9.71543 2.59186 9.73981L6.09183 10.2398C6.4472 10.2906 6.69414 10.6198 6.64337 10.9752C6.5926 11.3306 6.26336 11.5775 5.90798 11.5267L3.92648 11.2437C5.19071 12.6725 6.698 13.2333 7.99989 13.2333C10.9546 13.2333 13.3499 10.838 13.3499 7.88327C13.3499 7.52429 13.6409 7.23327 13.9999 7.23327C14.3589 7.23327 14.6499 7.52429 14.6499 7.88327C14.6499 11.556 11.6726 14.5333 7.99989 14.5333C6.28684 14.5333 4.41938 13.7836 2.91652 12.0633L2.6434 13.9752C2.59264 14.3306 2.26339 14.5775 1.90801 14.5267Z" clip-rule="evenodd" fill-rule="evenodd"></path>
                    <path fill="currentColor" d="M9.39999 8.08324C9.39999 8.74598 8.86273 9.28324 8.2 9.28324C7.53726 9.28324 7 8.74598 7 8.08324C7 7.4205 7.53726 6.88324 8.2 6.88324C8.86273 6.88324 9.39999 7.4205 9.39999 8.08324Z"></path>
                </svg>
            </div>
        </div>
        <div class="codeProvider">
            <div class="codeProviderInside">
                <p class="spaceForLink">Workspace is ready to connect</p>
                <button on:click= {() => openTunnel(overviewData.workspace.id, overviewData.workspace.name, overviewData.workspace.dataCenterId, overviewData.workspace.teamId)}>Connect</button>
            </div>
        </div>
    {/if}
    
</div>