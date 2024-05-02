<script>
    import { onMount } from "svelte";
    import * as vscode from "vscode";
    import "vscode-webview"

    let teamArray = [];
    let user = {};
    let workspaceArray = [];
    let texti = '';
    let code = '';
    let workspaceToConnect = '';
    let activeWorkspaces = [];

    function listTeams() {
        vscode.postMessage({
            type: 'listTeams',
            value: {
            }
        });
    }

    function openSocket(workspaceId, workspaceName) {
        vscode.postMessage({
            type: 'opensocket',
            value: {
                workspaceId: workspaceId,
                workspaceName: workspaceName
            }
        });
    }

    function openTunnel() {
        vscode.postMessage({
            type: 'openTunnel',
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

    onMount(listTeams);
    onMount(getUserData);
    onMount(getWorkspaces);
    onMount(getActiveWorkspaces);

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
                    code = message.value.code;
                    workspaceToConnect = message.value.state;
                    console.log(`${code} type user: ${typeof code}`);
                    break;
                case 'is connected':
                    // define code which will affect the DOM depending on the message
                    workspaceToConnect = '';
                    activeWorkspaces = message.value.activeTunnels;
                    console.log(`activeWorkspaces: ${activeWorkspaces}`);
                    break;
                
            }
            console.log(`teamArray: ${workspaceArray}`);
        });    
    });

    function toggleAccordion(teamId) {
        const teamIndex = teamArray.findIndex(team => team.id === teamId);
        teamArray[teamIndex].open = !teamArray[teamIndex].open;
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
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
    }

    .codeProvider {
        display: flex;
        flex-direction: column;
        justify-content:space-evenly;
        gap: 10px;
        border: 1px solid white;
        border-radius: 5px;
        padding: 4px;
        margin: 30px;
    }

    .codeProviderInside {
        display: flex;
        flex-direction: column;
        font-size: 15px;
    }

    .spaceForLink {
        margin-bottom: 5px;
    }

    .accordion-content {
        display: none;
    }
    .accordion-content.show {
        display: block;
    }

    .workspace-span {
        font-size: 20px;
        margin-right: 15px;
    }

    .icon {
        font-size: 24px; /* Größe des Icons */
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
                    <span>▲</span>
                {:else}
                    <span>▼</span>
                {/if}
                
            </div>
            <!-- Zugriff auf zusätzliche Daten mit team.id als Schlüssel -->
            <div class="workspaceList accordion-content" class:show={team.open}>
                {#if workspaceArray[team.id]}
                    {#each workspaceArray[team.id] as workspace}
                        <div class="workspaceBox">
                            
                            <p class="workspace"><span class="workspace-span">•</span>{workspace.name}</p>
                            <!-- Weitere zusätzliche Informationen für den Workspace -->
                            <!-- Sie können hier weitere Daten wie dataCenterId, gitUrl, etc. rendern -->
                            <button class="connect" on:click={() => openSocket(workspace.id, workspace.name)}>connect</button>    
                        </div>
                        {#if workspaceToConnect === workspace.id}
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
                        {#if activeWorkspaces.includes(workspace.id)}
                            <div class="codeProvider">
                                <div class="codeProviderInside">
                                    <p class="spaceForLink">You are connected to this workspace</p>
                                    <p>open connection here</p>
                                    <button on:click= {() => openTunnel()}> open connection
                                    </button>
                                </div>
                            </div>
                        {/if}
                    {/each}
                {/if}
            </div>
        </div>
        <!--Trennstrich-->
        <hr class="Trennstrich">
    {/each}    
</div>
