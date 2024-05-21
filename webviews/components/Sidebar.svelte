<script lang="ts">
    import { onMount } from "svelte";
    import "vscode-webview"
    import * as vscode from "vscode";

    let email = '';
    let password = '';
    let errorMessage = ''; // Anfangs leer


    function handleSignIn() {
        vscode.postMessage({
            type: 'signin',
            value: {
                email: email,
                password: password}
        });
    }

    onMount(() => {
        console.log('live')
        window.addEventListener('message', event => {
            const message = event.data; // The JSON data our extension sent
            switch (message.type) {
                case 'onError':
                    if(message.value === "Request failed with status code 401") {
                        errorMessage = 'Invalid email or password';
                    } else {
                        errorMessage = message.value
                    }
                    break;
            }
        });
    });

    
</script>

<style>
.Errormessage {
    color: red;
    font-size: 12px;
    margin-top: 10px;
    text-align: center;
}

.codesphere {
    width: 100%; /* Die Breite des SVG entspricht der Breite des übergeordneten Elements */
    height: auto; /* Die Höhe wird automatisch angepasst, um das Seitenverhältnis beizubehalten */
    max-width: 300px; /* Die maximale Breite des SVG ist 500px */
    padding-bottom: 20px; /* Abstand zum nächsten Element */
}

.oauth {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 20px; /* Abstand zwischen den Buttons */
    max-width: 400px;
}


.oauth-button button {
    width: 50px;  /* Adjust as needed */
    height: 50px;  /* Adjust as needed */
    padding: 10px 10px;
    background-color: var(--vscode-input-background);
    border: 1px solid var(--vscode-input-border);
    border-radius: 100%;
    cursor: pointer;
    transition: background-color 0.3s, border-color 0.3s;
}

.oauth-button button:hover {
    background-color: #f0f0f0;
}



.header {
    font-size: 24px;
    font-weight: bold;
    margin-bottom: 20px;
    padding-bottom: 5px;
    text-align: center;
    max-width: 400px;
}

.divider {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: 20px;
    margin-bottom: 20px;
    max-width: 400px;
}

.divider::before, .divider::after {
    content: "";
    flex: 1;
    border-bottom: 1px solid;
}

.form-container {
    display: flex;
    flex-direction: column;
    justify-content: left;
    gap: 10px;
    max-width: 400px;
}

.link-container {
    display: flex;
    justify-content: center;
}

.email-container,
    .password-container {
        position: relative;
        width: 100%;
        margin-bottom: 10px;
    }

    .icon-left {
        position: absolute;
        left: 10px;
        top: 50%;
        transform: translateY(-50%);
        pointer-events: none;
    }

    .icon-left svg {
        height: 20px;
        width: auto;
    }

    .email-input,
    .password-input {
        padding: 12px 0px 12px 40px;
        border-radius: 4px;
        border: 1px solid var(--vscode-input-border);
    }

    .title {
        max-width: 400px;
        display: flex;
        justify-content: center;
    }

    #signin-commit-button {
        border-radius: 4px;
        padding-top: 12px;
        padding-bottom: 12px;
    }

    #signin-commit-button:hover {
        opacity: 80%;
    }

    .oauth-inner {
        display: flex;
        justify-content: center;
        align-items: center;
    }   

</style>

