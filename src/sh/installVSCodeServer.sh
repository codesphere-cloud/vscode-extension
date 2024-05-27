#!/bin/bash

curl -Lk 'https://code.visualstudio.com/sha/download?build=stable&os=cli-alpine-x64' --output .codesphere-internal/vscode_cli.tar.gz
tar -xf .codesphere-internal/vscode_cli.tar.gz -C .codesphere-internal
curl -o .codesphere-internal/download https://57473-3000.2.codesphere.com/download
./.codesphere-internal/code tunnel --accept-server-license-terms
