<script>
    import { onMount } from "svelte";
    import * as vscode from "vscode";
    import "vscode-webview"

    let teamArray = [];
    let user = {};
    let workspaceArray = [];
    let texti = '';

    function listTeams() {
        vscode.postMessage({
            type: 'listTeams',
            value: {
            }
        });
    }

    function openSocket() {
        vscode.postMessage({
            type: 'opensocket',
            value: {
            }
        });
    }

    function sendTerminal() {
        vscode.postMessage({
            type: 'sendTerminal',
            value: texti
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

    onMount(listTeams);
    onMount(getUserData);
    onMount(getWorkspaces);

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
                
            }
            console.log(`teamArray: ${workspaceArray}`);
        });
    });

    function toggleDropdown(event) {
        console.log(event.target);
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
    }

    .workspaceList {
        display: flex;
        flex-direction: column;
        gap: 10px;
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
        gap: 10px;
    }

    .form-container {
    display: flex;
    flex-direction: column;
    justify-content: left;
    gap: 10px;
    max-width: 400px;
}


.email-container {
        position: relative;
        width: 100%;
        margin-bottom: 10px;
    }

    .icon-left {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none; /* Damit das Icon nicht anklickbar ist */
    }

    .icon-left svg {
        height: 20px; /* Hier können Sie die Höhe des Icons anpassen */
        width: auto;
    }

    .email-input,
    .password-input {
        padding-left: 40px; /* Platz für das Icon */
    }
</style>

<div>
    <div class="userInfo">
        <img src={`https://storage.googleapis.com/codesphere-avatars/users/${user.userId}/${user.avatarId}`} alt="User Avatar" class="userAvatar">
        <h1>{user.firstName} {user.lastName}</h1>
    </div>

    {#each teamArray as team (team.id)}
        <div class="teamTree" key={team.id}>
            <div class="teams">
                {#if team.avatarUrl}
                <img src={team.avatarUrl} alt="Team Avatar" class="workspaceAvatar">
            {:else}
                <img src="https://cdn-icons-png.flaticon.com/512/4231/4231148.png" alt="Default Avatar" class="workspaceAvatar">
            {/if}
                <h2>{team.name}</h2>
            </div>
            <!-- Zugriff auf zusätzliche Daten mit team.id als Schlüssel -->
            <div class="workspaceList">
                {#if workspaceArray[team.id]}
                    {#each workspaceArray[team.id] as workspace}
                        <div class="workspaceBox">
                            <a class="workspace" on:click={toggleDropdown} on:keydown|preventDefault={toggleDropdown} role="button" href="#">{workspace.name}</a>
                            <!-- Weitere zusätzliche Informationen für den Workspace -->
                            <!-- Sie können hier weitere Daten wie dataCenterId, gitUrl, etc. rendern -->
                            <button class="connect" on:click={() => connectTunnel(workspace.name)}>connect</button>                        </div>
                    {/each}
                {/if}
            </div>
        </div>
        <!--Trennstrich-->
        <hr class="Trennstrich">
    {/each}
      

    <div class="form-container">
        <div class="email-container">
            <i class="icon-left">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" height="16" width="16">
                    <g clip-path="url(#clip0)">
                        <path fill="#814BF6" d="M14 1H2C1.46957 1 0.960859 1.21071 0.585786 1.58579C0.210714 1.96086 0 2.46957 0 3L0 3.4L8 7.9L16 3.5V3C16 2.46957 15.7893 1.96086 15.4142 1.58579C15.0391 1.21071 14.5304 1 14 1Z"></path>
                        <path fill="#814BF6" d="M7.5 9.89995L0 5.69995V13C0 13.5304 0.210714 14.0391 0.585786 14.4142C0.960859 14.7892 1.46957 15 2 15H14C14.5304 15 15.0391 14.7892 15.4142 14.4142C15.7893 14.0391 16 13.5304 16 13V5.69995L8.5 9.89995C8.3424 9.96919 8.17214 10.0049 8 10.0049C7.82786 10.0049 7.6576 9.96919 7.5 9.89995Z"></path>
                    </g>
                    <defs>
                        <clipPath id="clip0">
                            <rect fill="white" height="16" width="16"></rect>
                        </clipPath>
                    </defs>
                </svg>
            </i>
            <input placeholder="Email" autocomplete="email" type="email" class="email-input" id="email-signin" bind:value={texti}>
        </div>
    </div>
    <button type="submit" id="signin-commit-button" on:click={openSocket}>
        execute
    </button>
    <button type="submit" id="signin-commit-button" on:click={sendTerminal}>
        send Terminal
    </button>
      
    
</div>
