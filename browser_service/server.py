from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict, List
import json
from datetime import datetime
import os
import base64
from browser_use import Agent
from langchain_openai import ChatOpenAI
import asyncio
from playwright.async_api import async_playwright

app = FastAPI()

# Get the current directory
current_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(current_dir, "static")

# Create static directory if it doesn't exist
os.makedirs(static_dir, exist_ok=True)

# Mount static files directory using absolute path
app.mount("/static", StaticFiles(directory=static_dir), name="static")

class SessionCreate(BaseModel):
    url: Optional[str] = None
    prompt: Optional[str] = None
    task: Optional[dict] = None

class SessionState(BaseModel):
    session_id: str
    status: str = "initialized"  # initialized, running, paused, completed, error
    current_url: Optional[str] = None
    current_task: Optional[dict] = None
    last_error: Optional[str] = None
    created_at: str
    updated_at: str
    browser_context_id: Optional[str] = None

class BrowserSession:
    def __init__(self):
        self.session_id: Optional[str] = None
        self.status: str = "initialized"
        self.browser = None
        self.context = None
        self.page = None
        self.agent = None
        self.current_task = None
        self.result = None
        self.error = None
        self.recording_gif = None
        self.completed_at = None
        self.playwright = None
        self.created_at = datetime.now().isoformat()
        self.updated_at = self.created_at

    async def start(self, session_id: str):
        """Initialize browser session"""
        self.session_id = session_id
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(headless=True)
        self.context = await self.browser.new_context(
            record_video_dir="recordings",
            viewport={"width": 1280, "height": 720}
        )
        self.page = await self.context.new_page()
        self._update_state()

    async def pause(self):
        """Pause the current session"""
        if self.status == "running":
            self.status = "paused"
            self._update_state()
            return True
        return False

    async def resume(self):
        """Resume a paused session"""
        if self.status == "paused":
            self.status = "running"
            self._update_state()
            return True
        return False

    async def stop(self):
        """Stop and cleanup the session"""
        try:
            if self.context:
                await self.context.close()
            if self.browser:
                await self.browser.close()
            if self.playwright:
                await self.playwright.stop()
            return True
        except Exception as e:
            print(f"Error stopping session: {str(e)}")
            return False

    async def execute_task(self, task: dict):
        """Execute a task using the browser"""
        try:
            self.status = "running"
            self.current_task = task
            self._update_state()

            # Create or update agent
            if not self.agent:
                llm = ChatOpenAI(
                    model="gpt-4o",
                    temperature=0
                )
                self.agent = Agent(
                    llm=llm,
                    sensitive_data={},
                    task=task.get('prompt', '')
                )
            else:
                self.agent.task = task.get('prompt', '')

            # Execute the task
            result = await self.agent.run()
            self.result = str(result)
            self.status = "completed"
            self.completed_at = datetime.now().isoformat()

            # Get recording
            recording_path = os.path.join(os.path.dirname(__file__), 'agent_history.gif')
            if os.path.exists(recording_path):
                with open(recording_path, 'rb') as f:
                    gif_data = f.read()
                    self.recording_gif = f"data:image/gif;base64,{base64.b64encode(gif_data).decode()}"

            self._update_state()
            return self.get_status()

        except Exception as e:
            self.status = "error"
            self.error = str(e)
            self._update_state()
            raise

    def _update_state(self):
        """Update session state"""
        self.updated_at = datetime.now().isoformat()

    def get_status(self):
        """Get current session status"""
        return {
            "status": self.status,
            "current_task": self.current_task,
            "result": self.result,
            "error": self.error,
            "recording_gif": self.recording_gif,
            "completed_at": self.completed_at,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

    def get_state(self):
        """Get full session state"""
        return {
            "session_id": self.session_id,
            "status": self.status,
            "current_task": self.current_task,
            "result": self.result,
            "error": self.error,
            "recording_gif": self.recording_gif,
            "completed_at": self.completed_at,
            "created_at": self.created_at,
            "updated_at": self.updated_at
        }

# Store active sessions in memory
sessions: Dict[str, BrowserSession] = {}

@app.get("/", response_class=HTMLResponse)
async def get_debug_ui():
    """Return debug UI showing all sessions"""
    session_states = [
        session.get_state() for session in sessions.values()
    ]
    
    html = """
    <!DOCTYPE html>
    <html>
    <head>
        <title>Browser Agent Debug UI</title>
        <link rel="stylesheet" href="/static/css/debug.css">
        <script>
            // Auto-refresh page every 5 seconds
            function refreshPage() {
                if (!document.querySelector('form:focus-within')) {
                    location.reload();
                }
            }
            setInterval(refreshPage, 5000);

            // Handle form submission
            async function createSession(event) {
                event.preventDefault();
                const form = event.target;
                const url = form.querySelector('#url').value;
                const prompt = form.querySelector('#prompt').value;

                try {
                    const response = await fetch('/api/browser-agent', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            task: {
                                type: 'browser-use',
                                prompt: prompt,
                                url: url
                            }
                        })
                    });

                    if (!response.ok) {
                        throw new Error('Failed to create session');
                    }

                    // Reload page to show new session
                    location.reload();
                } catch (error) {
                    alert('Error creating session: ' + error.message);
                }
            }
        </script>
    </head>
    <body>
        <h1>Browser Agent Sessions</h1>

        <div class="create-form">
            <h2>Create New Session</h2>
            <form onsubmit="createSession(event)">
                <div class="form-group">
                    <label for="url">URL (optional):</label>
                    <input type="text" id="url" placeholder="https://example.com">
                </div>
                <div class="form-group">
                    <label for="prompt">Task Prompt:</label>
                    <textarea id="prompt" placeholder="Enter task instructions here..."></textarea>
                </div>
                <button type="submit">Create Session</button>
            </form>
        </div>
    """
    
    for state in session_states:
        status_class = state.get('status', 'unknown').lower()
        html += f"""
        <div class="session">
            <h3>Session ID: {state['session_id']}
                <span class="status {status_class}">{state['status']}</span>
            </h3>
            <pre>{json.dumps(state, indent=2)}</pre>
        </div>
        """
    
    html += """
    </body>
    </html>
    """
    
    return HTMLResponse(content=html)

@app.post("/api/browser-agent")
async def create_session(data: SessionCreate):
    """Create a new browser session"""
    try:
        session_id = f"session_{len(sessions)}"
        browser = BrowserSession()
        await browser.start(session_id)
        
        sessions[session_id] = browser
        
        if data.task:
            await browser.execute_task(data.task)
        
        return {
            "session_id": session_id,
            "status": browser.get_status()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/browser-agent/{session_id}/task")
async def add_task(session_id: str, task: dict):
    """Add a task to an existing session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    browser = sessions[session_id]
    result = await browser.execute_task(task)
    return result

@app.post("/api/browser-agent/{session_id}/pause")
async def pause_session(session_id: str):
    """Pause a session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    browser = sessions[session_id]
    success = await browser.pause()
    return {"success": success}

@app.post("/api/browser-agent/{session_id}/resume")
async def resume_session(session_id: str):
    """Resume a paused session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    browser = sessions[session_id]
    success = await browser.resume()
    return {"success": success}

@app.delete("/api/browser-agent/{session_id}")
async def end_session(session_id: str):
    """End a session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    browser = sessions[session_id]
    success = await browser.stop()
    if success:
        del sessions[session_id]
    return {"success": success}

@app.get("/api/browser-agent/{session_id}/status")
async def get_session_status(session_id: str):
    """Get session status"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    browser = sessions[session_id]
    return browser.get_status()

@app.get("/api/browser-agent/sessions")
async def list_sessions():
    """List all active sessions"""
    return [
        {
            "session_id": session_id,
            "status": browser.get_status()
        }
        for session_id, browser in sessions.items()
    ] 