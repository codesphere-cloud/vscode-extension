<script>
    import { onMount } from "svelte";
    import * as vscode from "vscode";
    import AnsiToHtml from 'ansi-to-html';
    import "vscode-webview";

    

    let CIArray = {};
    let prepareStageSteps = [];
    let testStageSteps = [];
    let runStageSteps = [];
    let currentWorkspace;
    let teamId;
    let dcId;
    let selectedStage = 'prepare';
    let showPrepare = false;
    let showTest = false;
    let showRun = false;
    let animateCircles = false; 
    $: prepareStageSate = false;
    let prepareStageSuccess = ''; 
    $: testStageSate = false;
    let testStageSuccess = '';
    $: runStageSate = false;
    let runStageSuccess = '';
    let isActiveprepare = true;
    let isActivetest = false;
    let isActiveRun = false;
    let stagelength;
    let stageRunning = [];


    onMount(getCurrentWorkspace);

    function startCiStage(workspaceId, dataCenterId, stage) {
        if (stage == "prepare") {
            stageRunning = [...stageRunning, stage]
            prepareStageSate = true;
            prepareStageSuccess = '';
            stagelength = prepareStageSteps.length
            prepareStageSteps.forEach((step, index) => {
                if (step.log) {
                    step.log = '';
                }
                step.open = false
            });

            if (stagelength > 0) {
                prepareStageSteps[0].open = true
            }
        }
        if (stage == "test") {
            stageRunning = [...stageRunning, stage]
            testStageSate = true;
            testStageSuccess = '';
            stagelength = testStageSteps.length

            if (stagelength > 0) {
                testStageSteps[0].open = true
            }
        }
        if (stage == "run") {
            stageRunning = [...stageRunning, stage]
            runStageSate = true;
            runStageSuccess = '';
            stagelength = runStageSteps.length

            if (stagelength > 0) {
                runStageSteps[0].open = true
            }
        }
        vscode.postMessage({
            type: 'startCiStage',
            value: {
                workspaceId: workspaceId,
                stage: stage,
                dataCenterId: dataCenterId,
                stepcount: stagelength
            }
        });
    }

    function stopCiStage(workspaceId, dataCenterId, stage) {
        vscode.postMessage({
            type: 'stopCiStage',
            value: {
                workspaceId: workspaceId,
                stage: stage,
                dataCenterId: dataCenterId
            }
        });
        stageRunning = stageRunning.filter(item => item !== stage)
    };

    function toggleActive(stage) {
        if (stage === 'prepare') {
            isActiveprepare = true;
            isActivetest = false;
            isActiveRun = false;
            selectedStage = 'prepare';
            showPrepare = true;
            showTest = false;
            showRun = false;
        } else if (stage === 'test') {
            isActiveprepare = false;
            isActivetest = true;
            isActiveRun = false;
            selectedStage = 'test';
            showPrepare = false;
            showTest = true;
            showRun = false;
        } else if (stage === 'run') {
            isActiveprepare = false;
            isActivetest = false;
            isActiveRun = true;
            selectedStage = 'run';
            showPrepare = false;
            showTest = false;
            showRun = true;
        }
    }

    onMount(() => {
        window.addEventListener('message', event => {
            const message = event.data; 
            switch (message.type) {
                case 'currentWorkspace':
                    currentWorkspace = message.value.currentWorkspace;
                    teamId = message.value.teamId;
                    dcId = message.value.dcId;

                    console.log("currentWorkspace", currentWorkspace);
                    console.log("teamId", teamId);
                    console.log("dcId", dcId);
                    
                    vscode.postMessage({
                        type: 'getCiPipelineStages',
                        value: {
                            dataCenterId: dcId,
                            workspaceId: currentWorkspace
                        }
                    });

                    break;
                
                case 'setActionButtion':
                    stageRunning = stageRunning.filter(item => item !== message.value.stage)
                    if (message.value.stage === 'prepare') {
                        prepareStageSate = false
                    }
                    if (message.value.stage === 'test') {
                        testStageSate = false
                    }
                    if (message.value.stage === 'run') {
                        runStageSate = false
                    }
                    break;

                case 'CIPipelineStages':
                    CIArray = JSON.parse(message.value.CIArray);
                    prepareStageSteps = CIArray.prepare.steps;
                    testStageSteps = CIArray.test.steps;
                    runStageSteps = CIArray.run.steps;

                    vscode.postMessage({
                        type: 'getCiStageStatus',
                        value: {
                            workspaceId: currentWorkspace,
                            datacenterId: dcId
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
                    if (message.value.dynamic) {
                        console.log("dynamic", message.value.dynamic);
                        switch (message.value.dynamic) {
                            case 'prepare':
                                prepareStageSuccess = message.value.prepare.state;
                                prepareStageSteps.forEach(( step, index) => {
                                    Object.assign(step, message.value.prepare.steps[index]);
                                });
                                if (prepareStageSuccess === 'running') {
                                    prepareStageSate = true;
                                    stageRunning = [...stageRunning, 'prepare']

                                }
                                if (prepareStageSuccess === 'success' || prepareStageSuccess === 'failure') {
                                    prepareStageSate = false;
                                }
                                break;
                            case 'test':
                                testStageSuccess = message.value.test.state;
                                testStageSteps.forEach(( step, index) => {
                                    Object.assign(step, message.value.test.steps[index]);
                                });
                                if (testStageSuccess === 'running') {
                                    testStageSate = true;
                                    stageRunning = [...stageRunning, 'test']

                                }
                                if (testStageSuccess === 'success' || testStageSuccess === 'failure') {
                                    testStageSate = false;
                                }
                                break;
                            case 'run':
                                runStageSuccess = message.value.run.state;
                                runStageSteps.forEach(( step, index) => {
                                    Object.assign(step, message.value.run.steps[index]);
                                });
                                if (runStageSuccess === 'running') {
                                    runStageSate = true;
                                    stageRunning = [...stageRunning, 'run']
                                }
                                if (runStageSuccess === 'success' || runStageSuccess === 'failure') {
                                    runStageSate = false;
                                }
                                break;
                        }
                        break;
                    }
                    
                    if (message.value.dynamic === false && message.value.prepare.state){
                        console.log("prepare dynamic false", message.value.prepare.state);
                        prepareStageSuccess = message.value.prepare.state;
                        prepareStageSteps.forEach(( step, index) => {
                            Object.assign(step, message.value.prepare.steps[index]);
                        });
                        if (prepareStageSuccess === 'running') {
                            prepareStageSate = true;
                            stageRunning = [...stageRunning, 'prepare']

                        }
                        if (prepareStageSuccess === 'success' || prepareStageSuccess === 'failure') {
                            prepareStageSate = false;
                        }
                    }

                    if (message.value.dynamic === false && message.value.test.state){
                        console.log("test dynamic false", message.value.test.state);
                        testStageSuccess = message.value.test.state;
                        testStageSteps.forEach(( step, index) => {
                            Object.assign(step, message.value.test.steps[index]);
                        });
                        if (testStageSuccess === 'running') {
                            testStageSate = true;
                            stageRunning = [...stageRunning, 'test']

                        }
                        if (testStageSuccess === 'success' || testStageSuccess === 'failure') {
                            testStageSate = false;
                        }
                    }

                    if (message.value.dynamic === false && message.value.run.state){
                        console.log("run dynamic false", message.value.run.state);
                        runStageSuccess = message.value.run.state;
                        runStageSteps.forEach(( step, index) => {
                            Object.assign(step, message.value.run.steps[index]);
                        });
                        if (runStageSuccess === 'running') {
                            runStageSate = true;
                            stageRunning = [...stageRunning, 'run']
                        }
                        if (runStageSuccess === 'success' || runStageSuccess === 'failure') {
                            runStageSate = false;
                        }
                    }
                    
                    showPrepare = true;
                    selectedStage = 'prepare';
                    break;
                
                case 'updateCiStageStatus':
                    let stage = message.value.stage;
                    let status = message.value.status;
                    let state = message.value.state; // running, success, failure
                    if (stage === 'prepare') {
                        let foundWaiting = false;
                        let openIndex;
                        let closeIndex;
                        prepareStageSteps.forEach((step, index) => {
                            let statusFields = status[index];
                            
                            for (let key in statusFields) {
                                if (statusFields.hasOwnProperty(key) && step.hasOwnProperty(key)) {
                                    step[key] = statusFields[key];
                                }
                            }

                            if (!foundWaiting && step.state === "running") {
                                openIndex = index
                                closeIndex = index - 1
                                foundWaiting = true; ;
                                prepareStageSteps[closeIndex].open = false;
                                prepareStageSteps[closeIndex + 1].open = true
                            }
                        });
                        
                        prepareStageSteps = [...prepareStageSteps];
                    } else if (stage === 'test') {
                        let foundWaiting = false;
                        let openIndex;
                        let closeIndex;
                        testStageSteps.forEach((step, index) => {
                            let statusFields = status[index];
                            
                            for (let key in statusFields) {
                                if (statusFields.hasOwnProperty(key) && step.hasOwnProperty(key)) {
                                    step[key] = statusFields[key];
                                }
                            }

                           
                            if (!foundWaiting && step.state === "running") {
                                openIndex = index
                                closeIndex = index - 1
                                foundWaiting = true; 
                                testStageSteps[closeIndex].open = false;
                                testStageSteps[closeIndex + 1].open = true;
                            }
                        });
                        testStageSteps = [...testStageSteps];
                    } else if (stage === 'run') {
                        let foundWaiting = false;
                        let openIndex;
                        let closeIndex;
                        runStageSteps.forEach((step, index) => {
                            let statusFields = status[index];
                            
                            for (let key in statusFields) {
                                if (statusFields.hasOwnProperty(key) && step.hasOwnProperty(key)) {
                                    step[key] = statusFields[key];
                                }
                            }

                            if (!foundWaiting && step.state === "running") {
                                openIndex = index
                                closeIndex = index - 1
                                foundWaiting = true; 
                                runStageSteps[closeIndex].open = false;
                                runStageSteps[closeIndex + 1].open = true;
                            }
                        });
                        runStageSteps = [...runStageSteps];
                    }

                    break;
                
                case 'updateCiPipelineLogs':
                    let stepIndex = message.value.step;
                    let logText = message.value.log;
                    let stages = message.value.stage;

                    const options = {
                        fg: '#FFF',
                        bg: '#000',
                        newline: false,
                        escapeXML: false,
                        stream: false
                    };
                    const ansiConverter = new AnsiToHtml(options);

                    if (stages === 'prepare') {
                        if (!prepareStageSteps[stepIndex].log) {
                            prepareStageSteps[stepIndex].log = ""; 
                        }
                        logText = parseLogs(logText);
                        let testLog = ansiConverter.toHtml(logText);
                        prepareStageSteps[stepIndex].log += testLog;
                        prepareStageSteps = [...prepareStageSteps];
                    } else if (stages === 'test') {
                        if (!testStageSteps[stepIndex].log) {
                            testStageSteps[stepIndex].log = ""; 
                        }
                        testStageSteps[stepIndex].log += ansiConverter.toHtml(logText);
                        testStageSteps = [...testStageSteps];
                    } else if (stages === 'run') {
                        if (!runStageSteps[stepIndex].log) {
                            runStageSteps[stepIndex].log = ""; // Initialisierung des Arrays, falls es noch nicht existiert
                        }
                        runStageSteps[stepIndex].log += ansiConverter.toHtml(logText);
                        runStageSteps = [...runStageSteps];
                    }
            
                };
        });
    });

        

    function toggleAccordion(index, stage) {
        if (stage == 'prepare') {
            if (index >= -1 && index < prepareStageSteps.length +1) {
                prepareStageSteps[index].open = !prepareStageSteps[index].open;
            }
        }

        if (stage == 'test') {
            if (index >= 0 && index < testStageSteps.length +1) {
                testStageSteps[index].open = !testStageSteps[index].open;
            }
        }

        if (stage == 'run') {
            if (index >= 0 && index < runStageSteps.length +1) {
                runStageSteps[index].open = !runStageSteps[index].open;
            }
        }
    }



    function getCurrentWorkspace() {
        vscode.postMessage({
            type: 'currentWorkspace',
            value: {
            }
        });
    }

    function parseLogs(logs) {
        logs = logs.replace(/\n/g, '<br>');
        return logs;
    }

</script>

<style>
    .log {
        font-size: 12px;
        margin: 0 0 0 0;
        display: flex;
        flex-direction: column;
        align-items: start;
    }
    .circle-container {
        position: relative;
        width: 20px; 
        height: 20px;
        display: flex;
        justify-content: center;
        align-items: center; 
    }

    .circle-container-stages {
        position: relative;
        width: 40px; 
        height: 40px;
        display: flex;
        justify-content: center;
        align-items: center; 
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
        width: 10px; 
        height: 10px; 
        z-index: 1;
        animation-name: inner-bounce;
        animation-iteration-count: infinite;
    }

    .outer-circle {
        width: 10px; 
        height: 10px; 
        z-index: 0;
        animation-name: outer-bounce;
        animation-iteration-count: infinite;
    }

    @keyframes inner-bounce {
        0%, 100% {
        width: 10px; 
        height: 10px; 
        }
        50% {
        width: 5px; 
        height: 5px; 
        }
    }

    @keyframes outer-bounce {
        0%, 100% {
        width: 10px; 
        height: 10px; 
        }
        50% {
        width: 20px; 
        height: 20px; 
        }
    }

    .loader {
    width: 70%;
    height: 70%;
    border: 2px solid rgba(128, 128, 128, 0.2);
    border-bottom-color: #814BF6;
    border-radius: 50%;
    display: inline-block;
    box-sizing: border-box;
    animation: rotation 2s linear infinite;
    }

    @keyframes rotation {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
    } 

    .animation-container {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: start;
        gap: 2px;
    }

    .title-container {
        display: flex;
        margin-bottom: 10px;
        align-items: center;
        justify-content: start;
        gap: 10px;
    }

    .codesphere {
        max-width: 45px;    
    }

    .title {
        font-size: 1.8rem;
        font-weight: 700;
        color: white;
    }

    .ci-pipelineBox {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        margin-top: 10px;
        width: 300px;
    }

    .pipelineStageTitle {
        font-size: 15px;
        font-weight: bold;
    }

    .pipelineStage::before {
        content: "";
        position: absolute;
        top: 50%;
        right: 2px; /* Adjust as needed */
        width: 0;
        height: 0;
        border-style: solid;
        border-width: 5px 0 5px 5px;
        border-color: transparent transparent transparent white;
        opacity: 0;
        transform: translateY(-50%);
    }

    .pipelineStage:hover::before,
    .pipelineStage.active::before {
        opacity: 1;
    }

    .pipelineStage {
        position: relative;
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

    .pipelineStage::after {
        content: "";
        position: absolute;
        top: 0;
        right: 0;
        width: 10px;
        height: 100%;
        opacity: 0;
        
    }

    .pipelineStage:hover::after,
    .pipelineStage.active::after {
        opacity: 1;
    }

    .success::after {
        background-color: rgba(0, 128, 0, 0.6);
    }

    .failure::after {
        background-color: rgba(255, 0, 0, 0.6);
    }

    .inherit::after {
        background-color: rgba(128, 128, 128, 0.6);
    }

    .pipeline-info {
        display: flex;
        gap: 12px;
        align-items: center;
        height: 40px;
    }

    .ci-pipeline-container {
        display: flex;
        flex-direction: row;
        gap: 20px;
        height: full;
        align-items: start;
    }

    .ci-pipeline-steps {
        display: flex;
        flex-direction: column;
        width: 66%;
        margin-top: 10px;
    }

    .ciPipelineTitle {
        font-size: 1.5rem;
        font-weight: 700;
        color: white;
        margin-bottom: 10px;
        justify-self:normal;
    }

    .ciStagesHeadline {
        display: flex;
        flex-direction: row;
        gap: 10px;
    }

    .ciStageTitle {
        font-size: 1.5rem;
        font-weight: 700;
        color: white;
        margin-bottom: 10px;
        justify-self:normal;
    }

    .accordion-content {
        display: none;
    }
    .accordion-content.show {
        display: flex;
        flex-direction: column;
        gap: 8px;
        
    }

    .stepList {
        position: relative;
        overflow-x: auto;
        white-space: nowrap;
        padding-left: 16px;
        background-color: black;
        border-bottom-left-radius: 5px;
        border-bottom-right-radius: 5px;
        width: 100%;
    }

    .stepList:nth-child(2) {
        padding-top:8px
    }

    .stepBox {
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        margin-bottom: 5px;
        overflow-x: auto;
        white-space: nowrap;
        padding: 20px;
    }
    
    .accordion{
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: start;
        cursor: pointer;
        font-weight: 600;
        align-self: start;
        width: 100%;
    }

    .stepTree {
        border-bottom: 1px solid #80808026;
        display: flex;
        flex-direction: column;
        height: fit-content;
        gap: 10px;
    }

    .stepContainer{
        display: flex;
        width: 100%;
        flex-direction: row;
        gap: 5px;
        align-items: center;
        border: 1px solid #80808026;
        border-width: 1px;
        border-top-left-radius: 5px;
        border-top-right-radius: 5px;
        padding: 10px;
    }

    .runButton {
        height: 100%;
        width: fit-content;
        display: flex;
        padding: .25rem .75rem;
        border: 1px solid rgba(0, 0, 0, 0);
        transition: all .3s;
        border-radius: 3px;
        background-color: #814BF6;
        border-color: rgba(0, 0, 0, 0);
    }

    .running {
        display: none;
    }

    .stopButton {
        height: 100%;
        width: fit-content;
        display: flex;
        padding: .25rem .75rem;
        border: 1px solid rgba(0, 0, 0, 0);
        transition: all .3s;
        border-radius: 3px;
        background-color: #FF5353;
        border-color: rgba(0, 0, 0, 0);
    }

    .stop {
        display: none;
    }

</style>

<div class="title-container">
    
    <svg class='codesphere' viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M40 7.86885C22.2545 7.86885 7.86885 22.2545 7.86885 40C7.86885 57.7455 22.2545 72.1311 40 72.1311C57.7455 72.1311 72.1311 57.7455 72.1311 40C72.1311 22.2545 57.7455 7.86885 40 7.86885ZM0 40C0 17.9086 17.9086 0 40 0C62.0914 0 80 17.9086 80 40C80 62.0914 62.0914 80 40 80C17.9086 80 0 62.0914 0 40Z" fill="#814BF6"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M40 25.9016C32.2137 25.9016 25.9016 32.2137 25.9016 40C25.9016 47.7863 32.2137 54.0984 40 54.0984C47.7863 54.0984 54.0984 47.7863 54.0984 40C54.0984 32.2137 47.7863 25.9016 40 25.9016ZM18.0328 40C18.0328 27.8678 27.8678 18.0328 40 18.0328C52.1322 18.0328 61.9672 27.8678 61.9672 40C61.9672 52.1322 52.1322 61.9672 40 61.9672C27.8678 61.9672 18.0328 52.1322 18.0328 40Z" fill="#00BCFF"/>
    </svg>
    
    <h1 class='title'>CI Pipeline</h1>
</div>

<div class="ci-pipeline-container">
    <div class="ci-pipelineBox">
        <h2 class="ciPipelineTitle">
            Stages
        </h2>
        <div class="pipelineStage {prepareStageSuccess === 'success' ? 'success' : (prepareStageSuccess === 'failure' || prepareStageSuccess === 'aborted' ? 'failure' : 'inherit')} {isActiveprepare ? 'active' : ''}" on:click={() => { toggleActive("prepare") }} role="presentation" style="background-color: {prepareStageSuccess === 'success' ? 'rgba(0, 128, 0, 0.6)' : (prepareStageSuccess === 'failure' || prepareStageSuccess === 'aborted' ? 'rgba(255, 0, 0, 0.6)' : 'inherit')}">
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
            {#key prepareStageSate}
                {#if prepareStageSate}
                    <div class="animation-container">
                        <div class="circle-container-stages">
                            <span class="loader"></span>
                        </div>
                    </div>
                    {#if animateCircles} 
                        <script>
                            startAnimation(); 
                        </script>
                    {/if}
                {/if}
            {/key}
        </div>
        <div class="pipelineStage {testStageSuccess === 'success' ? 'success' : (testStageSuccess === 'failure' || testStageSuccess === 'aborted' ? 'failure' : 'inherit')} {isActivetest ? 'active' : ''}" on:click={() => { toggleActive("test")  }} role="presentation" style="background-color: {testStageSuccess === 'success' ? 'rgba(0, 128, 0, 0.6)' : (testStageSuccess === 'failure' || testStageSuccess === 'aborted' ? 'rgba(255, 0, 0, 0.6)' : 'inherit')}">
            <div class="pipeline-info">
                <svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill="white" fill-rule="evenodd" clip-rule="evenodd" d="M2.8957 3.93327V5.96872H4.98318V3.93327H2.8957ZM2.5957 2.63327C2.04342 2.63327 1.5957 3.08098 1.5957 3.63327V6.26872C1.5957 6.821 2.04342 7.26872 2.5957 7.26872H5.28318C5.83547 7.26872 6.28318 6.821 6.28318 6.26872V3.63327C6.28318 3.08099 5.83547 2.63327 5.28318 2.63327H2.5957Z"></path>
                    <path fill="white" fill-rule="evenodd" clip-rule="evenodd" d="M7.56638 8.99432C7.83524 9.2322 7.86034 9.64299 7.62246 9.91185L4.39101 13.564C4.27195 13.6986 4.10251 13.7778 3.92293 13.783C3.74334 13.7882 3.56962 13.7188 3.44301 13.5913L1.79428 11.9313C1.54131 11.6765 1.54272 11.265 1.79743 11.012C2.05214 10.7591 2.46369 10.7605 2.71666 11.0152L3.87683 12.1833L6.64886 9.0504C6.88674 8.78155 7.29753 8.75644 7.56638 8.99432Z"></path>
                    <path fill="white" fill-rule="evenodd" clip-rule="evenodd" d="M7.1958 4.95096C7.1958 4.59198 7.48682 4.30096 7.8458 4.30096H14.0958C14.4548 4.30096 14.7458 4.59198 14.7458 4.95096C14.7458 5.30995 14.4548 5.60096 14.0958 5.60096H7.8458C7.48682 5.60096 7.1958 5.30995 7.1958 4.95096Z"></path>
                    <path fill="white" fill-rule="evenodd" clip-rule="evenodd" d="M7.1958 12.0447C7.1958 11.6857 7.48682 11.3947 7.8458 11.3947H14.0958C14.4548 11.3947 14.7458 11.6857 14.7458 12.0447C14.7458 12.4036 14.4548 12.6947 14.0958 12.6947H7.8458C7.48682 12.6947 7.1958 12.4036 7.1958 12.0447Z"></path>
                </svg>
                <div class="pipelineStageTitle">Test</div>
            </div>
            {#key testStageSate}
                {#if testStageSate}
                    <div class="animation-container">
                        <div class="circle-container-stages">
                            <span class="loader"></span>
                        </div>
                    </div>
                    {#if animateCircles} 
                        <script>
                            startAnimation(); 
                        </script>
                    {/if}
                {/if}
            {/key}
        </div>
        <div class="pipelineStage {runStageSuccess === 'success' ? 'success' : (runStageSuccess === 'failure' || runStageSuccess === 'aborted' ? 'failure' : 'inherit')} {isActiveRun ? 'active' : ''}" on:click={() => { toggleActive("run") }} role="presentation" style="background-color: {runStageSuccess === 'success' ? 'rgba(0, 128, 0, 0.6)' : (runStageSuccess === 'failure' || runStageSuccess === 'aborted' ? 'rgba(255, 0, 0, 0.6)' : 'inherit')}">
            <div class="pipeline-info">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M6.50194 4.13286C6.81243 3.95452 7.19458 3.9558 7.50387 4.13622L20.5039 11.7196C20.8218 11.905 21.0122 12.2502 20.9994 12.6181C20.9866 12.986 20.7727 13.3171 20.4426 13.48L7.44261 19.8967C7.13265 20.0497 6.76565 20.0318 6.47208 19.8493C6.17851 19.6668 6 19.3457 6 19V5C6 4.64193 6.19145 4.3112 6.50194 4.13286ZM8 6.74104V17.3912L17.8895 12.5099L8 6.74104Z" fill="white"></path>
                </svg>
                <div class="pipelineStageTitle">Run</div>
            </div>
            {#key runStageSate}
                {#if runStageSate}
                    <div class="animation-container" style="padding-left: 5px; padding-right:5px;">
                        <div class="circle-container-stages">
                            <span class="loader"></span>
                        </div>
                    </div>
                    {#if animateCircles} 
                        <script>
                            startAnimation(); 
                        </script>
                    {/if}
                {/if}
            {/key}
        </div>
    </div>
   
    <div class="ci-pipeline-steps">
        <div class="ciStagesHeadline">
            <h2 class="ciStageTitle">{selectedStage.charAt(0).toUpperCase() + selectedStage.slice(1)}</h2>
            <button class="runButton" class:running={stageRunning.includes(selectedStage)} on:click={() => startCiStage(currentWorkspace, dcId, selectedStage)}>Run</button>
            <button class="stopButton" class:stop={!stageRunning.includes(selectedStage)} on:click={() => stopCiStage(currentWorkspace, dcId, selectedStage)}>Stop</button>
            <div style="display: flex; justify-content: end; align-content: end;">
                {#if selectedStage == "run"}
                    Note: This stage restarts if any step fails.
                {/if}
            </div>
        </div>
        <div class="stepTree">
            {#if showPrepare}
                {#each prepareStageSteps as step, index}
                    <div class="accordion" on:click={() => toggleAccordion(index, 'prepare')} role="presentation">
                        
                        <div class="stepContainer" style="background-color: {(step.state === 'failure' || step.state === 'aborted' ? 'rgba(255, 0, 0, 0.3)' : 'inherit')}; border-color: {(step.state === 'failure' ? 'rgba(255, 0, 0, 0.6)' : '#80808026')}">
                            <!-- Toggle arrow icon -->
                            {#if step.open}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6" width="16px" height="16px">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>                   
                            {:else}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6" width="16px" height="16px">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                            </svg>                 
                            {/if}
                            {#if step.state === 'success'}
                                <svg width="15" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M6 11.1624C8.8995 11.1624 11.25 8.81185 11.25 5.91235C11.25 3.01286 8.8995 0.662354 6 0.662354C3.10051 0.662354 0.75 3.01286 0.75 5.91235C0.75 8.81185 3.10051 11.1624 6 11.1624ZM3.37436 5.2561L4.81811 6.89673L8.62436 3.61548L9.60873 4.59985L4.81811 8.86548L2.38998 6.24048L3.37436 5.2561Z" fill="currentColor"></path>
                                </svg>
                            {:else if step.state == 'failure' || step.state == 'aborted'}
                                <svg width="15" height="15" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M6 10.1875C8.36102 10.1875 10.275 8.27349 10.275 5.91248C10.275 3.55146 8.36102 1.63748 6 1.63748C3.63898 1.63748 1.725 3.55146 1.725 5.91248C1.725 8.27349 3.63898 10.1875 6 10.1875ZM6 11.1625C8.8995 11.1625 11.25 8.81197 11.25 5.91248C11.25 3.01298 8.8995 0.662476 6 0.662476C3.10051 0.662476 0.75 3.01298 0.75 5.91248C0.75 8.81197 3.10051 11.1625 6 11.1625Z" fill="currentColor"></path>
                                    <path d="M6.65625 7.88123C6.65625 8.24366 6.36244 8.53748 6 8.53748C5.63756 8.53748 5.34375 8.24366 5.34375 7.88123C5.34375 7.51879 5.63756 7.22498 6 7.22498C6.36244 7.22498 6.65625 7.51879 6.65625 7.88123Z" fill="currentColor"></path>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M5.99922 3.45618C6.26846 3.45618 6.48672 3.67444 6.48672 3.94368V5.91243C6.48672 6.18167 6.26846 6.39993 5.99922 6.39993C5.72998 6.39993 5.51172 6.18167 5.51172 5.91243V3.94368C5.51172 3.67444 5.72998 3.45618 5.99922 3.45618Z" fill="currentColor"></path>
                                </svg>
                            {:else if step.state == 'running'}
                                <div class="animation-container">
                                    <div class="circle-container">
                                        <span class="loader"></span>
                                    </div>
                                </div>
                                {#if animateCircles} 
                                    <script>
                                        startAnimation(); 
                                    </script>
                                {/if}
                            {:else if step.state == 'waiting'}
                                <svg width="15" height="15" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M8.00122 13.5833C11.1492 13.5833 13.7012 11.0313 13.7012 7.88327C13.7012 4.73525 11.1492 2.18327 8.00122 2.18327C4.8532 2.18327 2.30122 4.73525 2.30122 7.88327C2.30122 11.0313 4.8532 13.5833 8.00122 13.5833ZM8.00122 14.8833C11.8672 14.8833 15.0012 11.7493 15.0012 7.88327C15.0012 4.01728 11.8672 0.88327 8.00122 0.88327C4.13523 0.88327 1.00122 4.01728 1.00122 7.88327C1.00122 11.7493 4.13523 14.8833 8.00122 14.8833Z" fill="currentColor"></path>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M5.85156 5.7237C5.85156 4.62442 6.74271 3.73328 7.84199 3.73328H8.29067C9.59456 3.73328 10.6516 4.79028 10.6516 6.09417C10.6516 6.89174 10.2387 7.63248 9.56035 8.05196L9.24535 8.24675C8.87621 8.47503 8.65152 8.87812 8.6515 9.31214L8.65149 9.38332C8.65147 9.7423 8.36044 10.0333 8.00145 10.0333C7.64247 10.0333 7.35147 9.74222 7.35149 9.38324L7.3515 9.31206C7.35155 8.42763 7.8094 7.60625 8.56162 7.14108L8.87661 6.94629C9.17186 6.76371 9.35156 6.44131 9.35156 6.09417C9.35156 5.50825 8.87659 5.03328 8.29067 5.03328H7.84199C7.46068 5.03328 7.15156 5.34239 7.15156 5.7237V5.88328C7.15156 6.24226 6.86055 6.53328 6.50156 6.53328C6.14258 6.53328 5.85156 6.24226 5.85156 5.88328V5.7237Z" fill="currentColor"></path>
                                    <path d="M8.87622 11.2583C8.87622 11.7415 8.48447 12.1333 8.00122 12.1333C7.51797 12.1333 7.12622 11.7415 7.12622 11.2583C7.12622 10.775 7.51797 10.3833 8.00122 10.3833C8.48447 10.3833 8.87622 10.775 8.87622 11.2583Z" fill="currentColor"></path>
                                </svg>
                            {/if}
                            {#if step.name == undefined}
                                <span class="">{step.command}</span>
                            {:else}
                                <span class="">{step.name}</span>
                            {/if}
                        </div>
                        <div class="stepList accordion-content" class:show={step.open}>
                            <div class="stepBox">
                                {#if step.log}
                                <pre class="log">
                                    {@html step.log}
                                </pre>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/each}
            {/if}

            {#if showTest }
                {#each testStageSteps as step, index}
                    <div class="accordion" on:click={() => toggleAccordion(index, 'test')} role="presentation">
                        
                        <div class="stepContainer" style="background-color: {(step.state === 'failure' ? 'rgba(255, 0, 0, 0.6)' : 'inherit')}; border-color: {(step.state === 'failure' ? 'rgba(255, 0, 0, 0.6)' : '#80808026')}">
                            <!-- Toggle arrow icon -->
                            {#if step.open}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6" width="16px" height="16px">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>                   
                            {:else}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6" width="16px" height="16px">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                            </svg>                 
                            {/if}
                            {#if step.state === 'success'}
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M6 11.1624C8.8995 11.1624 11.25 8.81185 11.25 5.91235C11.25 3.01286 8.8995 0.662354 6 0.662354C3.10051 0.662354 0.75 3.01286 0.75 5.91235C0.75 8.81185 3.10051 11.1624 6 11.1624ZM3.37436 5.2561L4.81811 6.89673L8.62436 3.61548L9.60873 4.59985L4.81811 8.86548L2.38998 6.24048L3.37436 5.2561Z" fill="currentColor"></path>
                                </svg>
                            {:else if step.state == 'failure'}
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M6 10.1875C8.36102 10.1875 10.275 8.27349 10.275 5.91248C10.275 3.55146 8.36102 1.63748 6 1.63748C3.63898 1.63748 1.725 3.55146 1.725 5.91248C1.725 8.27349 3.63898 10.1875 6 10.1875ZM6 11.1625C8.8995 11.1625 11.25 8.81197 11.25 5.91248C11.25 3.01298 8.8995 0.662476 6 0.662476C3.10051 0.662476 0.75 3.01298 0.75 5.91248C0.75 8.81197 3.10051 11.1625 6 11.1625Z" fill="currentColor"></path>
                                    <path d="M6.65625 7.88123C6.65625 8.24366 6.36244 8.53748 6 8.53748C5.63756 8.53748 5.34375 8.24366 5.34375 7.88123C5.34375 7.51879 5.63756 7.22498 6 7.22498C6.36244 7.22498 6.65625 7.51879 6.65625 7.88123Z" fill="currentColor"></path>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M5.99922 3.45618C6.26846 3.45618 6.48672 3.67444 6.48672 3.94368V5.91243C6.48672 6.18167 6.26846 6.39993 5.99922 6.39993C5.72998 6.39993 5.51172 6.18167 5.51172 5.91243V3.94368C5.51172 3.67444 5.72998 3.45618 5.99922 3.45618Z" fill="currentColor"></path>
                                </svg>
                            {:else if step.state == 'running'}
                                <div class="animation-container">
                                    <div class="circle-container">
                                        <span class="loader"></span>
                                    </div>
                                </div>
                                {#if animateCircles} 
                                    <script>
                                        startAnimation(); 
                                    </script>
                                {/if}
                            {:else if step.state == 'waiting'}
                                <svg width="25" height="25" viewBox="0 0 25 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M8.00122 13.5833C11.1492 13.5833 13.7012 11.0313 13.7012 7.88327C13.7012 4.73525 11.1492 2.18327 8.00122 2.18327C4.8532 2.18327 2.30122 4.73525 2.30122 7.88327C2.30122 11.0313 4.8532 13.5833 8.00122 13.5833ZM8.00122 14.8833C11.8672 14.8833 15.0012 11.7493 15.0012 7.88327C15.0012 4.01728 11.8672 0.88327 8.00122 0.88327C4.13523 0.88327 1.00122 4.01728 1.00122 7.88327C1.00122 11.7493 4.13523 14.8833 8.00122 14.8833Z" fill="currentColor"></path>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M5.85156 5.7237C5.85156 4.62442 6.74271 3.73328 7.84199 3.73328H8.29067C9.59456 3.73328 10.6516 4.79028 10.6516 6.09417C10.6516 6.89174 10.2387 7.63248 9.56035 8.05196L9.24535 8.24675C8.87621 8.47503 8.65152 8.87812 8.6515 9.31214L8.65149 9.38332C8.65147 9.7423 8.36044 10.0333 8.00145 10.0333C7.64247 10.0333 7.35147 9.74222 7.35149 9.38324L7.3515 9.31206C7.35155 8.42763 7.8094 7.60625 8.56162 7.14108L8.87661 6.94629C9.17186 6.76371 9.35156 6.44131 9.35156 6.09417C9.35156 5.50825 8.87659 5.03328 8.29067 5.03328H7.84199C7.46068 5.03328 7.15156 5.34239 7.15156 5.7237V5.88328C7.15156 6.24226 6.86055 6.53328 6.50156 6.53328C6.14258 6.53328 5.85156 6.24226 5.85156 5.88328V5.7237Z" fill="currentColor"></path>
                                    <path d="M8.87622 11.2583C8.87622 11.7415 8.48447 12.1333 8.00122 12.1333C7.51797 12.1333 7.12622 11.7415 7.12622 11.2583C7.12622 10.775 7.51797 10.3833 8.00122 10.3833C8.48447 10.3833 8.87622 10.775 8.87622 11.2583Z" fill="currentColor"></path>
                                </svg>
                            {/if}
                            {#if step.name == undefined}
                                <span class="">{step.command}</span>
                            {:else}
                                <span class="">{step.name}</span>
                            {/if}
                        </div>
                        <div class="stepList accordion-content" class:show={step.open}>
                            <div class="stepBox">
                                {#if step.log}
                                <pre class='log'>
                                    {@html step.log}
                                </pre>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/each}
            {/if}

            {#if showRun }
                {#each runStageSteps as step, index}
                    <div class="accordion" on:click={() => toggleAccordion(index, 'run')} role="presentation">
                        
                        <div class="stepContainer">
                            <!-- Toggle arrow icon -->
                            {#if step.open}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6" width="16px" height="16px">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                            </svg>                   
                            {:else}
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6" width="16px" height="16px">
                                <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                            </svg>                 
                            {/if}
                            {#if step.state === 'success'}
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M6 11.1624C8.8995 11.1624 11.25 8.81185 11.25 5.91235C11.25 3.01286 8.8995 0.662354 6 0.662354C3.10051 0.662354 0.75 3.01286 0.75 5.91235C0.75 8.81185 3.10051 11.1624 6 11.1624ZM3.37436 5.2561L4.81811 6.89673L8.62436 3.61548L9.60873 4.59985L4.81811 8.86548L2.38998 6.24048L3.37436 5.2561Z" fill="currentColor"></path>
                                </svg>
                            {:else if step.state == 'failure'}
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M6 10.1875C8.36102 10.1875 10.275 8.27349 10.275 5.91248C10.275 3.55146 8.36102 1.63748 6 1.63748C3.63898 1.63748 1.725 3.55146 1.725 5.91248C1.725 8.27349 3.63898 10.1875 6 10.1875ZM6 11.1625C8.8995 11.1625 11.25 8.81197 11.25 5.91248C11.25 3.01298 8.8995 0.662476 6 0.662476C3.10051 0.662476 0.75 3.01298 0.75 5.91248C0.75 8.81197 3.10051 11.1625 6 11.1625Z" fill="currentColor"></path>
                                    <path d="M6.65625 7.88123C6.65625 8.24366 6.36244 8.53748 6 8.53748C5.63756 8.53748 5.34375 8.24366 5.34375 7.88123C5.34375 7.51879 5.63756 7.22498 6 7.22498C6.36244 7.22498 6.65625 7.51879 6.65625 7.88123Z" fill="currentColor"></path>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M5.99922 3.45618C6.26846 3.45618 6.48672 3.67444 6.48672 3.94368V5.91243C6.48672 6.18167 6.26846 6.39993 5.99922 6.39993C5.72998 6.39993 5.51172 6.18167 5.51172 5.91243V3.94368C5.51172 3.67444 5.72998 3.45618 5.99922 3.45618Z" fill="currentColor"></path>
                                </svg>
                            {:else if step.state == 'running'}
                                <div class="animation-container">
                                    <div class="circle-container">
                                        <span class="loader"></span>
                                    </div>
                                </div>
                                {#if animateCircles} 
                                    <script>
                                        startAnimation(); 
                                    </script>
                                {/if}
                            {:else if step.state == 'waiting'}
                                <svg width="25" height="25" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M8.00122 13.5833C11.1492 13.5833 13.7012 11.0313 13.7012 7.88327C13.7012 4.73525 11.1492 2.18327 8.00122 2.18327C4.8532 2.18327 2.30122 4.73525 2.30122 7.88327C2.30122 11.0313 4.8532 13.5833 8.00122 13.5833ZM8.00122 14.8833C11.8672 14.8833 15.0012 11.7493 15.0012 7.88327C15.0012 4.01728 11.8672 0.88327 8.00122 0.88327C4.13523 0.88327 1.00122 4.01728 1.00122 7.88327C1.00122 11.7493 4.13523 14.8833 8.00122 14.8833Z" fill="currentColor"></path>
                                    <path fill-rule="evenodd" clip-rule="evenodd" d="M5.85156 5.7237C5.85156 4.62442 6.74271 3.73328 7.84199 3.73328H8.29067C9.59456 3.73328 10.6516 4.79028 10.6516 6.09417C10.6516 6.89174 10.2387 7.63248 9.56035 8.05196L9.24535 8.24675C8.87621 8.47503 8.65152 8.87812 8.6515 9.31214L8.65149 9.38332C8.65147 9.7423 8.36044 10.0333 8.00145 10.0333C7.64247 10.0333 7.35147 9.74222 7.35149 9.38324L7.3515 9.31206C7.35155 8.42763 7.8094 7.60625 8.56162 7.14108L8.87661 6.94629C9.17186 6.76371 9.35156 6.44131 9.35156 6.09417C9.35156 5.50825 8.87659 5.03328 8.29067 5.03328H7.84199C7.46068 5.03328 7.15156 5.34239 7.15156 5.7237V5.88328C7.15156 6.24226 6.86055 6.53328 6.50156 6.53328C6.14258 6.53328 5.85156 6.24226 5.85156 5.88328V5.7237Z" fill="currentColor"></path>
                                    <path d="M8.87622 11.2583C8.87622 11.7415 8.48447 12.1333 8.00122 12.1333C7.51797 12.1333 7.12622 11.7415 7.12622 11.2583C7.12622 10.775 7.51797 10.3833 8.00122 10.3833C8.48447 10.3833 8.87622 10.775 8.87622 11.2583Z" fill="currentColor"></path>
                                </svg>
                            {/if}
                            {#if step.name == undefined}
                                <span class="">{step.command}</span>
                            {:else}
                                <span class="">{step.name}</span>
                            {/if}
                        </div>
                        <div class="stepList accordion-content" class:show={step.open}>
                            <div class="stepBox">
                                {#if step.log}
                                    <pre class='log'>
                                        {@html step.log}
                                    </pre>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/each}
            {/if}
        </div>
    </div>
</div>