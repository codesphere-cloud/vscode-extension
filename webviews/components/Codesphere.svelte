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
    // onMount(testAccessToken);
    onMount(getCurrentWorkspace);

    onMount(() => {
        
        window.addEventListener('message', event => {
            const message = event.data; // The JSON data our extension sent
            console.log(`message received: ${JSON.stringify(message)}`);
            switch (message.type) {
                case 'listTeams':
                    teamArray = JSON.parse(message.value);
                    teamArray = [...teamArray];
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
        border-radius: 2px;
        object-fit: cover;
    }

    .teams {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        font-weight: 600;
    }

    /* .teamTree > div {
        margin-bottom: 10px;
        margin-top: 10px;
    } */

    .teamTree {
        padding: 8px 0px 8px 0px;
        border-bottom: 1px solid #80808026;
        display: flex;
        flex-direction: column;
        height: fit-content
    }

    /* .Trennstrich {
        border-bottom: .5px solid var(--sidebar-item-border-color)
    } */

    .userInfo {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 8px 0px 16px 0px;
    }

    .userAvatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        object-fit: cover;
    }

    .workspace {
        cursor: pointer;
        display: flex; 
        align-items: center; 
        transition: color .2s;
    }

    .workspace:hover {
        color: white!important;
    }

    .workspaceList {
        position: relative;
        overflow-x: auto;
        white-space: nowrap;
        padding-left: 16px;
    }

    .workspaceList:nth-child(2) {
        padding-top:8px
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
        display: flex;
        flex-direction: column;
        gap: 8px;
        
    }

    .isActiveNote {
        font-style: italic;
        font-size: 5px;
    }

    .height-indicator {
        position: absolute;
        left: 8px;
        height: 100%;
        border-left: .5px solid #80808026;;
    }


</style>

<div>
    <div class="userInfo">
        <h2>Your Teams</h2>
        <img src={user.avatarURL} alt="User Avatar" class="userAvatar">
    </div>

    {#each teamArray as team (team.id)}
        <div class="teamTree" key={team.id}>
            <div class="teams" on:click={() => toggleAccordion(team.id)} role="presentation">
                <div style="display:flex">
                    <!-- Toggle arrow icon -->
                    {#if team.open}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6" width="16px" height="16px">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                    </svg>                   
                    {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6" width="16px" height="16px">
                        <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                    </svg>                 
                    {/if}
                    <span class="">{team.name}</span>
                </div>

            {#if team.avatarUrl}
                <img src={team.avatarUrl} alt="Team Avatar" class="workspaceAvatar">
            {:else}
                <img src="https://cdn-icons-png.flaticon.com/512/4231/4231148.png" alt="Default Avatar" class="workspaceAvatar">
            {/if}
            </div>
            <div class="workspaceList accordion-content" class:show={team.open}>
                <div class="height-indicator"></div>
                {#if workspaceArray[team.id]}
                    {#each workspaceArray[team.id] as workspace}
                        <div class="workspaceBox">
                            <div class="workspaceAccordion" on:click={() => openOverview(workspace.id, team.id) } role="presentation">
                                <h4 class="workspace" style="color: {activeWorkspaces[workspace.id] ? 'green' : 'inherit'}">
                                      
                                    <span>{workspace.name}</span>
                                    {#if currentWorkspace === workspace.id}
                                        <span class="isActiveNote">active Tunnel</span>
                                    {/if}
                                    </h4>
                                    <!-- <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6"  width="16px" height="16px">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                                      </svg> -->
                            </div>
                        </div>
                    {/each}
                {/if}
            </div>
        </div>
        <!--Trennstrich-->
        <!-- <hr class="Trennstrich"> -->
    {/each}    
</div>