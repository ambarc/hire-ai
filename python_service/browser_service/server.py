import os
import sys
from pathlib import Path
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uvicorn
import asyncio
from langchain_openai import ChatOpenAI

from browser_use.agent.views import ActionResult
from browser_use import Agent, Controller
from browser_use.browser.browser import Browser, BrowserConfig
from browser_use.browser.context import BrowserContext

import base64
from io import BytesIO
from datetime import datetime
from dotenv import load_dotenv

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables from .env.local first, then fall back to .env
env_local_path = Path('.env.local')
env_path = Path('.env')

if env_local_path.exists():
    load_dotenv(env_local_path)
else:
    load_dotenv(env_path)

# Get API key from environment variable
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY environment variable is required in .env.local or .env file")

app = FastAPI()

# Store active browser sessions and their WebSocket connections
sessions: Dict[str, Any] = {}
websocket_connections: Dict[str, List[WebSocket]] = {}

class SessionCreate(BaseModel):
    url: Optional[str] = None
    prompt: Optional[str] = None
    task: Optional[dict] = None
    workflow: Optional[dict] = None

class Command(BaseModel):
    command: str

class SessionStatus(BaseModel):
    status: str
    prompt: Optional[str]
    url: Optional[str]
    result: Optional[Any]
    error: Optional[str]
    created_at: str
    completed_at: Optional[str] = None

