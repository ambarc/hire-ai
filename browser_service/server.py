from fastapi import FastAPI, HTTPException, WebSocket
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from langchain_aws import ChatBedrock
import boto3
from typing import Optional, Dict, List, Any, Literal
import json
from datetime import datetime
import os
from browser_use import Agent, Browser, BrowserConfig
from langchain_openai import ChatOpenAI
from langchain_ollama import ChatOllama
from collections import deque
import uuid
import asyncio
import platform

app = FastAPI(title="Browser Agent", description="A service that orchestrates browser agents given commands.")

# Get the current directory
current_dir = os.path.dirname(os.path.abspath(__file__))
static_dir = os.path.join(current_dir, "static")

# Create static directory if it doesn't exist
os.makedirs(static_dir, exist_ok=True)

# Load default prompts
default_prompts_path = os.path.join(static_dir, "default_prompts.json")
DEFAULT_PROMPTS = []
try:
    with open(default_prompts_path, 'r') as f:
        DEFAULT_PROMPTS = json.load(f)["prompts"]
except Exception as e:
    print(f"Error loading default prompts: {e}")
    DEFAULT_PROMPTS = []

# Mount static files directory at both paths
app.mount("/static", StaticFiles(directory=static_dir), name="static")
app.mount("/browser-agent/static", StaticFiles(directory=static_dir), name="browser_agent_static")

# Browser configuration from environment
CONNECTION_MODE = os.getenv('CONNECTION_MODE', 'application')  # Options: application, cdp
CHROME_HOST = os.getenv('CHROME_HOST', 'localhost')
CHROME_PORT = os.getenv('CHROME_PORT', '9222')
CHROME_CDP_URL = os.getenv('CHROME_CDP_URL', f'http://{CHROME_HOST}:{CHROME_PORT}')
HEADLESS = os.getenv('HEADLESS', 'False').lower() == 'true'
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

# Add LLM configuration
LLM_PROVIDER = os.getenv('LLM_PROVIDER', 'openai')
LLM_MODEL = os.getenv('LLM_MODEL', 'gpt-4o') 
LLM_TEMPERATURE = float(os.getenv('LLM_TEMPERATURE', '0.5'))

def get_llm():
    """Get LLM based on current configuration"""
    if LLM_PROVIDER == 'bedrock':
        # Ensure model ID has "us." prefix for Bedrock models (x-region inference profiles in AWS bedrock)
        model_id = LLM_MODEL if LLM_MODEL.startswith("us.") else f"us.{LLM_MODEL}"
        
        return ChatBedrock(
            model_id=model_id,
            region_name="us-east-1",
            model_kwargs={"temperature": LLM_TEMPERATURE},
            client=boto3.client("bedrock-runtime", region_name="us-east-1")
        )
    elif LLM_PROVIDER == 'openai':
        return ChatOpenAI(
            model=LLM_MODEL,
            temperature=LLM_TEMPERATURE
        )
    elif LLM_PROVIDER == 'ollama':
        return ChatOllama(
            model=LLM_MODEL,
            temperature=LLM_TEMPERATURE
        )
    else:
        raise ValueError(f"Unsupported LLM provider: {LLM_PROVIDER}")

# Check if running in Docker by looking for container environment
def is_running_in_docker():
    try:
        with open('/proc/self/cgroup', 'r') as f:
            return any('docker' in line for line in f)
    except:
        return False

# Determine if we should use CDP to connect to host Chrome
in_docker = is_running_in_docker()

if in_docker:
    # When in Docker, use CDP to connect to Chrome on the host
    cdp_url = "ws://host.docker.internal:9222"
    chrome_instance_path = None  # Not needed when using CDP
