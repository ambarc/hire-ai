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

class Command(BaseModel):
    command: str

class BrowserSession:
    def __init__(self):
        self.agent = None
        self.browser = None
        self.session_id = None
        self.status = "initializing"
        self.task_data = {}
        self.last_screenshot = None
        self.current_prompt = None

    async def start(self, session_id: str):
        self.session_id = session_id
        self.status = "started"
        
        # Initialize browser with proper configuration
        self.browser = Browser(
            config=BrowserConfig(
                # NOTE: you need to close your chrome browser - so that this can open your browser in debug mode
                chrome_instance_path='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            )
        )
        
        await broadcast_page_update(self.session_id, "status", {
            "status": self.status
        })

    async def execute_prompt(self, prompt: str, url: str):
        """Execute a prompt using browser-use's Agent"""
        try:
            self.current_prompt = prompt
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
                task=task
            )

            try:
                # Run the agent
                result = await self.agent.run()
                
                self.status = "completed"
                self.task_data = result

                # Get the final screenshot and URL if available
                # screenshot = None
                # final_url = None
                # if self.browser and self.browser.page:
                #     try:
                #         screenshot_bytes = await self.browser.page.screenshot()
                #         if screenshot_bytes:
                #             buffered = BytesIO(screenshot_bytes)
                #             screenshot = base64.b64encode(buffered.getvalue()).decode()
                #         final_url = self.browser.page.url
                #     except Exception as e:
                #         print(f"Error capturing final state: {str(e)}")

                await broadcast_page_update(self.session_id, "prompt_completed", {
                    "status": self.status,
                    # "screenshot": screenshot,
                    # "url": final_url or url,
                    "result": result
                })

                return result

            except Exception as e:
                print(f"Error executing prompt: {str(e)}")
                self.status = "error"
                await broadcast_page_update(self.session_id, "error", {
                    "error": f"Failed to execute prompt: {str(e)}",
                    "status": self.status
                })
                raise

        except Exception as e:
            self.status = "error"
            await broadcast_page_update(self.session_id, "error", {
                "error": str(e),
                "status": self.status
            })
            raise

    async def close(self):
        try:
            if self.browser:
                await self.browser.close()
            self.status = "closed"
        except Exception as e:
            self.status = "error"
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
        
        sessions[session_id] = {
            "browser": browser,
            "status": browser.status,
            "prompt": data.prompt,
            "created_at": datetime.now().isoformat()
        }

        if data.url and data.prompt:
            # Execute the prompt with the agent
            result = await browser.execute_prompt(data.prompt, data.url)
            return {
                "session_id": session_id,
                "status": browser.status,
                "prompt": data.prompt,
                "result": result
            }

        return {
            "session_id": session_id,
            "status": browser.status,
            "prompt": data.prompt
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/browser-agent/{session_id}")
async def get_session(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    browser = sessions[session_id]["browser"]
    return {
        "status": browser.status,
        "task_data": browser.task_data,
        "prompt": sessions[session_id]["prompt"],
        "created_at": sessions[session_id]["created_at"]
    }

@app.delete("/api/browser-agent/{session_id}")
async def delete_session(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        browser = sessions[session_id]["browser"]
        await browser.close()
        del sessions[session_id]
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/api/browser-agent/ws/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    try:
        if session_id not in sessions:
            await websocket.close(code=4000, reason="Session not found")
            return

        await websocket.accept()
        
        if session_id not in websocket_connections:
            websocket_connections[session_id] = []
        websocket_connections[session_id].append(websocket)

        # Send initial state
        browser = sessions[session_id]["browser"]
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

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=3001) 