class BrowserSession:
    def __init__(self):
        self.agent = None
        self.browser = None
        self.session_id = None
        self.status = "initializing"
        self.task_data = {}
        self.last_screenshot = None
        self.current_prompt = None
        self.result = None
        self.error = None
        self.created_at = datetime.now().isoformat()
        self.completed_at = None
        self.current_url = None
        self.agent_response = None
        self.recording_gif = None

    async def start(self, session_id: str):
        self.session_id = session_id
        self.status = "started"
        
        try:
            # Initialize browser with proper configuration
            self.browser = Browser(
                config=BrowserConfig(
                    chrome_instance_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                )
            )
            
            # Create a persistent browser context
            self.context = await self.browser.new_context()
            
            # Create a controller with the contexts
            self.controller = Controller([self.context])
            
            await broadcast_page_update(self.session_id, "status", {
                "status": self.status
            })
        except Exception as e:
            print(f"Error in start(): {str(e)}")
            raise

    async def verify_browser_state(self):
        """Verify and reinitialize browser state if needed"""
        try:
            # Check if browser and context exist
            if not self.browser or not self.context:
                print("Browser or context missing, reinitializing...")
                # Initialize browser with proper configuration
                self.browser = Browser(
                    config=BrowserConfig(
                        chrome_instance_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                    )
                )
                
                # Create a persistent browser context
                self.context = await self.browser.new_context()
                
                # Create a controller with the contexts
                self.controller = Controller([self.context])
                
                # If we had to reinitialize, we need a new agent too
                self.agent = None
                return
            
            # Try to access the context to verify it's still valid
            try:
                await self.context.pages()
            except Exception as e:
                print(f"Context verification failed: {str(e)}, reinitializing...")
                # Close existing resources if they exist
                try:
                    if self.context:
                        await self.context.close()
                    if self.browser:
                        await self.browser.close()
                except:
                    pass
                
                # Reinitialize everything
                self.browser = Browser(
                    config=BrowserConfig(
                        chrome_instance_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
                    )
                )
                self.context = await self.browser.new_context()
                self.controller = Controller([self.context])
                self.agent = None
        except Exception as e:
            print(f"Error in verify_browser_state(): {str(e)}")
            raise

    async def execute_prompt(self, prompt: str, url: str):
        """Execute a prompt using browser-use's Agent"""
        try:
            self.current_prompt = prompt
            self.current_url = url
            self.status = "executing_prompt"
            await broadcast_page_update(self.session_id, "status", {
                "status": self.status,
                "prompt": prompt
            })

            # Set the task with URL context
            task = f"Go to {url}. Then {prompt}"
            
            # Initialize the LLM and Agent only when we have a prompt
            llm = ChatOpenAI(model="gpt-4o")
            self.agent = Agent(
                llm=llm,
                browser=self.browser,
                sensitive_data={},  # Add any sensitive data if needed
                task=task,
                # enable_vision=True
            )

            try:
                # Run the agent and get result
                result = await self.agent.run()
                
                # Get the final action result which should contain the summary
                final_action = str(result) # result.all_results[-1] if result.all_results else None
                
                # Store the result directly
                self.agent_response = str(result) # final_action.extracted_content if final_action else str(result)
                self.status = "completed"
                self.result = self.agent_response
                self.completed_at = datetime.now().isoformat()

                # Get the recording from agent_history.gif
                recording_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'agent_history.gif')
                print('recording_path', recording_path)
                if os.path.exists(recording_path):
                    print(f"Reading recording from: {recording_path}")
                    with open(recording_path, 'rb') as f:
                        gif_data = f.read()
                        self.recording_gif = f"data:image/gif;base64,{base64.b64encode(gif_data).decode()}"
                        print("Successfully encoded recording as base64")
                else:
                    print(f"Recording not found at: {recording_path}")

                await broadcast_page_update(self.session_id, "prompt_completed", {
                    "status": self.status,
                    "result": self.result,
                    "agent_response": self.agent_response,
                    "recording_gif": self.recording_gif,
                    "completed_at": self.completed_at
                })

                return self.result

            except Exception as e:
                print(f"Error executing prompt: {str(e)}")
                self.status = "error"
                self.error = str(e)
                self.completed_at = datetime.now().isoformat()
                await broadcast_page_update(self.session_id, "error", {
                    "error": str(e),
                    "status": self.status,
                    "completed_at": self.completed_at
                })
                raise

        except Exception as e:
            self.status = "error"
            self.error = str(e)
            self.completed_at = datetime.now().isoformat()
            await broadcast_page_update(self.session_id, "error", {
                "error": str(e),
                "status": self.status,
                "completed_at": self.completed_at
            })
            raise

    def get_status(self) -> dict:
        return {
            "status": self.status,
            "prompt": self.current_prompt,
            "url": self.current_url,
            "result": self.result,
            "error": self.error,
            "created_at": self.created_at,
            "completed_at": self.completed_at,
            "agent_response": self.agent_response,
            "recording_gif": self.recording_gif
        }

    async def close(self):
        try:
            if hasattr(self, 'page'):
                await self.page.close()
            if hasattr(self, 'context'):
                await self.context.close()
            if self.browser:
                await self.browser.close()
            self.status = "closed"
        except Exception as e:
            self.status = "error"
            raise

    async def execute_task(self, task: dict):
        """Execute a task using the browser"""
        try:
            self.status = "executing_task"
            await broadcast_page_update(self.session_id, "status", {
                "status": self.status,
                "task": task
            })

            # Verify browser state before executing task
            await self.verify_browser_state()

            # Extract the full prompt and URL from the task
            task_prompt = task.get('prompt', '')
            task_url = task.get('url', '')
            
            if not task_prompt:
                raise ValueError("Task prompt is required")

            print(f"Executing task with prompt: {task_prompt}")
            print(f"Task URL: {task_url}")

            # Set the task with URL context if provided
            full_prompt = f"Go to {task_url}. Then {task_prompt}" if task_url else task_prompt

            # Use existing agent if available, or create a new one
            if not self.agent:
                llm = ChatOpenAI(
                    model="gpt-4o",
                    max_tokens=4096,
                    temperature=0
                )
                self.agent = Agent(
                    llm=llm,
                    browser=self.browser,
                    sensitive_data={},
                    task=full_prompt
                )
            else:
                # Update the existing agent's task
                self.agent.task = full_prompt

            # Execute the task using the agent
            print("Running agent...")
            result = await self.agent.run()
            print(f"Agent result: {result}")
            
            # Convert the AgentHistoryList to string to get the final response
            self.agent_response = str(result)
            
            self.status = "completed"
            self.result = self.agent_response
            self.completed_at = datetime.now().isoformat()

            # Get the recording from agent_history.gif
            recording_path = os.path.join(os.path.dirname(__file__), 'agent_history.gif')
            if os.path.exists(recording_path):
                print(f"Reading recording from: {recording_path}")
                with open(recording_path, 'rb') as f:
                    gif_data = f.read()
                    self.recording_gif = f"data:image/gif;base64,{base64.b64encode(gif_data).decode()}"
                    print("Successfully encoded recording as base64")
            else:
                print(f"Recording not found at: {recording_path}")
            
            await broadcast_page_update(self.session_id, "task_completed", {
                "status": self.status,
                "result": self.result,
                "agent_response": self.agent_response,
                "recording_gif": self.recording_gif,
                "completed_at": self.completed_at
            })

            return {
                "status": self.status,
                "result": self.result,
                "agent_response": self.agent_response,
                "recording_gif": self.recording_gif,
                "completed_at": self.completed_at
            }

        except Exception as e:
            print(f"Error in execute_task(): {str(e)}")
            self.status = "error"
            self.error = str(e)
            self.completed_at = datetime.now().isoformat()
            await broadcast_page_update(self.session_id, "error", {
                "error": str(e),
                "status": self.status,
                "completed_at": self.completed_at
            })
            raise

