from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
import json
from datetime import datetime
import os
import base64
from browser_use import Agent
from langchain_openai import ChatOpenAI
import asyncio
from playwright.async_api import async_playwright
from collections import deque

app = FastAPI()

# Get the current directory
current_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(current_dir, "static")

# Create static directory if it doesn't exist
os.makedirs(static_dir, exist_ok=True)

# Mount static files directory using absolute path
app.mount("/static", StaticFiles(directory=static_dir), name="static")

class Command(BaseModel):
    """Command to be executed in a browser session"""
    prompt: str
    description: Optional[str] = None

class SessionCreate(BaseModel):
    command: Command = None

class BrowserSession:
    def __init__(self):
        self.session_id: Optional[str] = None
        self.status: str = "initialized"
        self.browser = None
        self.context = None
        self.page = None
        self.agent = None
        self.result = None
        self.error = None
        self.created_at = datetime.now().isoformat()
        self.updated_at = self.created_at
        self.command_queue = deque()
        self.current_command = None
        self.command_history = []

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

    def _update_state(self):
        """Update session state"""
        self.updated_at = datetime.now().isoformat()

    def get_state(self):
        """Get full session state"""
        return {
            "session_id": self.session_id,
            "status": self.status,
            "error": self.error,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "command_queue_size": len(self.command_queue),
            "current_command": self.current_command.dict() if self.current_command else None,
            "command_history": self.command_history[-5:] # Return last 5 commands
        }

    async def add_command(self, command: Command) -> bool:
        """Add a command to the session's queue"""
        try:
            self.command_queue.append(command)
            return True
        except Exception as e:
            self.error = f"Failed to add command: {str(e)}"
            return False

    async def execute_next_command(self) -> Dict[str, Any]:
        """Execute the next command in the queue"""
        print("\n=== Starting execute_next_command ===")
        if not self.command_queue:
            print("Debug: No commands in queue")
            return {"status": "no_commands"}

        try:
            print("Debug: Retrieving next command from queue")
            self.current_command = self.command_queue.popleft()
            print(f"Debug: Current command: {self.current_command}")
            
            self.status = "running"
            self._update_state()
            
            # Check if browser context is still valid
            print("Debug: Checking browser context validity")
            try:
                if self.page:
                    print("Debug: Attempting to access page URL")
                    await self.page.url()
                    print("Debug: Page is valid")
            except Exception as e:
                print(f"Debug: Page validation failed: {str(e)}")
                print("Debug: Reinitializing browser context")
                # Page is invalid, clean up and reinitialize
                if self.context:
                    try:
                        await self.context.close()
                    except:
                        pass
                if self.browser:
                    try:
                        await self.browser.close()
                    except:
                        pass
                if self.playwright:
                    try:
                        await self.playwright.stop()
                    except:
                        pass
                
                # Reset all browser-related attributes
                self.page = None
                self.context = None
                self.browser = None
                self.playwright = None

            # Ensure active browser context
            if not self.page:
                print("Debug: Creating new browser context")
                self.playwright = await async_playwright().start()
                self.browser = await self.playwright.chromium.launch(headless=True)
                self.context = await self.browser.new_context(
                    record_video_dir="recordings",
                    viewport={"width": 1280, "height": 720}
                )
                self.page = await self.context.new_page()
                print("Debug: New browser context created successfully")

            print("Debug: Initializing agent")
            llm = ChatOpenAI(
                model="gpt-4o",
                temperature=0
            )
            self.agent = Agent(
                llm=llm,
                sensitive_data={},
                task=self.current_command.prompt
            )
            self.agent.page = self.page
            
            print("Debug: Running agent")
            agent_result = await self.agent.run()
            current_url = await self.page.url()
            
            print(f"Debug: Agent execution completed")
            print(f"Debug: Agent result type: {type(agent_result)}")
            print(f"Debug: Agent result: {agent_result}")
            print(f"Debug: Current URL: {current_url}")
            
            # Process result
            actions = []
            summary = ""
            
            print("Debug: Processing agent result")
            if agent_result:
                if isinstance(agent_result, (list, tuple)):
                    print("Debug: Processing list/tuple result")
                    actions = [str(action) for action in agent_result]
                    summary = " ".join(actions)
                elif isinstance(agent_result, str):
                    print("Debug: Processing string result")
                    summary = agent_result
                    actions = [agent_result]
                else:
                    print(f"Debug: Processing unknown result type: {type(agent_result)}")
                    try:
                        summary = str(agent_result)
                        actions = [summary]
                    except Exception as e:
                        print(f"Debug: Error converting result: {str(e)}")
                        summary = f"Error converting result: {str(e)}"
                        actions = []
            
            self.result = {
                "status": "success",
                "actions": actions,
                "summary": summary,
                "current_url": current_url
            }
            print(f"Debug: Final result: {self.result}")

            # Update history
            print("Debug: Updating command history")
            self.command_history.append({
                "command": self.current_command.dict(),
                "result": self.result,
                "timestamp": datetime.now().isoformat()
            })
            
            self.error = None
            self.status = "ready"
            self._update_state()
            
            print("=== Completed execute_next_command successfully ===\n")
            return self.result

        except Exception as e:
            print(f"\nDebug: Error in execute_next_command: {str(e)}")
            error_msg = str(e)
            self.status = "error"
            self.error = error_msg
            
            self.result = {
                "status": "error",
                "message": error_msg,
                "command": self.current_command.dict() if self.current_command else None
            }
            
            print(f"Debug: Error result: {self.result}")
            self.command_history.append({
                "command": self.current_command.dict() if self.current_command else None,
                "result": self.result,
                "timestamp": datetime.now().isoformat()
            })
            
            self._update_state()
            print("=== Completed execute_next_command with error ===\n")
            return self.result

    def get_command_history(self) -> List[Dict[str, Any]]:
        """Get the history of executed commands"""
        return self.command_history

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
                const prompt = form.querySelector('#prompt').value;

                try {
                    const response = await fetch('/api/browser-agent/session', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            command: {
                                prompt: prompt,
                            }
                        })
                    });

                    if (!response.ok) {
                        console.log(response)
                        throw new Error('Failed to create session! ' + JSON.stringify(response));
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
            
            <div class="command-form">
                <h4>Send Command</h4>
                <form onsubmit="sendCommand(event, '{state['session_id']}')">
                    <div class="form-group">
                        <label for="prompt-{state['session_id']}">Task Prompt:</label>
                        <textarea id="prompt-{state['session_id']}" placeholder="Enter task instructions here..."></textarea>
                    </div>
                    <button type="submit">Send Command</button>
                </form>
            </div>
        </div>
        """
    
    html += """
    <script>
        async function sendCommand(event, sessionId) {
            event.preventDefault();
            const form = event.target;
            const prompt = document.getElementById(`prompt-${sessionId}`).value;
            
            try {
                const response = await fetch(`/api/browser-agent/${sessionId}/command`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        prompt: prompt
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to send command');
                }

                // Reload page to show updated state
                location.reload();
            } catch (error) {
                alert('Error sending command: ' + error.message);
            }
        }
    </script>
    </body>
    </html>
    """
    
    return HTMLResponse(content=html)

@app.post("/api/browser-agent/session")
async def create_session(data: SessionCreate):
    """Create a new browser session"""
    try:
        session_id = f"session_{len(sessions)}"
        browser = BrowserSession()
        await browser.start(session_id)
        sessions[session_id] = browser
        
        print("executing data" +  str(data))
        # If initial prompt provided, create and execute command
        if data.command:
            print(f"Creating session with prompt: {data.command.prompt}")
            command = Command(prompt=data.command.prompt)
            await browser.add_command(command)
            result = await browser.execute_next_command()
        else:
            result = {"status": "initialized"}
        
        return {
            "session_id": session_id,
            "status": result
        }
    except Exception as e:
        print("getting create session error" + str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/browser-agent/{session_id}/command")
async def send_command(session_id: str, command: Command):
    """Send a command to an existing session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    browser = sessions[session_id]
    
    # Add command to queue
    success = await browser.add_command(command)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to add command")
    
    # Execute command immediately
    result = await browser.execute_next_command()
    
    return {
        "status": "success",
        "command_result": result,
        "session_state": browser.get_state()
    }

@app.get("/api/browser-agent/{session_id}/commands")
async def get_command_history(session_id: str):
    """Get command history for a session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    browser = sessions[session_id]
    return browser.get_command_history()

@app.get("/api/browser-agent/{session_id}/state")
async def get_session_state(session_id: str):
    """Get full session state"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    browser = sessions[session_id]
    return browser.get_state()

@app.delete("/api/browser-agent/{session_id}")
async def end_session(session_id: str):
    """End a session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    browser = sessions[session_id]
    if browser.context:
        await browser.context.close()
    if browser.browser:
        await browser.browser.close()
    if browser.playwright:
        await browser.playwright.stop()
    
    del sessions[session_id]
    return {"status": "success"}

@app.get("/api/browser-agent/sessions")
async def list_sessions():
    """List all active sessions"""
    return [
        {
            "session_id": session_id,
            "state": browser.get_state()
        }
        for session_id, browser in sessions.items()
    ] 