else:
    # When running directly on the host
    cdp_url = None
    if platform.system() == "Darwin":  # macOS
        chrome_instance_path = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    else:  # Linux/Unix
        chrome_instance_path = '/usr/bin/chromium'
    
    # Check if the path exists, use alternative if not
    if not os.path.exists(chrome_instance_path):
        if platform.system() == "Darwin":
            # Fallback for macOS
            chrome_instance_path = '/Applications/Chromium.app/Contents/MacOS/Chromium'
        else:
            # Fallback for Linux/Unix
            chrome_instance_path = '/usr/bin/google-chrome'

def get_chrome_path():
    """Get the Chrome executable path based on the platform"""
    if platform.system() == "Darwin":  # macOS
        paths = [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            '/Applications/Chromium.app/Contents/MacOS/Chromium'
        ]
    else:  # Linux/Unix
        paths = [
            '/usr/bin/google-chrome',
            '/usr/bin/chromium',
            '/usr/bin/chromium-browser'
        ]
    
    for path in paths:
        if os.path.exists(path):
            return path
    
    raise Exception("Chrome/Chromium not found in standard locations")

def get_browser():
    """Get a browser instance based on the configured connection mode"""
    print(f"\n=== Browser Configuration ===")
    print(f"Connection Mode: {CONNECTION_MODE}")
    print(f"Chrome Host: {CHROME_HOST}")
    print(f"Chrome Port: {CHROME_PORT}")
    print(f"Chrome CDP URL: {CHROME_CDP_URL}")
    print(f"Headless Mode: {HEADLESS}")
    print(f"Debug Mode: {DEBUG}")
    print(f"Running in Docker: {is_running_in_docker()}")
    
    try:
        if CONNECTION_MODE == 'cdp':
            print(f"Connecting to Chrome using CDP URL: {CHROME_CDP_URL}")
            chrome_path = None
            cdp_url = CHROME_CDP_URL
            
            browser = Browser(
                config=BrowserConfig(
                    cdp_url=cdp_url
                )
            )
            
        elif CONNECTION_MODE == 'application':
            print("Starting Chrome as an application")
            chrome_path = get_chrome_path()
            cdp_url = None
            launch_args = []
            
            if HEADLESS:
                print("Using headless mode")
                launch_args.append('--headless=new')  # Modern headless mode
                
            browser = Browser(
                config=BrowserConfig(
                    chrome_instance_path=chrome_path,
                    # launch_args=launch_args
                )
            )
            
        else:
            raise ValueError(f"Invalid CONNECTION_MODE: {CONNECTION_MODE}")
        
        print(f"\n=== Browser Instance Created ===")
        print(f"Chrome Path: {chrome_path or 'Not used'}")
        print(f"CDP URL: {cdp_url or 'Not used'}")
        print(f"=== End Browser Configuration ===\n")
        
        return browser
            
    except Exception as e:
        print(f"Error initializing browser: {e}")
        raise

class Command(BaseModel):
    """Command to be executed in a browser session"""
    prompt: str
    description: Optional[str] = None
    id: Optional[str] = None

