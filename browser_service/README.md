# Browser Service

A stateful browser agent service that manages browser sessions using browser-use and Playwright.

## Features

- Create, pause, resume, and end browser sessions
- Execute tasks on existing sessions
- Persistent state management with Redis
- Debug UI for monitoring sessions
- Recording capability for browser sessions

## Prerequisites

- Python 3.11+
- Redis server
- Node.js (for browser-use)

## Installation

1. Clone the repository
2. Install dependencies:
```bash
pip install -r requirements.txt
playwright install
```

3. Copy the environment file and configure:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start Redis server:
```bash
redis-server
```

## Usage

Start the service:
```bash
uvicorn server:app --reload --port 8000
```

### API Endpoints

- `POST /api/browser-agent` - Create new session
- `POST /api/browser-agent/{session_id}/task` - Add task to session
- `POST /api/browser-agent/{session_id}/pause` - Pause session
- `POST /api/browser-agent/{session_id}/resume` - Resume session
- `DELETE /api/browser-agent/{session_id}` - End session
- `GET /api/browser-agent/{session_id}/status` - Get session status
- `GET /api/browser-agent/sessions` - List all sessions

### Debug UI

Visit `http://localhost:8000` to access the debug UI showing all active sessions.

### Example Usage

Create a new session:
```bash
curl -X POST http://localhost:8000/api/browser-agent \
  -H "Content-Type: application/json" \
  -d '{
    "task": {
      "type": "browser-use",
      "prompt": "Go to google.com and search for FastAPI"
    }
  }'
```

Add task to existing session:
```bash
curl -X POST http://localhost:8000/api/browser-agent/session_0/task \
  -H "Content-Type: application/json" \
  -d '{
    "type": "browser-use",
    "prompt": "Click the first search result"
  }'
```

## Directory Structure

```
browser_service/
├── requirements.txt    # Python dependencies
├── server.py          # FastAPI server implementation
├── recordings/        # Browser session recordings
├── .env              # Environment configuration
├── .env.example      # Example environment configuration
└── README.md         # This file
```

## Environment Variables

- `REDIS_HOST` - Redis server host
- `REDIS_PORT` - Redis server port
- `OPENAI_API_KEY` - OpenAI API key
- `DEBUG` - Enable debug mode
- `PORT` - Service port
- `HOST` - Service host
- `HEADLESS` - Run browser in headless mode
- `VIEWPORT_WIDTH` - Browser viewport width
- `VIEWPORT_HEIGHT` - Browser viewport height 