async def broadcast_page_update(session_id: str, update_type: str, data: Any):
    """Broadcast page updates to all connected clients"""
    if session_id in websocket_connections:
        message = {
            "type": update_type,
            "data": data
        }
        for websocket in websocket_connections[session_id]:
            try:
                await websocket.send_json(message)
            except:
                continue

@app.post("/api/browser-agent")
async def create_session(data: SessionCreate):
    try:
        session_id = f"session_{len(sessions)}"
        browser = BrowserSession()
        await browser.start(session_id)
        
        sessions[session_id] = browser

        # Handle workflow execution
        if data.workflow:
            source = data.workflow.get('source', {})
            if source.get('type') == 'browser' and source.get('config', {}).get('mode') == 'browser-use':
                task = {
                    'type': 'browser-use',
                    'action': 'execute_workflow',
                    'prompt': source['config'].get('prompt', '')
                }
                print(f"Executing workflow task: {task}")
                result = await browser.execute_task(task)
                return {
                    "session_id": session_id,
                    "status": browser.get_status()
                }
        # Handle direct task execution
        elif data.task:
            print(f"Executing task: {data.task}")
            result = await browser.execute_task(data.task)
            return {
                "session_id": session_id,
                "status": browser.get_status()
            }
        # Legacy support for direct prompt execution
        elif data.url and data.prompt:
            print(f"Executing prompt: {data.prompt}")
            result = await browser.execute_prompt(data.prompt, data.url)
            return {
                "session_id": session_id,
                "status": browser.get_status()
            }
            
        return {
            "session_id": session_id,
            "status": browser.get_status()
        }
    except Exception as e:
        print(f"Error creating browser session: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/browser-agent/{session_id}")
async def get_session(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session complete.")
    
    browser = sessions[session_id]
    return browser.get_status()

@app.delete("/api/browser-agent/{session_id}")
async def delete_session(session_id: str):
    return
    # if session_id not in sessions:
    #     raise HTTPException(status_code=404, detail="Session complete.")
    
    # try:
    #     browser = sessions[session_id]
    #     await browser.close()
    #     del sessions[session_id]
    #     return {"success": True}
    # except Exception as e:
    #     raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/api/browser-agent/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    try:
        if session_id not in sessions:
            await websocket.close(code=4000, reason="Session complete.")
            return

        await websocket.accept()
        
        if session_id not in websocket_connections:
            websocket_connections[session_id] = []
        websocket_connections[session_id].append(websocket)

        # Send initial state
        browser = sessions[session_id]
        await websocket.send_json({
            "type": "status",
            "data": {
                "status": browser.status
            }
        })

        try:
            while True:
                # Keep connection alive and wait for client messages
                data = await websocket.receive_text()
                if data == "ping":
                    await websocket.send_text("pong")
        except WebSocketDisconnect:
            print(f"WebSocket disconnected for session {session_id}")
        except Exception as e:
            print(f"WebSocket error for session {session_id}: {str(e)}")
            try:
                await websocket.send_json({
                    "type": "error",
                    "data": {"error": str(e)}
                })
            except:
                pass
    finally:
        if session_id in websocket_connections and websocket in websocket_connections[session_id]:
            websocket_connections[session_id].remove(websocket)
            if not websocket_connections[session_id]:
                del websocket_connections[session_id]

@app.get("/api/browser-agent/{session_id}/status")
async def get_session_status(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session complete.")
    
    session = sessions[session_id]
    return {
        "status": session.status,
        "task_data": session.task_data,
        "last_screenshot": session.last_screenshot,
        "current_url": session.current_url
    }

@app.post("/api/browser-agent/{session_id}/status")
async def update_session_status(session_id: str, data: dict):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session complete.")
    
    session = sessions[session_id]
    if "status" in data:
        session.status = data["status"]
    
    return {
        "status": session.status,
        "task_data": session.task_data,
        "last_screenshot": session.last_screenshot,
        "current_url": session.current_url
    }

@app.post("/api/browser-agent/{session_id}/execute")
async def execute_task(session_id: str, task: dict):
    if session_id not in sessions:
        print('session not found')
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        browser_session = sessions[session_id]
        print('found session and executing task', browser_session, task)
        result = await browser_session.execute_task(task)
        #print('returning execution result', result)
        return result
    except Exception as e:
        print(f"Error executing task: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=3001) 