class SessionCreate(BaseModel):
    command: Command = None

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
        return True
        # try:
        #     if not self.browser:
        #         print("Debug: No browser instance exists, creating new one")
        #         self.browser = get_browser()
        #         return True
            
        #     # Try to access browser to check health
        #     print("Debug: Checking browser health")
        #     async with await self.browser.new_context() as context:
        #         page = await context.new_page()
        #         await page.goto('about:blank')
        #         await page.close()
        #     print("Debug: Browser health check passed")
        #     return True
            
        # except Exception as e:
        #     print(f"Debug: Browser health check failed: {str(e)}")
        #     try:
        #         # Clean up old browser
        #         if self.browser:
        #             await self.browser.close()
        #     except:
        #         pass
            
        #     # Create new browser
        #     print("Debug: Reinitializing browser")
        #     self.browser = get_browser()
        #     return True

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
            # if not await self.ensure_healthy_browser():
            #     raise Exception("Failed to ensure healthy browser")

            print("Debug: Creating new context for agent")
            print("Debug: Initializing agent")
            llm = get_llm()
            print("Debug: self browser" + str(self.browser))
            self.agent = Agent(
                llm=llm,
                sensitive_data={},
                task=self.current_command.prompt,
                browser=self.browser,
                use_vision=False,
                save_conversation_path="./logs/browser-conversation"
            )

            print("Debug: Running agent")
            agent_result = await self.agent.run(max_steps=20)
            
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
            # print(f"Debug: Final result: {self.result}")

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
    
    # Create the configuration section HTML
    config_section = f"""
    <div class="config-section">
        <div class="panel">
            <div class="panel-header" onclick="togglePanel('agent-config')">
                <h2>Agent Configuration</h2>
                <span class="toggle-icon">▼</span>
            </div>
            <div id="agent-config" class="panel-content">
                <div class="current-config">
                    <h3>Current Configuration:</h3>
                    <pre>
CONNECTION_MODE: {CONNECTION_MODE}
CHROME_HOST: {CHROME_HOST}
CHROME_PORT: {CHROME_PORT}
CHROME_CDP_URL: {CHROME_CDP_URL}
HEADLESS: {HEADLESS}
DEBUG: {DEBUG}
LLM_PROVIDER: {LLM_PROVIDER}
LLM_MODEL: {LLM_MODEL}
LLM_TEMPERATURE: {LLM_TEMPERATURE}
                    </pre>
                </div>

                <div class="panel">
                    <div class="panel-header" onclick="togglePanel('llm-config')">
                        <h3>LLM Configuration</h3>
                        <span class="toggle-icon">▼</span>
                    </div>
                    <div id="llm-config" class="panel-content">
                        <form class="config-form" onsubmit="updateLLMConfig(event)">
                            <label for="llm_provider">Provider:</label>
                            <select id="llm_provider" required onchange="updateModelOptions()">
                                <option value="bedrock"{' selected' if LLM_PROVIDER == 'bedrock' else ''}>Bedrock</option>
                                <option value="openai"{' selected' if LLM_PROVIDER == 'openai' else ''}>OpenAI</option>
                                <option value="ollama"{' selected' if LLM_PROVIDER == 'ollama' else ''}>Ollama</option>
                            </select>

                            <label for="llm_model">Model:</label>
                            <select id="llm_model" required>
                                <!-- Options will be populated by JavaScript -->
                            </select>

                            <label for="llm_temperature">Temperature:</label>
                            <input type="number" id="llm_temperature" value="{LLM_TEMPERATURE}" min="0" max="2" step="0.1" required>

                            <button type="submit" style="grid-column: span 2;">Update LLM Configuration</button>
                        </form>
                    </div>
                </div>

                <div class="panel">
                    <div class="panel-header" onclick="togglePanel('browser-config')">
                        <h3>Browser Configuration</h3>
                        <span class="toggle-icon">▼</span>
                    </div>
                    <div id="browser-config" class="panel-content">
                        <div class="preset-buttons" style="margin-bottom: 20px;">
                            <button onclick="applyPreset('host')" type="button">Host Browser (Docker)</button>
                            <button onclick="applyPreset('local')" type="button">Local Application</button>
                        </div>

                        <form class="config-form" onsubmit="updateConfig(event)">
                            <label for="connection_mode">Connection Mode:</label>
                            <select id="connection_mode" required>
                                <option value="cdp"{' selected' if CONNECTION_MODE == 'cdp' else ''}>CDP</option>
                                <option value="application"{' selected' if CONNECTION_MODE == 'application' else ''}>Application</option>
                            </select>

                            <label for="chrome_host">Chrome Host:</label>
                            <input type="text" id="chrome_host" value="{CHROME_HOST}" required>

                            <label for="chrome_port">Chrome Port:</label>
                            <input type="text" id="chrome_port" value="{CHROME_PORT}" required>

                            <label for="chrome_cdp_url">Chrome CDP URL (optional):</label>
                            <input type="text" id="chrome_cdp_url" value="{CHROME_CDP_URL}">

                            <div class="checkbox-group">
                                <label for="headless">Headless Mode:</label>
                                <input type="checkbox" id="headless"{' checked' if HEADLESS else ''}>
                            </div>

                            <div class="checkbox-group">
                                <label for="debug">Debug Mode:</label>
                                <input type="checkbox" id="debug"{' checked' if DEBUG else ''}>
                            </div>

                            <button type="submit" style="grid-column: span 2;">Update Configuration</button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
    """

    # Create the saved prompts section HTML
    saved_prompts_section = """
    <div class="saved-prompts-section">
        <div class="panel">
            <div class="panel-header" onclick="togglePanel('saved-prompts')">
                <h2>Saved Prompts</h2>
                <span class="toggle-icon">▼</span>
            </div>
            <div id="saved-prompts" class="panel-content">
                <div class="save-prompt-form">
                    <h3>Save New Prompt</h3>
                    <form onsubmit="savePrompt(event)">
                        <div class="form-group">
                            <label for="prompt-name">Name:</label>
                            <input type="text" id="prompt-name" required>
                        </div>
                        <div class="form-group">
                            <label for="prompt-text">Prompt:</label>
                            <textarea id="prompt-text" required></textarea>
                        </div>
                        <button type="submit">Save Prompt</button>
                    </form>
                </div>
                <div class="saved-prompts-list">
                    <h3>Saved Prompts</h3>
                    <div id="prompts-list"></div>
                </div>
            </div>
        </div>
    </div>
    """

    # Create the sessions section HTML
    sessions_html = ""
    for state in session_states:
        status_class = state.get('status', 'unknown').lower()
        sessions_html += f"""
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

    # Add CSS for saved prompts section
    saved_prompts_css = """
    <style>
        .saved-prompts-section {
            margin: 20px 0;
        }
        
        .save-prompt-form {
            margin-bottom: 20px;
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
        }
        
        .save-prompt-form h3 {
            margin-top: 0;
            margin-bottom: 15px;
            color: #333;
        }
        
        .save-prompt-form .form-group {
            margin-bottom: 15px;
        }
        
        .save-prompt-form label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
        
        .save-prompt-form input[type="text"],
        .save-prompt-form textarea {
            width: 100%;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        
        .save-prompt-form textarea {
            min-height: 100px;
            font-family: monospace;
        }
        
        .save-prompt-form button {
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: background-color 0.2s;
        }
        
        .save-prompt-form button:hover {
            background: #0056b3;
        }
        
        .saved-prompt {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            margin-bottom: 12px;
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        
        .prompt-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px 16px;
            background: #f8f9fa;
            border-bottom: 1px solid #e5e7eb;
            border-radius: 8px 8px 0 0;
        }
        
        .prompt-header strong {
            font-size: 15px;
            color: #333;
        }
        
        .prompt-actions {
            display: flex;
            gap: 8px;
        }
        
        .prompt-actions button {
            padding: 6px 12px;
            border: 1px solid #ddd;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            font-size: 13px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 4px;
        }
        
        .prompt-actions button[onclick*="usePrompt"] {
            background: #28a745;
            color: white;
            border-color: #28a745;
        }
        
        .prompt-actions button[onclick*="usePrompt"]:hover {
            background: #218838;
            border-color: #1e7e34;
        }
        
        .prompt-actions button[onclick*="deletePrompt"] {
            background: white;
            color: #dc3545;
            border-color: #dc3545;
        }
        
        .prompt-actions button[onclick*="deletePrompt"]:hover {
            background: #dc3545;
            color: white;
        }
        
        .prompt-text {
            margin: 0;
            padding: 12px 16px;
            background: white;
            border-radius: 0 0 8px 8px;
            font-family: monospace;
            font-size: 13px;
            line-height: 1.5;
            white-space: pre-wrap;
            color: #333;
            border-top: none;
        }
        
        .saved-prompts-list h3 {
            margin-bottom: 16px;
            color: #333;
        }
    </style>
    """

    # Add JavaScript for managing saved prompts
    saved_prompts_js = """
    <script>
        // Load prompts from localStorage, initialize with defaults if empty
        function loadSavedPrompts() {
            let savedPrompts = JSON.parse(localStorage.getItem('savedPrompts') || '[]');
            
            // Load default prompts if they don't exist in localStorage
            const defaultPrompts = """ + json.dumps(DEFAULT_PROMPTS) + """;
            defaultPrompts.forEach(defaultPrompt => {
                if (!savedPrompts.some(p => p.name === defaultPrompt.name)) {
                    savedPrompts.push(defaultPrompt);
                }
            });
            
            localStorage.setItem('savedPrompts', JSON.stringify(savedPrompts));
            return savedPrompts;
        }

        // Save prompt to localStorage
        function savePrompt(event) {
            event.preventDefault();
            const name = document.getElementById('prompt-name').value;
            const prompt = document.getElementById('prompt-text').value;
            
            let savedPrompts = loadSavedPrompts();
            
            // Check if prompt with same name exists
            const existingIndex = savedPrompts.findIndex(p => p.name === name);
            if (existingIndex >= 0) {
                if (!confirm('A prompt with this name already exists. Do you want to overwrite it?')) {
                    return;
                }
                savedPrompts[existingIndex] = { name, prompt };
            } else {
                savedPrompts.push({ name, prompt });
            }
            
            localStorage.setItem('savedPrompts', JSON.stringify(savedPrompts));
            document.getElementById('prompt-name').value = '';
            document.getElementById('prompt-text').value = '';
            displaySavedPrompts();
        }

        // Delete prompt from localStorage
        function deletePrompt(name) {
            let savedPrompts = loadSavedPrompts();
            savedPrompts = savedPrompts.filter(p => p.name !== name);
            localStorage.setItem('savedPrompts', JSON.stringify(savedPrompts));
            displaySavedPrompts();
        }

        // Copy prompt to clipboard
        function usePrompt(name) {
            const savedPrompts = loadSavedPrompts();
            const prompt = savedPrompts.find(p => p.name === name);
            if (prompt) {
                navigator.clipboard.writeText(prompt.prompt);
            }
        }

        // Display saved prompts in the UI
        function displaySavedPrompts() {
            const savedPrompts = loadSavedPrompts();
            const promptsList = document.getElementById('prompts-list');
            
            promptsList.innerHTML = savedPrompts.map(p => `
                <div class="saved-prompt">
                    <div class="prompt-header">
                        <strong>${p.name}</strong>
                        <div class="prompt-actions">
                            <button onclick="usePrompt('${p.name}')" title="Copy prompt to clipboard">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"/>
                                </svg>
                                Copy
                            </button>
                            <button onclick="deletePrompt('${p.name}')" title="Delete this prompt">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                                </svg>
                                Delete
                            </button>
                        </div>
                    </div>
                    <pre class="prompt-text">${p.prompt}</pre>
                </div>
            `).join('');
        }

        // Initialize saved prompts on page load
        document.addEventListener('DOMContentLoaded', () => {
            displaySavedPrompts();
        });
    </script>
    """

    # Combine all HTML sections
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Browser Agent Debug UI</title>
        {saved_prompts_css}
        <script>
            // Determine if we're being accessed through Next.js
            const isNextJs = window.location.pathname.startsWith('/browser-agent');
            // API calls always use /api/browser-agent when through Next.js
            const apiBaseUrl = isNextJs ? '/api/browser-agent' : '/browser-agent';
            // Static files use /browser-agent/static when through Next.js
            const staticBaseUrl = isNextJs ? '/browser-agent/static' : '/static';
        </script>
        <link rel="stylesheet" id="debug-css">
        <style>
            .config-section {{
                background: #f5f5f5;
                padding: 20px;
                margin: 20px 0;
                border-radius: 5px;
            }}
            .config-form {{
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 10px;
            }}
            .config-form label {{
                font-weight: bold;
            }}
            .config-form input[type="text"],
            .config-form input[type="number"] {{
                width: 100%;
                padding: 5px;
            }}
            .config-form .checkbox-group {{
                display: flex;
                align-items: center;
                gap: 5px;
            }}
            .current-config {{
                background: #e0e0e0;
                padding: 10px;
                margin-top: 10px;
                border-radius: 3px;
            }}
            .preset-buttons {{
                display: flex;
                gap: 10px;
                margin-bottom: 20px;
            }}
            .preset-buttons button {{
                padding: 10px 20px;
                border: none;
                border-radius: 5px;
                background: #007bff;
                color: white;
                cursor: pointer;
            }}
            .preset-buttons button:hover {{
                background: #0056b3;
            }}
            .panel {{
                border: 1px solid #e5e7eb;
                border-radius: 8px;
                margin-bottom: 1rem;
                background: white;
            }}
            .panel-header {{
                padding: 1rem;
                background: #f9fafb;
                border-bottom: 1px solid #e5e7eb;
                cursor: pointer;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-radius: 8px 8px 0 0;
            }}
            .panel-header:hover {{
                background: #f3f4f6;
            }}
            .panel-content {{
                padding: 1rem;
                display: block;
            }}
            .panel-content.collapsed {{
                display: none;
            }}
            .toggle-icon {{
                transition: transform 0.2s ease;
            }}
            .toggle-icon.collapsed {{
                transform: rotate(-90deg);
            }}
        </style>
        <script>
            // Set the CSS href dynamically
            document.getElementById('debug-css').href = `${{staticBaseUrl}}/css/debug.css`;

            // Configuration presets
            const presets = {{
                host: {{
                    connection_mode: 'cdp',
                    chrome_host: 'host.docker.internal',
                    chrome_port: '9222',
                    chrome_cdp_url: null,
                    headless: false,
                    debug: true
                }},
                local: {{
                    connection_mode: 'application',
                    chrome_host: 'localhost',
                    chrome_port: '9222',
                    chrome_cdp_url: null,
                    headless: true,
                    debug: false
                }}
            }};

            // Apply configuration preset
            async function applyPreset(presetName) {{
                const config = presets[presetName];
                if (!config) return;

                try {{
                    const response = await fetch(`${{apiBaseUrl}}/config/reset`, {{
                        method: 'POST',
                        headers: {{
                            'Content-Type': 'application/json'
                        }},
                        body: JSON.stringify(config)
                    }});

                    if (!response.ok) {{
                        throw new Error('Failed to apply preset');
                    }}

                    location.reload();
                }} catch (error) {{
                    alert('Error applying preset: ' + error.message);
                }}
            }}

            // Auto-refresh page every 5 seconds
            function refreshPage() {{
                if (!document.querySelector('form:focus-within')) {{
                    location.reload();
                }}
            }}
            setInterval(refreshPage, 5000);

            // Handle form submission
            async function createSession(event) {{
                event.preventDefault();
                const form = event.target;
                const prompt = form.querySelector('#prompt').value;

                try {{
                    const response = await fetch(`${{apiBaseUrl}}/session`, {{
                        method: 'POST',
                        headers: {{
                            'Content-Type': 'application/json'
                        }},
                        body: JSON.stringify({{
                            command: {{
                                prompt: prompt,
                            }}
                        }})
                    }});

                    if (!response.ok) {{
                        throw new Error('Failed to create session');
                    }}

                    location.reload();
                }} catch (error) {{
                    alert('Error creating session: ' + error.message);
                }}
            }}

            // Handle configuration form submission
            async function updateConfig(event) {{
                event.preventDefault();
                const form = event.target;
                const config = {{
                    connection_mode: form.querySelector('#connection_mode').value,
                    chrome_host: form.querySelector('#chrome_host').value,
                    chrome_port: form.querySelector('#chrome_port').value,
                    chrome_cdp_url: form.querySelector('#chrome_cdp_url').value || null,
                    headless: form.querySelector('#headless').checked,
                    debug: form.querySelector('#debug').checked
                }};

                try {{
                    const response = await fetch(`${{apiBaseUrl}}/config/reset`, {{
                        method: 'POST',
                        headers: {{
                            'Content-Type': 'application/json'
                        }},
                        body: JSON.stringify(config)
                    }});

                    if (!response.ok) {{
                        throw new Error('Failed to update configuration');
                    }}

                    location.reload();
                }} catch (error) {{
                    alert('Error updating configuration: ' + error.message);
                }}
            }}

            async function sendCommand(event, sessionId) {{
                event.preventDefault();
                const form = event.target;
                const prompt = document.getElementById(`prompt-${{sessionId}}`).value;
                
                try {{
                    const response = await fetch(`${{apiBaseUrl}}/${{sessionId}}/command`, {{
                        method: 'POST',
                        headers: {{
                            'Content-Type': 'application/json'
                        }},
                        body: JSON.stringify({{
                            prompt: prompt
                        }})
                    }});

                    if (!response.ok) {{
                        throw new Error('Failed to send command');
                    }}

                    location.reload();
                }} catch (error) {{
                    alert('Error sending command: ' + error.message);
                }}
            }}

            // Model options for each provider
            const modelOptions = {{
                bedrock: [
                    'us.anthropic.claude-3-7-sonnet-20250219-v1:0',
                    'us.anthropic.claude-3-5-haiku-20241022-v1:0',
                    'us.deepseek.r1-v1:0',
                ],
                openai: [
                    'gpt-4o',
                    'gpt-4-turbo-preview',
                    'gpt-3.5-turbo'
                ],
                ollama: [
                    'llama2',
                    'mistral',
                    'qwen2.5:7b'
                ]
            }};

            function updateModelOptions() {{
                const provider = document.getElementById('llm_provider').value;
                const modelSelect = document.getElementById('llm_model');
                modelSelect.innerHTML = '';
                
                modelOptions[provider].forEach(model => {{
                    const option = document.createElement('option');
                    option.value = model;
                    option.textContent = model;
                    option.selected = model === '{LLM_MODEL}';
                    modelSelect.appendChild(option);
                }});
            }}

            async function updateLLMConfig(event) {{
                event.preventDefault();
                const config = {{
                    provider: document.getElementById('llm_provider').value,
                    model: document.getElementById('llm_model').value,
                    temperature: parseFloat(document.getElementById('llm_temperature').value)
                }};

                try {{
                    const response = await fetch(`${{apiBaseUrl}}/config/llm`, {{
                        method: 'POST',
                        headers: {{
                            'Content-Type': 'application/json'
                        }},
                        body: JSON.stringify(config)
                    }});

                    if (!response.ok) {{
                        throw new Error('Failed to update LLM configuration');
                    }}

                    location.reload();
                }} catch (error) {{
                    alert('Error updating LLM configuration: ' + error.message);
                }}
            }}

            // Panel toggle functionality
            function togglePanel(panelId) {{
                const panel = document.getElementById(panelId);
                const icon = panel.parentElement.querySelector('.toggle-icon');
                
                panel.classList.toggle('collapsed');
                icon.classList.toggle('collapsed');
                
                // Store panel state in localStorage
                localStorage.setItem(panelId + '-collapsed', panel.classList.contains('collapsed'));
            }}

            // Restore panel states on page load
            document.addEventListener('DOMContentLoaded', () => {{
                const panels = ['agent-config', 'llm-config', 'browser-config'];
                panels.forEach(panelId => {{
                    const isCollapsed = localStorage.getItem(panelId + '-collapsed') === 'true';
                    const panel = document.getElementById(panelId);
                    const icon = panel.parentElement.querySelector('.toggle-icon');
                    
                    if (isCollapsed) {{
                        panel.classList.add('collapsed');
                        icon.classList.add('collapsed');
                    }}
                }});
                
                // Initialize model options
                updateModelOptions();
            }});
        </script>
    </head>
    <body>
        <h1>Browser Agent Debug UI</h1>

        {config_section}
        
        {saved_prompts_section}

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

        {sessions_html}
        {saved_prompts_js}
    </body>
    </html>
    """
    
    return HTMLResponse(content=html)

@app.post("/browser-agent/session")
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

@app.post("/browser-agent/{session_id}/command")
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

@app.get("/browser-agent/{session_id}/commands")
async def get_command_history(session_id: str):
    """Get command history for a session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    browser_session = sessions[session_id]
    return browser_session.get_command_history()

@app.get("/browser-agent/{session_id}/state")
async def get_session_state(session_id: str):
    """Get full session state"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    browser_session = sessions[session_id]
    return browser_session.get_state()

@app.delete("/browser-agent/{session_id}")
async def end_session(session_id: str):
    """End a session"""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    
    browser_session = sessions[session_id]
    await browser_session.cleanup()
    del sessions[session_id]
    return {"status": "success"}

@app.get("/browser-agent/sessions")
async def list_sessions():
    """List all active sessions"""
    return [
        {
            "session_id": session_id,
            "state": browser.get_state()
        }
        for session_id, browser in sessions.items()
    ]

# Add new configuration model
class ChromeConfig(BaseModel):
    connection_mode: str = 'cdp'
    chrome_host: str = 'localhost'
    chrome_port: str = '9222'
    chrome_cdp_url: Optional[str] = None
    headless: bool = True
    debug: bool = False

@app.post("/browser-agent/config/reset")
async def reset_config(config: ChromeConfig):
    """Reset the browser agent configuration with new settings."""
    global CONNECTION_MODE, CHROME_HOST, CHROME_PORT, CHROME_CDP_URL, HEADLESS, DEBUG
    
    # Update global configuration
    CONNECTION_MODE = config.connection_mode
    CHROME_HOST = config.chrome_host
    CHROME_PORT = config.chrome_port
    CHROME_CDP_URL = config.chrome_cdp_url or f'http://{CHROME_HOST}:{CHROME_PORT}'
    HEADLESS = config.headless
    DEBUG = config.debug
    
    # Close any existing browser instances
    for session_id, session in sessions.items():
        if session.browser:
            await session.browser.close()
    
    # Clear all sessions
    sessions.clear()
    
    return {
        "status": "success",
        "message": "Configuration reset successfully",
        "config": {
            "connection_mode": CONNECTION_MODE,
            "chrome_host": CHROME_HOST,
            "chrome_port": CHROME_PORT,
            "chrome_cdp_url": CHROME_CDP_URL,
            "headless": HEADLESS,
            "debug": DEBUG
        }
    }

# Add new configuration model for LLM settings
class LLMConfig(BaseModel):
    provider: Literal['bedrock', 'openai', 'ollama']
    model: str
    temperature: float = 0.5

@app.post("/browser-agent/config/llm")
async def update_llm_config(config: LLMConfig):
    """Update the LLM configuration."""
    global LLM_PROVIDER, LLM_MODEL, LLM_TEMPERATURE
    
    LLM_PROVIDER = config.provider
    LLM_MODEL = config.model
    LLM_TEMPERATURE = config.temperature
    
    return {
        "status": "success",
        "message": "LLM configuration updated successfully",
        "config": {
            "provider": LLM_PROVIDER,
            "model": LLM_MODEL,
            "temperature": LLM_TEMPERATURE
        }
    } 