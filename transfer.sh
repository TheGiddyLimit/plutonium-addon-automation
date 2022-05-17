#!/usr/bin/env bash

set -e

# A script to build the module and copy it into a Foundry data directory.

if [[ $# -eq 0 ]]; then
    echo "No arguments provided. Usage: ./transfer.sh <path_to_user_Data_dir>"
    exit 1
fi

echo "Removing existing module..."
rm -rf "${1}/modules/plutonium-addon-automation"

echo "Building..."
npm run build

echo "Transferring..."
cp -rf dist/plutonium-addon-automation "${1}/modules/"
echo "Done!"
