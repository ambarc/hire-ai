#!/bin/bash

# Change to the script's directory
cd "$(dirname "$0")"

# Load environment variables if .env file exists
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

# Compile TypeScript
echo "Compiling TypeScript..."
npx tsc

# Create dist/public/admin directory if it doesn't exist
echo "Copying public files..."
mkdir -p dist/public/admin
cp -r public/admin/* dist/public/admin/

# Start the service
echo "Starting workflow service..."
node dist/src/index.js 