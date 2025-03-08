#!/bin/bash

# run from project root
# Navigate to browser service directory
cd browser_service;

source venv/bin/activate;

cd ..

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    echo "Loading environment variables from .env file"
    export $(grep -v '^#' .env | xargs)
fi

# Set default connection mode if not specified
if [ -z "$CONNECTION_MODE" ]; then
    export CONNECTION_MODE="application"
    echo "Setting default CONNECTION_MODE to 'application'"
fi

# Start the FastAPI server using uvicorn
python -m uvicorn browser_service.server:app --reload --port 3001
