#!/bin/bash

if [ -z "$USE_VSIX" ]; then
    USE_VSIX=false
fi

curl -Lk 'https://code.visualstudio.com/sha/download?build=stable&os=cli-alpine-x64' --output .codesphere-internal/vscode_cli.tar.gz
tar -xf .codesphere-internal/vscode_cli.tar.gz -C .codesphere-internal

./.codesphere-internal/code tunnel --accept-server-license-terms
