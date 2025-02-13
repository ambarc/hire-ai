import json
import uuid
import redis.asyncio as redis
from datetime import datetime
from typing import Dict, Any, Optional
from playwright.async_api import async_playwright

class BrowserSession:
    def __init__(self):
        self.browser = None
        self.current_page = None
        self.session_id = str(uuid.uuid4())
        self.context = None
        # Create Redis client
        self.redis = redis.Redis(
            host='localhost',  # or from env
            port=6379,
            decode_responses=True
        )
        self.playwright = None

    async def ensure_browser(self):
        """Ensure browser is initialized"""
        if not self.browser:
            self.playwright = await async_playwright().start()
            self.browser = await self.playwright.chromium.launch(headless=True)
            self.context = await self.browser.new_context()
            self.current_page = await self.context.new_page()
            
            # Initialize session state
            await self.update_state({
                'status': 'initialized',
                'current_url': 'about:blank',
                'current_task': None,
                'task_history': [],
                'last_error': None
            })
            
            print(f"Browser initialized for session {self.session_id}")

    async def update_state(self, state_update: Dict[str, Any]):
        """Update session state in Redis"""
        current_state = await self.get_state() or {}
        current_state.update(state_update)
        
        # Store updated state
        await self.redis.set(
            f'browser_session:{self.session_id}',
            json.dumps(current_state),
            ex=3600  # 1 hour expiration
        )
        
        # Publish update
        await self.redis.publish(
            f'browser_session:{self.session_id}:updates',
            json.dumps(current_state)
        )

    async def get_state(self) -> Optional[Dict[str, Any]]:
        """Get current session state from Redis"""
        state = await self.redis.get(f'browser_session:{self.session_id}')
        return json.loads(state) if state else None

    async def initialize(self):
        await self.ensure_browser()
        return self.session_id

    async def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a single browser task, ensuring browser is running first"""
        print(f"Starting task execution: {task['action']}")
        
        # Initialize browser if needed
        try:
            await self.ensure_browser()
            print(f"Browser ensured for session {self.session_id}")
        except Exception as e:
            error_msg = f"Failed to initialize browser: {str(e)}"
            print(error_msg)
            return {
                'type': 'browser-use',
                'taskCompleted': False,
                'error': error_msg,
                'sessionId': self.session_id
            }

        # Update state with current task
        await self.update_state({
            'status': 'executing',
            'current_task': task
        })

        result = {
            'type': 'browser-use',
            'taskCompleted': False,
            'data': None,
            'url': await self.current_page.url(),
            'sessionId': self.session_id,
            'screenshot': None
        }

        try:
            # Execute task with AI agent
            print(f"Executing task with agent: {task['action']}")
            agent_result = await self._execute_with_agent(task)
            
            if not task.get('hidePreview'):
                result['screenshot'] = await self.current_page.screenshot(
                    type='jpeg',
                    quality=50,
                    full_page=True
                )

            result.update(agent_result)
            result['taskCompleted'] = True

            # Update state with task completion
            current_state = await self.get_state()
            task_history = current_state.get('task_history', [])
            task_history.append({
                'task': task,
                'result': result,
                'timestamp': datetime.utcnow().isoformat()
            })
            
            await self.update_state({
                'status': 'task_completed',
                'current_url': await self.current_page.url(),
                'task_history': task_history,
                'last_result': result
            })

        except Exception as e:
            error_msg = str(e)
            print(f"Error executing task: {error_msg}")
            result['error'] = error_msg
            await self.update_state({
                'status': 'error',
                'last_error': error_msg
            })
            
        return result

    async def cleanup(self):
        """Clean up browser and Redis resources"""
        if self.browser:
            await self.browser.close()
            self.browser = None
            self.current_page = None
            self.context = None
            
        if self.playwright:
            await self.playwright.stop()
            self.playwright = None
            
        # Clean up Redis state
        await self.redis.delete(f'browser_session:{self.session_id}')
        await self.redis.close()

    async def _execute_with_agent(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute task using AI agent with basic browser automation"""
        action = task.get('action')
        prompt = task.get('prompt', '')

        if 'analyze_form' in action.lower():
            # Extract URL from prompt if present
            url = None
            if 'navigate to' in prompt.lower():
                # Simple URL extraction - could be made more robust
                url_start = prompt.lower().find('navigate to') + len('navigate to')
                url_end = prompt.lower().find(' ', url_start)
                url = prompt[url_start:url_end if url_end != -1 else None].strip()
                
                if url and not url.startswith('http'):
                    url = f'https://{url}'

            if url:
                await self.current_page.goto(url)
                await self.current_page.wait_for_load_state('networkidle')

            # Get all form elements
            forms_data = await self.current_page.evaluate('''() => {
                const forms = Array.from(document.forms);
                const fields = [];
                
                forms.forEach(form => {
                    Array.from(form.elements).forEach(element => {
                        if (element.tagName !== 'FIELDSET') {
                            fields.push({
                                name: element.name || '',
                                id: element.id || '',
                                type: element.type || '',
                                value: element.value || '',
                                placeholder: element.placeholder || '',
                                required: element.required || false
                            });
                        }
                    });
                });
                
                return {
                    fields: fields,
                    sections: {
                        forms_count: forms.length,
                        current_url: window.location.href
                    },
                    metadata: {
                        timestamp: new Date().toISOString(),
                        page_title: document.title
                    }
                };
            }''')

            return {
                'data': forms_data,
                'message': f'Analyzed form structure at {await self.current_page.url()}'
            }

        return {
            'data': None,
            'message': f'Unsupported action: {action}'
        } 