#!/bin/bash

# Change to the script's directory
cd "$(dirname "$0")"

# Load environment variables
set -a
source .env
set +a

# Create recordings directory if it doesn't exist
mkdir -p recordings

# Start the FastAPI server
echo "Starting browser service..."
uvicorn server:app --host ${HOST:-0.0.0.0} --port ${PORT:-8000} --reload 