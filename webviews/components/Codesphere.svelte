<script>
    import { onMount } from "svelte";
    import * as vscode from "vscode";
    import "vscode-webview"

    let teamArray = [];
    let user = {};
    let workspaceArray = [];
    let workspaceToConnect = [];
    let activeWorkspaces = {};
    let creatingTunnel = {};
    let notDeployedWorkspaces = [];
    let indexOfWorkspace;
    let currentWorkspace;

    function openOverview(workspaceId, teamId) {
        vscode.postMessage({
            type: 'openOverview',
            value: {
                teamId: teamId,
                workspaceId: workspaceId,
            }
        });
    }

    function listTeams() {
        vscode.postMessage({
            type: 'listTeams',
            value: {
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

    function getCurrentWorkspace() {
        vscode.postMessage({
            type: 'getConnectedWorkspace',
            value: {
            }
        });
    }

    onMount(listTeams);
    onMount(getUserData);
    onMount(getWorkspaces);
    onMount(getActiveWorkspaces);
    onMount(testAccessToken);
    onMount(getCurrentWorkspace);

    onMount(() => {
        
        window.addEventListener('message', event => {
            const message = event.data; // The JSON data our extension sent
            console.log(`message received: ${JSON.stringify(message)}`);
            switch (message.type) {
                case 'listTeams':
                    teamArray = JSON.parse(message.value);
                    break;
                case 'getWorkspaces':
                    workspaceArray = JSON.parse(message.value);
                    
                    break;
                case 'getUserData':
                    user = JSON.parse(message.value);
                    break;
                case 'activeWorkspaces':
                    activeWorkspaces = message.value;
                    break;
                case 'gitHubAuth':
                    code[message.value.state] = message.value.code; 
                    workspaceToConnect = [...workspaceToConnect, message.value.state];
                    break;
                case 'is connected':
                    // define code which will affect the DOM depending on the message
                    activeWorkspaces = message.value.activeTunnels;
                    activeWorkspaces = {...activeWorkspaces};
                    
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
                    } 
                    break;
                case 'loadingFinished':
                    delete creatingTunnel[message.value.workspaceId];
                    creatingTunnel = {...creatingTunnel};
                    break;
                case `resourcesDeployed`:
                    indexOfWorkspace = notDeployedWorkspaces.indexOf(message.value.workspaceId);
                    notDeployedWorkspaces.splice(indexOfWorkspace, 1);
                    notDeployedWorkspaces = [...notDeployedWorkspaces];
                    break;
                case 'removeWorkspace':
                    delete activeWorkspaces[message.value.workspaceId];
                    vscode.postMessage({
                        type: 'getActiveWorkspaces',
                        value: {
                        }
                    });
                    break;
                case 'connectedWorkspace':
                    currentWorkspace = message.value;
                    break;
            }
        });    
    });

    function toggleAccordion(teamId) {
        const teamIndex = teamArray.findIndex(team => team.id === teamId);
        teamArray[teamIndex].open = !teamArray[teamIndex].open;
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

    .workspaceBox {
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        margin-bottom: 5px;
        overflow-x: auto;
        white-space: nowrap;
    }

    .accordion-content {
        display: none;
    }
    .accordion-content.show {
        display: block;
    }

    .isActiveNote {
        font-style: italic;
        font-size: 5px;
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
                            <div class="workspaceAccordion" on:click={() => openOverview(workspace.id, team.id) } role="presentation">
                                <p class="workspace" style="color: {activeWorkspaces[workspace.id] ? 'green' : 'inherit'}">
                                    <span>►</span>
                                    {workspace.name}
                                    {#if currentWorkspace === workspace.id}
                                        <span class="isActiveNote">active Tunnel</span>
                                    {/if}
                                </p>
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