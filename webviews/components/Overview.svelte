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
    let workspaceURL;
    let prepareStageSate = false; // Zustand für die Animation
    let prepareStageSuccess = ''; // Zustand ob stage erfolgreich war oder einen Fehler hatte
    let testStageSate = false; // Zustand für die Animation
    let testStageSuccess = '';
    let runStageSate = false; // Zustand für die Animation
    let runStageSuccess = '';

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
    function createWorkspaceURL(dcId, wsId) {
        workspaceURL = `https://${wsId}-3000.${dcId}.codesphere.com`
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

    function getCiStageStatus(workspaceId) {
        vscode.postMessage({
            type: 'getCiStageStatus',
            value: {
                workspaceId: workspaceId
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
                    createWorkspaceURL(overviewData.workspace.dataCenterId, overviewData.workspace.id);
                    getconnectedWorkspace();
                    break;
                case 'resourcesDeployed':
                    workspaceDeployed = true;
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
                    console.log(`is it connected?1${message.value}`)
                    console.log(`is it connected?2${overviewData.workspace.id}`)
                    console.log(`is it connected?3${parseInt(message.value) === overviewData.workspace.id}`)
                    if (parseInt(message.value) === parseInt(overviewData.workspace.id)) {
                        console.log(`is it connected? ${message.value === overviewData.workspace.id}`)
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
            }   
        });
    });

    // these function will be executed when opening the webview
    onMount(getActiveWorkspaces);
    onMount(getWorkspaceData)
    onMount(testAccessToken);
    onMount(getconnectedWorkspace);
    onMount(createWorkspaceURL);
    // onMount(getCiStageStatus(overviewData.workspace.id))
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

    /* .workspace-title {
        font-size: 20px;
        font-weight: bold;
        margin-bottom: 10px;
    } */

    .back-button {
        cursor: pointer;
        margin-bottom: 10px;
    }

    .openDeploymentButton {
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

    .ci-pipelineBox {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        margin-bottom: 10px;
    }

    .pipelineStageTitle {
        font-size: 15px;
        font-weight: bold;
    }

    .pipelineStage {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        gap: 8px;
        align-items: center;
        padding: 16px;
        border: 1px solid #808080;
        border-radius: 5px;
        margin-bottom: 10px;
        cursor: pointer;
        transition: background-color 0.3s;
    }

    .pipelineStage:hover {
        background-color: #80808026!important;
    }

    .content-container {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .action-buttons {
        display: flex;
        gap: 8px
    }

    #create-tunnel-button {
        border-radius: 4px;
        padding-top: 12px;
        padding-bottom: 12px;
    }

    #create-tunnel-button:hover {
        opacity: 80%;
    }

    .pipeline-info {
        display: flex;
        gap: 12px;
        align-items: center;
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

    <!--ci-pipeline-->

    <div class="ci-pipelineBox">
        <div class="pipelineStage" on:click={() => startPrepareStage(overviewData.workspace.id, overviewData.workspace.dataCenterId)} role="presentation" style="background-color: {prepareStageSuccess === 'success' ? 'green' : (prepareStageSuccess === 'failure' ? 'red' : 'inherit')}">
            <div class="pipeline-info">
                <svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" viewBox="0 0 66 66" style="enable-background:new 0 0 66 66;" xml:space="preserve" width="24" height="24">
                    <g>
                        <path fill="white" d="M43,40H23c-1.7,0-3,1.3-3,3v20c0,1.7,1.3,3,3,3h20c1.7,0,3-1.3,3-3V43C46,41.3,44.7,40,43,40z M40,60H26V46h14V60z M24,40
                            H1.9C0.9,40,0,40.9,0,41.9V64c0,1.1,0.9,2,2,2h22c1.1,0,2-0.9,2-2V42C26,40.9,25.1,40,24,40z M20,60H6V46h14V60z M46,20H24
                            c-2.2,0-4,1.8-4,4v22h26V20z M40,40H26V26h14V40z M63,40H43c-1.7,0-3,1.3-3,3v20c0,1.7,1.3,3,3,3h20.9c1.2,0,2.1-0.9,2.1-2.1V43
                            C66,41.3,64.7,40,63,40z M60,60H46V46h14V60z M66,20H44c-2.2,0-4,1.8-4,4v22h26V20z M60,40H46V26h14V40z M64,0H44c-2.2,0-4,1.8-4,4
                            v22h26V2C66,0.9,65.1,0,64,0z M60,20H46V6h14V20z"></path>
                    </g>
                    </svg>
                <div class="pipelineStageTitle">Prepare</div>
            </div>
            {#if prepareStageSate}
                <div class="animation-container">
                    <div class="circle-container">
                        <div class="inner-circle" class:animate={animateCircles}></div>
                        <div class="outer-circle" class:animate={animateCircles}></div>
                    </div>
                </div>
                {#if animateCircles} 
                    <script>
                        startAnimation(); 
                    </script>
                {/if}
            {/if}
        </div>
        <div class="pipelineStage" on:click={() => startTestStage(overviewData.workspace.id, overviewData.workspace.dataCenterId)} role="presentation" style="background-color: {testStageSuccess === 'success' ? 'green' : (testStageSuccess === 'failure' ? 'red' : 'inherit')}">
            <div class="pipeline-info">
                <svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill="white" fill-rule="evenodd" clip-rule="evenodd" d="M2.8957 3.93327V5.96872H4.98318V3.93327H2.8957ZM2.5957 2.63327C2.04342 2.63327 1.5957 3.08098 1.5957 3.63327V6.26872C1.5957 6.821 2.04342 7.26872 2.5957 7.26872H5.28318C5.83547 7.26872 6.28318 6.821 6.28318 6.26872V3.63327C6.28318 3.08099 5.83547 2.63327 5.28318 2.63327H2.5957Z"></path>
                    <path fill="white" fill-rule="evenodd" clip-rule="evenodd" d="M7.56638 8.99432C7.83524 9.2322 7.86034 9.64299 7.62246 9.91185L4.39101 13.564C4.27195 13.6986 4.10251 13.7778 3.92293 13.783C3.74334 13.7882 3.56962 13.7188 3.44301 13.5913L1.79428 11.9313C1.54131 11.6765 1.54272 11.265 1.79743 11.012C2.05214 10.7591 2.46369 10.7605 2.71666 11.0152L3.87683 12.1833L6.64886 9.0504C6.88674 8.78155 7.29753 8.75644 7.56638 8.99432Z"></path>
                    <path fill="white" fill-rule="evenodd" clip-rule="evenodd" d="M7.1958 4.95096C7.1958 4.59198 7.48682 4.30096 7.8458 4.30096H14.0958C14.4548 4.30096 14.7458 4.59198 14.7458 4.95096C14.7458 5.30995 14.4548 5.60096 14.0958 5.60096H7.8458C7.48682 5.60096 7.1958 5.30995 7.1958 4.95096Z"></path>
                    <path fill="white" fill-rule="evenodd" clip-rule="evenodd" d="M7.1958 12.0447C7.1958 11.6857 7.48682 11.3947 7.8458 11.3947H14.0958C14.4548 11.3947 14.7458 11.6857 14.7458 12.0447C14.7458 12.4036 14.4548 12.6947 14.0958 12.6947H7.8458C7.48682 12.6947 7.1958 12.4036 7.1958 12.0447Z"></path>
                </svg>
                <div class="pipelineStageTitle">Test</div>
            </div>
            {#if testStageSate}
                <div class="animation-container">
                    <div class="circle-container">
                        <div class="inner-circle" class:animate={animateCircles}></div>
                        <div class="outer-circle" class:animate={animateCircles}></div>
                    </div>
                </div>
                {#if animateCircles} 
                    <script>
                        startAnimation(); 
                    </script>
                {/if}
            {/if}
        </div>
        <div class="pipelineStage" on:click={() => startRunStage(overviewData.workspace.id, overviewData.workspace.dataCenterId)} role="presentation" style="background-color: {runStageSuccess === 'success' ? 'green' : (runStageSuccess === 'failure' ? 'red' : 'inherit')}">
            <div class="pipeline-info">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M6.50194 4.13286C6.81243 3.95452 7.19458 3.9558 7.50387 4.13622L20.5039 11.7196C20.8218 11.905 21.0122 12.2502 20.9994 12.6181C20.9866 12.986 20.7727 13.3171 20.4426 13.48L7.44261 19.8967C7.13265 20.0497 6.76565 20.0318 6.47208 19.8493C6.17851 19.6668 6 19.3457 6 19V5C6 4.64193 6.19145 4.3112 6.50194 4.13286ZM8 6.74104V17.3912L17.8895 12.5099L8 6.74104Z" fill="white"></path>
                </svg>
                <div class="pipelineStageTitle">Run</div>
            </div>
                {#if runStageSate}
                    <div class="animation-container">
                        <div class="circle-container">
                            <div class="inner-circle" class:animate={animateCircles}></div>
                            <div class="outer-circle" class:animate={animateCircles}></div>
                        </div>
                    </div>
                    {#if animateCircles} 
                        <script>
                            startAnimation(); 
                        </script>
                    {/if}
                {/if}
        </div>
    </div>

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
        <a href='{workspaceURL}' class="openDeploymentButton">
            <span>Open deployment</span>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M1.17188 1.7873C1.17188 1.51807 1.39014 1.2998 1.65937 1.2998H10.343C10.6122 1.2998 10.8305 1.51807 10.8305 1.7873V7.73631C10.8305 8.00555 10.6122 8.22381 10.343 8.22381H1.65937C1.39014 8.22381 1.17188 8.00555 1.17188 7.73631V1.7873ZM2.14687 2.2748V7.24881H9.85551V2.2748H2.14687Z"></path>
                <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M6.63516 7.65234V9.84527H5.66016V7.65234H6.63516Z"></path>
                <path fill="currentColor" fill-rule="evenodd" clip-rule="evenodd" d="M3.51953 9.6623C3.51953 9.39307 3.73779 9.1748 4.00703 9.1748H8.28481C8.55405 9.1748 8.77231 9.39307 8.77231 9.6623C8.77231 9.93154 8.55405 10.1498 8.28481 10.1498H4.00703C3.73779 10.1498 3.51953 9.93154 3.51953 9.6623Z"></path>
            </svg>
        </a>
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
                <p class="spaceForLink">please use this link</p>
                <a href="https://github.com/login/device">https://github.com/login/device</a>
            </div>
            <div class="codeProviderInside">
                <p>and use this code</p>
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
        </div>
    {/if}

    {#if activeWorkspace === true && workspaceDeployed === true && connectedWorkspace === false}
        <div class="codeProvider">
            <div class="codeProviderInside">
                <p class="spaceForLink">Workspace is connected</p>
                <button on:click= {() => openTunnel(overviewData.workspace.id, overviewData.workspace.name, overviewData.workspace.dataCenterId, overviewData.workspace.teamId)}> open connection</button>
            </div>
        </div>
    {/if}
</div>