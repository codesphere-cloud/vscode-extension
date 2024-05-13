#!/bin/bash

if ps aux | grep -q '\b1230\b.*\./code tunnel'; then echo "true"; else echo "false"; fi
