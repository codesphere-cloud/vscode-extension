<script>
    import { onMount } from "svelte";
    import * as vscode from "vscode";
    import "vscode-webview"

    let teamArray = [];
    let user = {};
    let workspaceArray = [];
    let code = {};
    let workspaceToConnect = [];
    let activeWorkspaces = {};
    let animateCircles = false; // Zustand für die Animation
    let creatingTunnel = {};
    let notDeployedWorkspaces = [];
    let indexOfWorkspace;

    function listTeams() {
        vscode.postMessage({
            type: 'listTeams',
            value: {
            }
        });
    }

    // funtion to set up the vscode server on Codesphere if it is not already running
    function openSocket(workspaceId, workspaceName, teamDatacenterId) {
        creatingTunnel[workspaceId] = "Waiting for authorization..."
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

    // function to connect with the workspace
    // check whether a running vscode server process is running on that workspace
    // should also check wheter a on-demand workspace is running just like in toggleWorkspaceAccordion
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

    function getWorkspaces() {
        vscode.postMessage({
            type: 'getWorkspaces',
            value: {
            }
        });
    }

    function getUserData() {
        vscode.postMessage({
            type: 'getUserData',
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

    function testAccessToken() {
        vscode.postMessage({
            type: 'testConnection',
            value: {
            }
        });
    }

    onMount(listTeams);
    onMount(getUserData);
    onMount(getWorkspaces);
    onMount(getActiveWorkspaces);
    onMount(testAccessToken);

    onMount(() => {
        
        window.addEventListener('message', event => {
            const message = event.data; // The JSON data our extension sent
            console.log(`message received: ${JSON.stringify(message)}`);
            switch (message.type) {
                case 'listTeams':
                    // define code which will affect the DOM depending on the message
                    teamArray = JSON.parse(message.value);
                    console.log(`${teamArray} type: ${typeof teamArray}`);
                    teamArray.forEach(team => {
                        console.log(`team: ${JSON.stringify(team)}`);
                    });
                    break;
                case 'getWorkspaces':
                    // define code which will affect the DOM depending on the message
                    console.log(`message.value: ${message.value}`);
                    workspaceArray = JSON.parse(message.value);
                    console.log(`${workspaceArray} type hahaha: ${typeof workspaceArray}`);
                    
                    break;
                case 'getUserData':
                    // define code which will affect the DOM depending on the message
                    user = JSON.parse(message.value);
                    console.log(`${user} type user: ${typeof user}`);
                    break;
                case 'activeWorkspaces':
                    // define code which will affect the DOM depending on the message
                    console.log(`${message.value} type user: ${typeof message.value}`);
                    activeWorkspaces = message.value;
                    break;
                case 'gitHubAuth':
                    // define code which will affect the DOM depending on the message
                    code[message.value.state] = message.value.code; 
                    workspaceToConnect = [...workspaceToConnect, message.value.state];
                    console.log(`${code} type user: ${typeof code}`);
                    break;
                case 'is connected':
                    // define code which will affect the DOM depending on the message
                    activeWorkspaces = message.value.activeTunnels;
                    activeWorkspaces = {...activeWorkspaces};
                    console.log('activeWorkspaces:', JSON.stringify(activeWorkspaces, null, 2));
                    
                    vscode.postMessage({
                        type: 'getActiveWorkspaces',
                        value: {
                        }
                    });
                    
                    break;
                case 'loading':
                    // sets the state of loading for animation
                    creatingTunnel[message.value.workspaceId] = message.value.state;
                    if (message.value.state === 'Setting up server...') {
                        indexOfWorkspace = workspaceToConnect.indexOf(message.value.workspaceId);
                        workspaceToConnect.splice(indexOfWorkspace, 1);
                        workspaceToConnect = [...workspaceToConnect];  // this step is mandatory, so that svelte knows that the Array was updated 
                        // when not doing this, the changes wont be reflected in the UI
                    } 
                    break;
                case 'loadingFinished':
                    // sets the state of loading for animation
                    delete creatingTunnel[message.value.workspaceId];
                    creatingTunnel = {...creatingTunnel};
                    break;
                case `resourcesDeployed`:
                    // sets the state of loading for animation
                    indexOfWorkspace = notDeployedWorkspaces.indexOf(message.value.workspaceId);
                    notDeployedWorkspaces.splice(indexOfWorkspace, 1);
                    notDeployedWorkspaces = [...notDeployedWorkspaces];
                    break;
                case 'removeWorkspace':
                    // sets the state of loading for animation
                    delete activeWorkspaces[message.value.workspaceId];
                    
                    vscode.postMessage({
                        type: 'getActiveWorkspaces',
                        value: {
                        }
                    });
                    break;
            }
            console.log(`teamArray: ${workspaceArray}`);
        });    
    });

    function toggleAccordion(teamId) {
        const teamIndex = teamArray.findIndex(team => team.id === teamId);
        teamArray[teamIndex].open = !teamArray[teamIndex].open;
    }

    function toggleWorkspaceAccordion(teamId, workspaceId, teamDatacenterId) {
        const teamIndex = teamArray.findIndex(team => team.id === teamId);
        const workspaceIndex = workspaceArray[teamId].findIndex(workspace => workspace.id === workspaceId);
        workspaceArray[teamId][workspaceIndex].open = !workspaceArray[teamId][workspaceIndex].open;

        notDeployedWorkspaces = [...notDeployedWorkspaces, workspaceId];

        console.log(`teamDatacenterId: ${teamDatacenterId}`);

        console.log(`notDeployedWorkspaces: ${notDeployedWorkspaces}`);

        // get this workspace alive when it is on-demand and inactive
        vscode.postMessage({
            type: 'activateWorkspace',
            value: {
                workspaceId: workspaceId,
                datacenterId: teamDatacenterId
            }
        });
    }

    function copyCode() {
        // Code-Element auswählen
        var codeBox = document.getElementById("codeBox");

        // Text im Code-Element auswählen
        var selection = window.getSelection();
        var range = document.createRange();
        range.selectNodeContents(codeBox);
        selection.removeAllRanges();
        selection.addRange(range);

        // Text in die Zwischenablage kopieren
        document.execCommand("copy");

        // Selektion aufheben
        selection.removeAllRanges();

        vscode.postMessage({
            type: 'copycode',
            value: {
            }
        });
    }
    
</script>

<style>
    .workspaceAvatar {
        width: 25px;
        height: 25px;
        border-radius: 20%;
    }

    .teams {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 10px;
        cursor: pointer;
    }

    .teamTree > div {
        margin-bottom: 10px;
        margin-top: 10px;
    }

    .Trennstrich {
        border: 0;
        height: 1px;
        background-image: linear-gradient(to right, rgba(187, 170, 170, 0), rgba(104, 79, 79, 0.75), rgba(122, 111, 111, 0));
    }

    .userInfo {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 10px;
        padding-bottom: 20px;
    }

    .userAvatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
    }

    .workspace {
        margin-left: 40px;
        cursor: pointer;
        font-size: 15px;
        display: flex; /* Flexbox verwenden */
        align-items: center; /* Vertikal zentrieren */
    }

    .workspaceList {
        display: flex;
        flex-direction: column;
        gap: 10px;
        overflow-x: auto;
        white-space: nowrap;
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

    .workspaceBox {
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        margin-bottom: 5px;
        overflow-x: auto;
        white-space: nowrap;
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

    .accordion-content {
        display: none;
    }
    .accordion-content.show {
        display: block;
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

    .workspaceAccordion-content {
        display: none;
    }
    .workspaceAccordion-content.show {
        display: block;
    }

    .workspaceAccordion-content {
        display: fley;
        flex-direction: column;
        gap: 5px;
        margin-left: 60px;
        margin-top: 10px;
        margin-bottom: 5px;
    }


</style>

<div>
    <div class="userInfo">
        <img src={`https://storage.googleapis.com/codesphere-avatars/users/${user.userId}/${user.avatarId}`} alt="User Avatar" class="userAvatar">
        <h1>{user.firstName} {user.lastName}</h1>
    </div>

    {#each teamArray as team (team.id)}
        <div class="teamTree" key={team.id}>
            <div class="teams" on:click={() => toggleAccordion(team.id)} role="presentation">
                {#if team.avatarUrl}
                <img src={team.avatarUrl} alt="Team Avatar" class="workspaceAvatar">
            {:else}
                <img src="https://cdn-icons-png.flaticon.com/512/4231/4231148.png" alt="Default Avatar" class="workspaceAvatar">
            {/if}
                
                <h2 class="">{team.name}</h2>
                <!-- Toggle arrow icon -->
                {#if team.open}
                    <span>▼</span>
                {:else}
                    <span>►</span>
                {/if}
                
            </div>
            <div class="workspaceList accordion-content" class:show={team.open}>
                {#if workspaceArray[team.id]}
                    {#each workspaceArray[team.id] as workspace}
                        <div class="workspaceBox">
                            <!-- Hier Workspace-Informationen -->
                            <div class="workspaceAccordion" on:click={() => toggleWorkspaceAccordion(team.id, workspace.id, team.defaultDataCenterId)} role="presentation">
                                <p class="workspace" style="color: {activeWorkspaces[workspace.id] ? 'green' : 'inherit'}">
                                    <!-- Toggle arrow icon -->
                                    {#if workspace.open}
                                        <span>▼</span>
                                    {:else}
                                        <span>►</span>
                                    {/if}
                                    {workspace.name}
                                </p>
                            </div>
                            <div class="workspaceAccordion-content" class:show={workspace.open}>
                                <!-- Hier weitere Details zum Workspace -->
                                <!-- z.B. Buttons, Links usw. -->
                                {#if notDeployedWorkspaces.includes(workspace.id)}
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
                                {#if !creatingTunnel[workspace.id] && !activeWorkspaces[workspace.id] && !notDeployedWorkspaces.includes(workspace.id)}
                                    <button class="connect" on:click={() => openSocket(workspace.id, workspace.name, team.defaultDataCenterId)}>create tunnel</button>
                                {/if} 

                                {#if creatingTunnel[workspace.id]}
                                    <div class="animation-container">
                                        <div class="circle-container">
                                            <div class="inner-circle" class:animate={animateCircles}></div>
                                            <div class="outer-circle" class:animate={animateCircles}></div>
                                        </div>
                                        <p>{creatingTunnel[workspace.id]}</p>
                                    </div>
                                    {#if animateCircles} <!-- Nur wenn die Animation aktiv ist -->
                                        <script>
                                            startAnimation(); // Starte die Animation
                                        </script>
                                    {/if}
                                {/if}


                                {#if workspaceToConnect.includes(workspace.id)}
                                    <div class="codeProvider">
                                        <div class="codeProviderInside">
                                            <p class="spaceForLink">please use this link</p>
                                            <a href="https://github.com/login/device">https://github.com/login/device</a>
                                        </div>
                                        <div class="codeProviderInside">
                                            <p>and use this code</p>
                                            <p class="spaceForLink"></p>
                                            <div class="codeAndIcon">
                                                <p class="codeBox" id="codeBox">{code[workspace.id]}</p>
                                                <div class="icon" on:click={() => copyCode()} role="presentation">
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" width="20" height="20">
                                                        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                {/if}
                                {#if activeWorkspaces[workspace.id] && !notDeployedWorkspaces.includes(workspace.id)}
                                    <div class="codeProvider">
                                        <div class="codeProviderInside">
                                            <p class="spaceForLink">Workspace is connected</p>
                                            <button on:click= {() => openTunnel(workspace.id, workspace.name, team.defaultDataCenterId)}> open connection
                                            </button>
                                        </div>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
        <!--Trennstrich-->
        <hr class="Trennstrich">
    {/each}    
</div>