#!/bin/bash

# run from project root
# Navigate to browser service directory
cd browser_service;

source venv/bin/activate;

cd ..

# Start the FastAPI server using uvicorn
python -m uvicorn browser_service.server:app --reload --port 3001
