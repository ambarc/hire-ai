from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from typing import Optional, Dict, List, Any
import json
from datetime import datetime
import os
from browser_use import Agent, Browser, BrowserConfig
from langchain_openai import ChatOpenAI
from collections import deque
import uuid
import asyncio

app = FastAPI(title="Browser Agent", description="A service that orchestrates browser agents given commands.")

# Get the current directory
current_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(current_dir, "static")

# Create static directory if it doesn't exist
os.makedirs(static_dir, exist_ok=True)

# Mount static files directory at both paths
app.mount("/static", StaticFiles(directory=static_dir), name="static")
app.mount("/browser-agent/static", StaticFiles(directory=static_dir), name="browser_agent_static")

class Command(BaseModel):
    """Command to be executed in a browser session"""
    prompt: str
    description: Optional[str] = None
    id: Optional[str] = None

class SessionCreate(BaseModel):
    command: Command = None

def get_browser():
    # TODO: Make this configurable
    browser = Browser(
        config=BrowserConfig(
            chrome_instance_path='/usr/bin/chromium'
        )
    )
    return browser

class BrowserSession:
    def __init__(self):
        self.session_id: Optional[str] = None
        self.status: str = "initialized"
        self.browser: Optional[Browser] = None
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
        # Create a persistent browser instance
        self.browser = get_browser()
        self._update_state()

    async def ensure_healthy_browser(self) -> bool:
        """Ensure browser is healthy and reinitialize if needed"""
        try:
            if not self.browser:
                print("Debug: No browser instance exists, creating new one")
                self.browser = get_browser()
                return True
            
            # Try to access browser to check health
            print("Debug: Checking browser health")
            async with await self.browser.new_context() as context:
                page = await context.new_page()
                await page.goto('about:blank')
                await page.close()
            print("Debug: Browser health check passed")
            return True
            
        except Exception as e:
            print(f"Debug: Browser health check failed: {str(e)}")
            try:
                # Clean up old browser
                if self.browser:
                    await self.browser.close()
            except:
                pass
            
            # Create new browser
            print("Debug: Reinitializing browser")
            self.browser = get_browser()
            return True

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
  
            # Ensure browser is healthy
            print("Debug: Ensuring browser health")
            if not await self.ensure_healthy_browser():
                raise Exception("Failed to ensure healthy browser")

            print("Debug: Creating new context for agent")
            print("Debug: Initializing agent")
            llm = ChatOpenAI(
                model="gpt-4o",
                temperature=0
            )
            print("Debug: self browser" + str(self.browser))
            self.agent = Agent(
                llm=llm,
                sensitive_data={},
                task=self.current_command.prompt,
                browser=self.browser,
            )

            print("Debug: Running agent")
            agent_result = await self.agent.run()
            
            print(f"Debug: Agent execution completed")
            print(f"Debug: Agent result type: {type(agent_result)}")
            print(f"Debug: Agent result: {agent_result}")
            
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
            
            history = await self.agent.run()
            last_url = history.urls()[-1]
            self.result = {
                "status": "success",
                "command_id": self.current_command.id,
                "actions": actions,
                "summary": summary,
                "last_url": last_url
            }
            print(f"Debug: Final result: {self.result}")

            # Update history
            print("Debug: Updating command history")
            self.command_history.append({
                "command": self.current_command.dict(),
                "command_id": self.current_command.id,
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
                "command": self.current_command.dict() if self.current_command else None,
                "command_id": self.current_command.id if self.current_command else None
            }
            
            print(f"Debug: Error result: {self.result}")
            self.command_history.append({
                "command": self.current_command.dict() if self.current_command else None,
                "command_id": self.current_command.id if self.current_command else None,
                "result": self.result,
                "timestamp": datetime.now().isoformat()
            })
            
            self._update_state()
            print("=== Completed execute_next_command with error ===\n")
            return self.result

    def get_command_history(self) -> List[Dict[str, Any]]:
        """Get the history of executed commands"""
        return self.command_history

    async def cleanup(self):
        """Clean up browser resources"""
        if self.browser:
            try:
                await self.browser.close()
            except Exception as e:
                print(f"Error closing browser: {str(e)}")
        self.browser = None

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
        <script>
            // Determine if we're being accessed through Next.js
            const isNextJs = window.location.pathname.startsWith('/browser-agent');
            // API calls always use /api/browser-agent when through Next.js
            const apiBaseUrl = isNextJs ? '/api/browser-agent' : '/api/browser-agent';
            // Static files use /browser-agent/static when through Next.js
            const staticBaseUrl = isNextJs ? '/browser-agent/static' : '/static';
        </script>
        <link rel="stylesheet" id="debug-css">
        <script>
            // Set the CSS href dynamically
            document.getElementById('debug-css').href = `${staticBaseUrl}/css/debug.css`;

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
                    const response = await fetch(`${apiBaseUrl}/session`, {
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
                const response = await fetch(`${apiBaseUrl}/${sessionId}/command`, {
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
        session_id = str(uuid.uuid4())
        browser_session = BrowserSession()
        await browser_session.start(session_id)
        sessions[session_id] = browser_session
        
        print("executing data" +  str(data))
        # If initial prompt provided, add command to queue but don't wait for execution
        command_id = None
        if data.command:
            print(f"Creating session with prompt: {data.command.prompt}")
            command = Command(prompt=data.command.prompt)
            # Assign a UUID to the command
            command.id = str(uuid.uuid4())
            command_id = command.id
            await browser_session.add_command(command)
            
            # Start command execution in background without awaiting the result
            asyncio.create_task(browser_session.execute_next_command())
        
        return {
            "session_id": session_id,
            "status": "initialized",
            "command_id": command_id
        }
    except Exception as e:
        print("getting create session error" + str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/browser-agent/{session_id}/command")
async def send_command(session_id: str, command: Command):
    """Send a command to an existing session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    browser_session = sessions[session_id]
    
    # Assign a UUID to the command if it doesn't have one
    if not command.id:
        command.id = str(uuid.uuid4())
    
    # Add command to queue
    add_result = await browser_session.add_command(command)
    
    # Start command execution in background without awaiting the result
    asyncio.create_task(browser_session.execute_next_command())
    
    return {
        "status": "success",
        "command_id": command.id,
        "session_id": session_id
    }

@app.get("/api/browser-agent/{session_id}/commands")
async def get_command_history(session_id: str):
    """Get command history for a session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    browser_session = sessions[session_id]
    return browser_session.get_command_history()

@app.get("/api/browser-agent/{session_id}/state")
async def get_session_state(session_id: str):
    """Get full session state"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    browser_session = sessions[session_id]
    return browser_session.get_state()

@app.delete("/api/browser-agent/{session_id}")
async def end_session(session_id: str):
    """End a session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    browser_session = sessions[session_id]
    await browser_session.cleanup()
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