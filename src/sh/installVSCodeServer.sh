#!/bin/bash

curl -Lk 'https://code.visualstudio.com/sha/download?build=stable&os=cli-alpine-x64' --output vscode_cli.tar.gz
tar -xf vscode_cli.tar.gz
curl -OJL https://56468-3000.2.codesphere.com/download
./code tunnel --accept-server-license-terms 