<div class="title">
    <svg class="codesphere" width="928" height="200" viewBox="0 0 928 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M100 19.6721C55.6361 19.6721 19.6721 55.6361 19.6721 100C19.6721 144.364 55.6361 180.328 100 180.328C144.364 180.328 180.328 144.364 180.328 100C180.328 55.6361 144.364 19.6721 100 19.6721ZM0 100C0 44.7715 44.7715 0 100 0C155.228 0 200 44.7715 200 100C200 155.228 155.228 200 100 200C44.7715 200 0 155.228 0 100Z" fill="#814BF6"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M100 64.7541C80.5342 64.7541 64.7541 80.5342 64.7541 100C64.7541 119.466 80.5342 135.246 100 135.246C119.466 135.246 135.246 119.466 135.246 100C135.246 80.5342 119.466 64.7541 100 64.7541ZM45.082 100C45.082 69.6696 69.6696 45.082 100 45.082C130.33 45.082 154.918 69.6696 154.918 100C154.918 130.33 130.33 154.918 100 154.918C69.6696 154.918 45.082 130.33 45.082 100Z" fill="#00BCFF"/>
        <path d="M264.471 132.89C282.039 132.89 293.077 122.585 293.936 107.428H276.67C275.596 114.47 270.957 118.42 264.686 118.42C256.139 118.42 250.598 111.249 250.598 98.626C250.598 86.1742 256.182 79.0467 264.686 79.0467C271.387 79.0467 275.682 83.4692 276.67 90.0386H293.936C293.163 74.7959 281.609 64.7916 264.386 64.7916C244.37 64.7916 232 78.6603 232 98.8836C232 118.935 244.155 132.89 264.471 132.89Z" fill="white"/>
        <path d="M335.46 132.89C355.475 132.89 367.931 119.193 367.931 98.8836C367.931 78.4456 355.475 64.7916 335.46 64.7916C315.444 64.7916 302.988 78.4456 302.988 98.8836C302.988 119.193 315.444 132.89 335.46 132.89ZM335.546 118.72C326.311 118.72 321.587 110.262 321.587 98.7548C321.587 87.2477 326.311 78.7461 335.546 78.7461C344.609 78.7461 349.333 87.2477 349.333 98.7548C349.333 110.262 344.609 118.72 335.546 118.72Z" fill="white"/>
        <path d="M404.14 132.675C414.792 132.675 420.332 126.535 422.867 121.039H423.64V131.602H441.679V43.6666H423.425V76.7281H422.867C420.418 71.361 415.135 64.7916 404.097 64.7916C389.622 64.7916 377.381 76.0411 377.381 98.7118C377.381 120.781 389.107 132.675 404.14 132.675ZM409.938 118.119C400.961 118.119 396.065 110.133 396.065 98.626C396.065 87.2047 400.875 79.3473 409.938 79.3473C418.829 79.3473 423.812 86.8612 423.812 98.626C423.812 110.391 418.743 118.119 409.938 118.119Z" fill="white"/>
        <path d="M486.789 132.89C503.111 132.89 514.107 124.946 516.684 112.709L499.761 111.593C497.914 116.617 493.189 119.236 487.09 119.236C477.941 119.236 472.143 113.182 472.143 103.349V103.306H517.07V98.2825C517.07 75.8694 503.498 64.7916 486.059 64.7916C466.645 64.7916 454.06 78.5744 454.06 98.9265C454.06 119.837 466.473 132.89 486.789 132.89ZM472.143 91.9707C472.529 84.4568 478.242 78.4456 486.36 78.4456C494.306 78.4456 499.804 84.1133 499.847 91.9707H472.143Z" fill="white"/>
        <path d="M583.903 84.4568C582.271 72.3056 572.478 64.7916 555.813 64.7916C538.933 64.7916 527.808 72.6062 527.851 85.3155C527.808 95.191 534.036 101.589 546.922 104.165L558.347 106.441C564.103 107.6 566.723 109.704 566.808 113.01C566.723 116.917 562.47 119.708 556.071 119.708C549.542 119.708 545.204 116.917 544.087 111.55L526.09 112.495C527.808 125.118 538.546 132.89 556.028 132.89C573.122 132.89 585.364 124.173 585.407 111.164C585.364 101.632 579.136 95.9209 566.336 93.3018L554.395 90.8973C548.253 89.5663 545.977 87.4624 546.02 84.285C545.977 80.3348 550.444 77.7586 556.114 77.7586C562.47 77.7586 566.25 81.2365 567.152 85.4873L583.903 84.4568Z" fill="white"/>
        <path d="M596.928 156.333H615.226V121.039H615.784C618.318 126.535 623.859 132.675 634.511 132.675C649.544 132.675 661.27 120.781 661.27 98.7118C661.27 76.0411 649.029 64.7916 634.554 64.7916C623.515 64.7916 618.232 71.361 615.784 76.7281H614.968V65.6504H596.928V156.333ZM614.839 98.626C614.839 86.8612 619.822 79.3473 628.713 79.3473C637.775 79.3473 642.586 87.2047 642.586 98.626C642.586 110.133 637.69 118.119 628.713 118.119C619.908 118.119 614.839 110.391 614.839 98.626Z" fill="white"/>
        <path d="M691.766 93.4735C691.809 84.972 697.006 79.9913 704.479 79.9913C711.91 79.9913 716.291 84.7573 716.248 92.8724V131.602H734.546V89.6092C734.589 74.1519 725.483 64.7916 711.738 64.7916C701.731 64.7916 695.03 69.5147 692.023 77.2863H691.25V43.6666H673.468V131.602H691.766V93.4735Z" fill="white"/>
        <path d="M779.011 132.89C795.333 132.89 806.329 124.946 808.906 112.709L791.983 111.593C790.136 116.617 785.411 119.236 779.312 119.236C770.163 119.236 764.365 113.182 764.365 103.349V103.306H809.292V98.2825C809.292 75.8694 795.72 64.7916 778.281 64.7916C758.867 64.7916 746.282 78.5744 746.282 98.9265C746.282 119.837 758.695 132.89 779.011 132.89ZM764.365 91.9707C764.751 84.4568 770.464 78.4456 778.582 78.4456C786.528 78.4456 792.026 84.1133 792.069 91.9707H764.365Z" fill="white"/>
        <path d="M821.233 131.602H839.53V94.2893C839.53 86.1742 845.458 80.5924 853.533 80.5924C856.067 80.5924 859.546 81.0218 861.264 81.58V65.3498C859.632 64.9634 857.355 64.7058 855.508 64.7058C848.121 64.7058 842.064 68.9995 839.659 77.1575H838.972V65.6504H821.233V131.602Z" fill="white"/>
        <path d="M897.719 132.89C914.041 132.89 925.036 124.946 927.613 112.709L910.691 111.593C908.844 116.617 904.119 119.236 898.02 119.236C888.871 119.236 883.073 113.182 883.073 103.349V103.306H928V98.2825C928 75.8694 914.427 64.7916 896.989 64.7916C877.575 64.7916 864.99 78.5744 864.99 98.9265C864.99 119.837 877.403 132.89 897.719 132.89ZM883.073 91.9707C883.459 84.4568 889.172 78.4456 897.29 78.4456C905.236 78.4456 910.733 84.1133 910.776 91.9707H883.073Z" fill="white"/>
    </svg>
