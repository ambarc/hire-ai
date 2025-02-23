# Browser Service

A stateful browser agent service that manages browser sessions using browser-use and Playwright.

## Features

- Create, pause, resume, and end browser sessions
- Execute tasks on existing sessions
- Debug UI for monitoring sessions
- Recording capability for browser sessions
- Command-based interaction with browser sessions

## Prerequisites

- Python 3.11+
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

## Usage

Start the service:
```bash
uvicorn server:app --reload --port 8000
```

### API Endpoints

- `POST /api/browser-agent` - Create new session
- `POST /api/browser-agent/{session_id}/task` - Add task to session
- `POST /api/browser-agent/{session_id}/command` - Send command to session
- `POST /api/browser-agent/{session_id}/pause` - Pause session
- `POST /api/browser-agent/{session_id}/resume` - Resume session
- `DELETE /api/browser-agent/{session_id}` - End session
- `GET /api/browser-agent/{session_id}/status` - Get session status
- `GET /api/browser-agent/{session_id}/commands` - Get command history
- `GET /api/browser-agent/sessions` - List all sessions

### Command Types

1. Navigate:
```json
{
    "type": "navigate",
    "data": {
        "url": "https://example.com"
    }
}
```

2. Click:
```json
{
    "type": "click",
    "data": {
        "selector": "#submit-button"
    }
}
```

3. Type:
```json
{
    "type": "type",
    "data": {
        "selector": "#search-input",
        "text": "search query"
    }
}
```

4. Custom (AI Agent):
```json
{
    "type": "custom",
    "data": {
        "prompt": "Search for Python documentation and click the first result"
    }
}
```

### Debug UI

Visit `http://localhost:8000` to access the debug UI showing all active sessions.

## Directory Structure

```
browser_service/
├── requirements.txt    # Python dependencies
├── server.py          # FastAPI server implementation
├── recordings/        # Browser session recordings
├── static/           # Static assets
│   └── css/          # CSS styles
├── .env              # Environment configuration
├── .env.example      # Example environment configuration
└── README.md         # This file
```

## Roadmap

### Near-term

1. Command Queue Processing
   - Background task processor for command queues
   - Priority queue support
   - Queue status monitoring
   - Command timeout handling
   - Retry mechanisms for failed commands

2. Session Management
   - Session persistence across server restarts
   - Session cleanup for inactive sessions
   - Session resource limits
   - Session sharing and collaboration

3. Enhanced Commands
   - Keyboard shortcuts and special keys
   - File upload/download handling
   - Screenshot commands
   - Network request interception
   - Cookie and local storage management

### Mid-term

1. Advanced Browser Features
   - Multiple browser tabs support
   - Cross-browser testing
   - Mobile device emulation
   - Network conditions simulation
   - Geolocation mocking

2. Monitoring and Analytics
   - Performance metrics
   - Command success rates
   - Session duration tracking
   - Resource usage monitoring
   - Error pattern analysis

3. Security Enhancements
   - Role-based access control
   - Session encryption
   - Rate limiting
   - Input validation and sanitization
   - Secure credential management

### Long-term

1. Scalability
   - Distributed session management
   - Load balancing
   - High availability setup
   - Session migration between nodes
   - Horizontal scaling

2. Integration Features
   - WebSocket real-time updates
   - Webhook support
   - External service integrations
   - Custom plugin system
   - API versioning

3. Advanced AI Features
   - Multi-agent collaboration
   - Learning from command history
   - Automated test generation
   - Visual element recognition
   - Natural language processing improvements 