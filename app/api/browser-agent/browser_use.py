from playwright.async_api import async_playwright
import asyncio
import base64
from io import BytesIO

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
        return await self.page.screenshot()

    async def current_url(self):
        return self.page.url

    async def close(self):
        if self.browser:
            await self.browser.close()
        if self._playwright:
            await self._playwright.stop()

class BrowserUse:
    def __init__(self):
        self.sessions = {}

    async def create_session(self, session_id):
        session = BrowserSession()
        await session.start()
        self.sessions[session_id] = session
        return session

    async def get_session(self, session_id):
        return self.sessions.get(session_id)

    async def delete_session(self, session_id):
        session = self.sessions.get(session_id)
        if session:
            await session.close()
            del self.sessions[session_id]

browser_use = BrowserUse() 