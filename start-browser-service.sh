#!/bin/bash
cd python_service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn browser_use.server:app --reload --port 3001
