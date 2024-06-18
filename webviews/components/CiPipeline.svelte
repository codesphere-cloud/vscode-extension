<script>
    import { onMount } from "svelte";
    import * as vscode from "vscode";
    import "vscode-webview"

    let CIArray = {};
    let prepareStageSteps = [];
    let testStageSteps = [];
    let runStageSteps = [];
    let currentWorkspace;
    let stepId;
    let dcId;
    let selectedStage = 'prepare';
    let showPrepare = true;
    let showTest = false;
    let showRun = false;
    onMount(getCurrentWorkspace);

    onMount(() => {
        window.addEventListener('message', event => {
            const message = event.data; 
            switch (message.type) {
                case 'currentWorkspace':
                    currentWorkspace = message.value.currentWorkspace;
                    stepId = message.value.stepId;
                    dcId = message.value.dcId;
                    
                    vscode.postMessage({
                        type: 'getCiPipelineStages',
                        value: {
                            dataCenterId: dcId,
                            workspaceId: currentWorkspace,
                            stepId: stepId
                        }
                    });

                    break;

                case 'CIPipelineStages':
                    CIArray = JSON.parse(message.value.CIArray);
                    console.log(CIArray.prepare);
                    prepareStageSteps = CIArray.prepare.steps;
                    testStageSteps = CIArray.test.steps;
                    runStageSteps = CIArray.run.steps;

                    console.log(prepareStageSteps);
                    break;

            }
        });
    });

    function toggleAccordion(stepName) {
        const stepIndex = prepareStageSteps.findIndex(step => step.name === stepName);
        if (stepIndex !== -1) {
            prepareStageSteps[stepIndex].open = !prepareStageSteps[stepIndex].open;
        }
    }

    function getCurrentWorkspace() {
        vscode.postMessage({
            type: 'currentWorkspace',
            value: {
            }
        });
    }

</script>

<style>

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
        width: 33%;
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

    .pipeline-info {
        display: flex;
        gap: 12px;
        align-items: center;
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
        width: 50px;
        border-radius: 5px;
        margin-bottom: 10px;
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
        <div class="pipelineStage">
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
            <!-- {#if prepareStageSate}
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
            {/if} -->
        </div>
        <div class="pipelineStage">
            <div class="pipeline-info">
                <svg width="24" height="24" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill="white" fill-rule="evenodd" clip-rule="evenodd" d="M2.8957 3.93327V5.96872H4.98318V3.93327H2.8957ZM2.5957 2.63327C2.04342 2.63327 1.5957 3.08098 1.5957 3.63327V6.26872C1.5957 6.821 2.04342 7.26872 2.5957 7.26872H5.28318C5.83547 7.26872 6.28318 6.821 6.28318 6.26872V3.63327C6.28318 3.08099 5.83547 2.63327 5.28318 2.63327H2.5957Z"></path>
                    <path fill="white" fill-rule="evenodd" clip-rule="evenodd" d="M7.56638 8.99432C7.83524 9.2322 7.86034 9.64299 7.62246 9.91185L4.39101 13.564C4.27195 13.6986 4.10251 13.7778 3.92293 13.783C3.74334 13.7882 3.56962 13.7188 3.44301 13.5913L1.79428 11.9313C1.54131 11.6765 1.54272 11.265 1.79743 11.012C2.05214 10.7591 2.46369 10.7605 2.71666 11.0152L3.87683 12.1833L6.64886 9.0504C6.88674 8.78155 7.29753 8.75644 7.56638 8.99432Z"></path>
                    <path fill="white" fill-rule="evenodd" clip-rule="evenodd" d="M7.1958 4.95096C7.1958 4.59198 7.48682 4.30096 7.8458 4.30096H14.0958C14.4548 4.30096 14.7458 4.59198 14.7458 4.95096C14.7458 5.30995 14.4548 5.60096 14.0958 5.60096H7.8458C7.48682 5.60096 7.1958 5.30995 7.1958 4.95096Z"></path>
                    <path fill="white" fill-rule="evenodd" clip-rule="evenodd" d="M7.1958 12.0447C7.1958 11.6857 7.48682 11.3947 7.8458 11.3947H14.0958C14.4548 11.3947 14.7458 11.6857 14.7458 12.0447C14.7458 12.4036 14.4548 12.6947 14.0958 12.6947H7.8458C7.48682 12.6947 7.1958 12.4036 7.1958 12.0447Z"></path>
                </svg>
                <div class="pipelineStageTitle">Test</div>
            </div>
            <!-- {#if testStageSate}
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
            {/if} -->
        </div>
        <div class="pipelineStage">
            <div class="pipeline-info">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M6.50194 4.13286C6.81243 3.95452 7.19458 3.9558 7.50387 4.13622L20.5039 11.7196C20.8218 11.905 21.0122 12.2502 20.9994 12.6181C20.9866 12.986 20.7727 13.3171 20.4426 13.48L7.44261 19.8967C7.13265 20.0497 6.76565 20.0318 6.47208 19.8493C6.17851 19.6668 6 19.3457 6 19V5C6 4.64193 6.19145 4.3112 6.50194 4.13286ZM8 6.74104V17.3912L17.8895 12.5099L8 6.74104Z" fill="white"></path>
                </svg>
                <div class="pipelineStageTitle">Run</div>
            </div>
                <!-- {#if runStageSate}
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
                {/if} -->
        </div>
    </div>
   
    <div class="ci-pipeline-steps">
        <div class="ciStagesHeadline">
            <h2 class="ciStageTitle">{selectedStage}</h2>
            <button class="runButton">Run</button>
            {#if selectedStage == "run"}
                Note: This stage restarts if any step fails.
            {/if}
        </div>
        <div class="stepTree">
            {#if showPrepare}
                {#each prepareStageSteps as step}
                    <div class="accordion" on:click={() => toggleAccordion(step.name)} role="presentation">
                        
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
                            {#if step.name == undefined}
                                <span class="">{step.command}</span>
                            {:else}
                                <span class="">{step.name}</span>
                            {/if}
                        </div>
                        <div class="stepList accordion-content" class:show={step.open}>
                            <div class="stepBox">
                                {step.command}
                            </div>
                        </div>
                    </div>
                {/each}
            {/if}

            {#if showTest == true}
                <div></div>
            {/if}

            {#if showRun == true}
                <div></div>
            {/if}
        </div>
    </div>
</div>