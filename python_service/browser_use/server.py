from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uvicorn
import asyncio
from playwright.async_api import async_playwright
import base64
from io import BytesIO

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
        self.browser = None
        self.context = None
        self.page = None
        self._playwright = None
        self.session_id = None

    async def start(self, session_id: str):
        self._playwright = await async_playwright().start()
        self.browser = await self._playwright.chromium.launch(headless=False)
        self.context = await self.browser.new_context()
        self.page = await self.context.new_page()
        self.session_id = session_id

        # Set up page event listeners for streaming
        self.page.on("load", self._on_page_load)
        self.page.on("framenavigated", self._on_navigation)
        self.page.on("domcontentloaded", self._on_dom_content_loaded)

    async def _on_page_load(self):
        if self.session_id:
            screenshot = await self.screenshot()
            await broadcast_page_update(self.session_id, "page_load", {
                "screenshot": screenshot,
                "url": await self.current_url()
            })

    async def _on_navigation(self, frame):
        if frame == self.page.main_frame and self.session_id:
            await broadcast_page_update(self.session_id, "navigation", {
                "url": await self.current_url()
            })

    async def _on_dom_content_loaded(self):
        if self.session_id:
            screenshot = await self.screenshot()
            await broadcast_page_update(self.session_id, "dom_content_loaded", {
                "screenshot": screenshot
            })

    async def goto(self, url):
        await self.page.goto(url)
        screenshot = await self.screenshot()
        if self.session_id:
            await broadcast_page_update(self.session_id, "navigation", {
                "screenshot": screenshot,
                "url": url
            })

    async def execute(self, command):
        result = None
        if command.startswith('click'):
            selector = command.split(' ', 1)[1]
            await self.page.click(selector)
            result = {"action": "click", "selector": selector}
        elif command.startswith('type'):
            parts = command.split(' ', 2)
            selector = parts[1]
            text = parts[2]
            await self.page.fill(selector, text)
            result = {"action": "type", "selector": selector, "text": text}
        elif command.startswith('wait'):
            selector = command.split(' ', 1)[1]
            await self.page.wait_for_selector(selector)
            result = {"action": "wait", "selector": selector}
        else:
            # Default to evaluating JavaScript
            result = await self.page.evaluate(command)
            result = {"action": "evaluate", "result": result}

        # Send update after command execution
        screenshot = await self.screenshot()
        if self.session_id:
            await broadcast_page_update(self.session_id, "command_executed", {
                "screenshot": screenshot,
                "result": result
            })
        return result

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
            "status": "initializing",
            "prompt": data.prompt
        }

        if data.url:
            await browser.goto(data.url)
            sessions[session_id]["status"] = "running"

        return {
            "session_id": session_id,
            "status": sessions[session_id]["status"],
            "prompt": data.prompt
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/browser-agent/{session_id}/execute")
async def execute_command(session_id: str, command: Command):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")

    try:
        browser = sessions[session_id]["browser"]
        result = await browser.execute(command.command)

        # Check if this is a completion command
        if "complete" in command.command.lower() or "finish" in command.command.lower():
            screenshot = await browser.screenshot()
            url = await browser.current_url()
            
            sessions[session_id]["status"] = "completed"
            sessions[session_id]["result"] = {
                "type": "browser-use",
                "data": result,
                "screenshot": screenshot,
                "url": url
            }

        return {
            "success": True,
            "result": result,
            "status": sessions[session_id]["status"]
        }
    except Exception as e:
        sessions[session_id]["status"] = "error"
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/browser-agent/{session_id}")
async def get_session(session_id: str):
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    session = sessions[session_id]
    return {
        "status": session["status"],
        "result": session.get("result")
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
    if session_id not in sessions:
        await websocket.close(code=4000)
        return

    await websocket.accept()
    
    if session_id not in websocket_connections:
        websocket_connections[session_id] = []
    websocket_connections[session_id].append(websocket)

    try:
        while True:
            # Keep connection alive and wait for client messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        websocket_connections[session_id].remove(websocket)
        if not websocket_connections[session_id]:
            del websocket_connections[session_id]

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=3001) 