<script>
    import { onMount } from "svelte";
    import * as vscode from "vscode";
    import "vscode-webview"

    let teamArray = [];
    let user = {};
    let workspaceArray = [];

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
            {#if workspaceArray[team.id]}
                {#each workspaceArray[team.id] as workspace}
                    <p>{workspace.name}</p>
                    <!-- Weitere zusätzliche Informationen für den Workspace -->
                    <!-- Sie können hier weitere Daten wie dataCenterId, gitUrl, etc. rendern -->
                {/each}
            {/if}
        </div>
        <!--Trennstrich-->
        <hr class="Trennstrich">
    {/each}
      
      
      
    
</div>