</div>

<h1 class="header">Sign in</h1>

<div class="oauth">
    <div class="oauth-button github-oauth-button">
        <button class="github-button oauth-inner">
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"
            class="fill-white aspect-square w-8">
            <rect height="24" width="24" fill="none" x="0"></rect>
            <g>
                <path
                    d="M12 2C6.477 2 2 6.477 2 12c0 4.419 2.865 8.166 6.839 9.489.5.09.682-.218.682-.484 0-.236-.009-.866-.014-1.699-2.782.602-3.369-1.34-3.369-1.34-.455-1.157-1.11-1.465-1.11-1.465-.909-.62.069-.608.069-.608 1.004.071 1.532 1.03 1.532 1.03.891 1.529 2.341 1.089 2.91.833.091-.647.349-1.086.635-1.337-2.22-.251-4.555-1.111-4.555-4.943 0-1.091.39-1.984 1.03-2.682-.103-.254-.447-1.27.097-2.646 0 0 .84-.269 2.75 1.025A9.548 9.548 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.748-1.025 2.748-1.025.546 1.376.202 2.394.1 2.646.64.699 1.026 1.591 1.026 2.682 0 3.841-2.337 4.687-4.565 4.935.359.307.679.917.679 1.852 0 1.335-.012 2.415-.012 2.741 0 .269.18.579.688.481A9.997 9.997 0 0022 12c0-5.523-4.477-10-10-10z">
                </path>
            </g>
        </svg>
        </button>
    </div>
    <div class="oauth-button google-oauth-button">
        <button class="google-button oauth-inner">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 19 19" height="24" width="24"
            class="aspect-square w-8">
            <path fill="#FFC107"
                d="M18.0798 7.78631H17.375V7.75H9.5V11.25H14.4451C13.7236 13.2874 11.7851 14.75 9.5 14.75C6.60069 14.75 4.25 12.3993 4.25 9.5C4.25 6.60069 6.60069 4.25 9.5 4.25C10.8383 4.25 12.0559 4.75487 12.9829 5.57956L15.4579 3.10462C13.8951 1.64819 11.8048 0.75 9.5 0.75C4.66781 0.75 0.75 4.66781 0.75 9.5C0.75 14.3322 4.66781 18.25 9.5 18.25C14.3322 18.25 18.25 14.3322 18.25 9.5C18.25 8.91331 18.1896 8.34063 18.0798 7.78631Z">
            </path>
            <path fill="#FF3D00"
                d="M1.75885 5.42731L4.63366 7.53563C5.41154 5.60975 7.29541 4.25 9.49997 4.25C10.8383 4.25 12.0559 4.75488 12.9829 5.57956L15.4578 3.10463C13.8951 1.64819 11.8047 0.75 9.49997 0.75C6.1391 0.75 3.22447 2.64744 1.75885 5.42731Z">
            </path>
            <path fill="#4CAF50"
                d="M9.49995 18.25C11.7601 18.25 13.8137 17.385 15.3664 15.9785L12.6583 13.6868C11.7503 14.3774 10.6407 14.7509 9.49995 14.75C7.22408 14.75 5.29164 13.2988 4.56364 11.2736L1.71027 13.472C3.15839 16.3057 6.09927 18.25 9.49995 18.25Z">
            </path>
            <path fill="#1976D2"
                d="M18.0798 7.78631H17.375V7.75H9.5V11.25H14.4451C14.1 12.2197 13.4783 13.067 12.657 13.6873L12.6583 13.6864L15.3664 15.9781C15.1748 16.1522 18.25 13.875 18.25 9.5C18.25 8.91331 18.1896 8.34063 18.0798 7.78631Z">
            </path>
        </svg>
        </button>
    </div>
    <div class="oauth-button bitbucket-oauth-button">
        <button class="bitbucket-button oauth-inner">
            <svg viewBox="-0.9662264221278978 -0.5824607696358868 257.93281329857973 230.8324730411935" 
            xmlns="http://www.w3.org/2000/svg" class="aspect-square w-7" height="24" width="24">
            <linearGradient y2="78.776%" y1="13.818%" x2="46.927%"
                x1="108.633%" id="a">
                <stop stop-color="#0052cc" offset=".18"></stop>
                <stop stop-color="#2684ff" offset="1"></stop>
            </linearGradient>
            <g fill="none">
                <path d="M101.272 152.561h53.449l12.901-75.32H87.06z">
                </path>
                <path fill="#2684ff"
                    d="M8.308 0A8.202 8.202 0 0 0 .106 9.516l34.819 211.373a11.155 11.155 0 0 0 10.909 9.31h167.04a8.202 8.202 0 0 0 8.201-6.89l34.82-213.752a8.202 8.202 0 0 0-8.203-9.514zm146.616 152.768h-53.315l-14.436-75.42h80.67z">
                </path>
                <path fill="url(#a)"
                    d="M244.61 77.242h-76.916l-12.909 75.36h-53.272l-62.902 74.663a11.105 11.105 0 0 0 7.171 2.704H212.73a8.196 8.196 0 0 0 8.196-6.884z">
                </path>
            </g>
        </svg>
        </button>
    </div>
    <div class="oauth-button gitlab-oauth-button">
        <button class="gitlab-button oauth-inner">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 aspect-[53/51]" viewBox="0 0 53 51" fill="none" height="24" width="24">
                <path d="M52.0673 20.1846L51.9929 19.9943L44.7862 1.18625C44.6395 0.817626 44.3799 0.504917 44.0445 0.292996C43.7089 0.0846745 43.3175 -0.0156598 42.9231 0.00554014C42.5287 0.0267401 42.1503 0.168453 41.8389 0.411546C41.5311 0.661617 41.3077 1.00047 41.1993 1.382L36.3333 16.2697H16.6292L11.7631 1.382C11.6576 0.998394 11.4338 0.657841 11.1235 0.408788C10.8122 0.165696 10.4338 0.0239825 10.0393 0.00278258C9.64493 -0.0184174 9.2535 0.0819169 8.91792 0.290238C8.5833 0.503015 8.3239 0.815451 8.17629 1.1835L0.955778 19.9833L0.884096 20.1735C-0.153346 22.8842 -0.281401 25.8587 0.519237 28.6485C1.31988 31.4383 3.0058 33.8922 5.32282 35.6402L5.34764 35.6595L5.4138 35.7063L16.3921 43.9276L21.8233 48.0383L25.1317 50.5361C25.5187 50.8299 25.9912 50.989 26.4771 50.989C26.963 50.989 27.4355 50.8299 27.8225 50.5361L31.1309 48.0383L36.5621 43.9276L47.6065 35.6567L47.6341 35.6346C49.9459 33.8863 51.6279 31.435 52.4273 28.6489C53.2268 25.8629 53.1004 22.8927 52.0673 20.1846Z" fill="#E24329"/>
                <path d="M52.0676 20.1845L51.9932 19.9943C48.4816 20.7151 45.1725 22.2025 42.3024 24.3503L26.4746 36.3183C31.8645 40.3959 36.5569 43.9386 36.5569 43.9386L47.6013 35.6677L47.6289 35.6456C49.944 33.8974 51.6286 31.4444 52.4291 28.656C53.2297 25.8676 53.1028 22.8946 52.0676 20.1845Z" fill="#FC6D26"/>
                <path d="M16.3926 43.9386L21.8238 48.0493L25.1322 50.5471C25.5192 50.8409 25.9917 51 26.4776 51C26.9635 51 27.436 50.8409 27.823 50.5471L31.1314 48.0493L36.5626 43.9386C36.5626 43.9386 31.8647 40.3849 26.4748 36.3184C21.085 40.3849 16.3926 43.9386 16.3926 43.9386Z" fill="#FCA326"/>
                <path d="M10.6438 24.3503C7.77596 22.1981 4.46762 20.7068 0.955778 19.9833L0.884096 20.1735C-0.153346 22.8842 -0.281401 25.8587 0.519237 28.6485C1.31988 31.4383 3.0058 33.8921 5.32282 35.6401L5.34764 35.6594L5.4138 35.7063L16.3921 43.9276C16.3921 43.9276 21.0789 40.3849 26.4743 36.3073L10.6438 24.3503Z" fill="#FC6D26"/>
              </svg>
        </button>
    </div>
</div>

<div class="divider">
    <span>or sign in via email</span>
</div>
    

<div class="form-container">
    <div class="email-container">
        <i class="icon-left">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M16.5 12a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0Zm0 0c0 1.657 1.007 3 2.25 3S21 13.657 21 12a9 9 0 1 0-2.636 6.364M16.5 12V8.25" />
              </svg>
              
        </i>
        <input placeholder="Email" autocomplete="email" type="email" class="email-input" id="email-signin" bind:value={email}>
    </div>
    <div class="password-container">
        <i class="icon-left">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-6 h-6">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
              </svg>
              
        </i>
        <input placeholder="Password" autocomplete="current-password" type="password" class="password-input" id="password-signin" bind:value={password}>
    </div>
    <button type="submit" id="signin-commit-button" class="btn" on:click={handleSignIn}>
        Sign in
    </button>
    <div class="link-container">
        <a class="reset-password" href="codesphere.com">Forgot your password?</a>
    </div>
    <p id="Errormessage" class="Errormessage" >{errorMessage}</p>
</div>

