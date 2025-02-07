from fastapi import FastAPI, HTTPException
from playwright.async_api import async_playwright
from pydantic import BaseModel
from typing import Optional, Dict, Any
import base64
from io import BytesIO

# Store active browser sessions
sessions: Dict[str, Any] = {}

class SessionCreate(BaseModel):
    url: Optional[str] = None
    prompt: Optional[str] = None

class Command(BaseModel):
    command: str

class BrowserSession:
    def __init__(self):
        self.browser = None
        self.context = None
        self.page = None
        self._playwright = None

    async def start(self):
        self._playwright = await async_playwright().start()
        self.browser = await self._playwright.chromium.launch()
        self.context = await self.browser.new_context()
        self.page = await self.context.new_page()

    async def goto(self, url):
        await self.page.goto(url)

    async def execute(self, command):
        # Parse and execute commands
        if command.startswith('click'):
            selector = command.split(' ', 1)[1]
            await self.page.click(selector)
            return {"action": "click", "selector": selector}
        elif command.startswith('type'):
            parts = command.split(' ', 2)
            selector = parts[1]
            text = parts[2]
            await self.page.fill(selector, text)
            return {"action": "type", "selector": selector, "text": text}
        elif command.startswith('wait'):
            selector = command.split(' ', 1)[1]
            await self.page.wait_for_selector(selector)
            return {"action": "wait", "selector": selector}
        elif command == 'screenshot':
            screenshot = await self.page.screenshot()
            buffered = BytesIO(screenshot)
            img_str = base64.b64encode(buffered.getvalue()).decode()
            return {"action": "screenshot", "data": img_str}
        else:
            # Default to evaluating JavaScript
            result = await self.page.evaluate(command)
            return {"action": "evaluate", "result": result}

    async def screenshot(self):
        screenshot = await self.page.screenshot()
        buffered = BytesIO(screenshot)
        return base64.b64encode(buffered.getvalue()).decode()

    async def current_url(self):
        return self.page.url

    async def close(self):
        if self.browser:
            await self.browser.close()
        if self._playwright:
            await self._playwright.stop()

# Convert route handlers to regular async functions
async def create_session(data: SessionCreate):
    try:
        session = BrowserSession()
        await session.start()
        session_id = f"session_{len(sessions)}"
        
        sessions[session_id] = {
            "browser": session,
            "status": "initializing",
            "prompt": data.prompt
        }

        if data.url:
            await session.goto(data.url)
            sessions[session_id]["status"] = "running"

        return {
            "session_id": session_id, 
            "status": sessions[session_id]["status"],
            "prompt": data.prompt
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def execute_command(session_id: str, command: Command):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        session = sessions[session_id]["browser"]
        result = await session.execute(command.command)

        # Check if this is a completion command
        if "complete" in command.command.lower() or "finish" in command.command.lower():
            screenshot = await session.screenshot()
            url = await session.current_url()
            
            sessions[session_id]["status"] = "completed"
            sessions[session_id]["result"] = {
                "type": "browser-use",
                "data": result,
                "screenshot": screenshot,
                "url": url,
                "prompt": sessions[session_id]["prompt"]
            }

        return {
            "success": True,
            "result": result,
            "status": sessions[session_id]["status"],
            "prompt": sessions[session_id]["prompt"]
        }
    except Exception as e:
        sessions[session_id]["status"] = "error"
        raise HTTPException(status_code=500, detail=str(e))

async def get_session(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    return {
        "status": session["status"],
        "result": session.get("result"),
        "prompt": session.get("prompt")
    }

async def delete_session(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    try:
        session = sessions[session_id]["browser"]
        await session.close()
        del sessions[session_id]
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 