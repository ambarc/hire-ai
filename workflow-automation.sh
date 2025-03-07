#!/bin/bash

# Set the base URL
BASE_URL="http://localhost:3100/api"

echo "Registering BROWSER_USE task type..."
TASK_TYPE_RESPONSE=$(curl -s -X POST "$BASE_URL/task-types" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "BROWSER_USE",
    "description": "Execute a browser task based on a prompt",
    "input": {
      "prompt": {
        "type": "string",
        "optional": false
      }
    },
    "output": {
      "url": {
        "type": "string",
        "optional": false
      }
    }
  }')

echo "Task type registration response: $TASK_TYPE_RESPONSE"

echo "---------------------------------------------"

echo "Creating workflow with BROWSER_USE task..."
WORKFLOW_RESPONSE=$(curl -s -X POST "$BASE_URL/workflows" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Workflow",
    "description": "A test workflow with a browser task",
    "tasks": [
      {
        "type": "BROWSER_USE",
        "description": "Navigate to Google and search for workflow engines",
        "input": {
          "prompt": "Go to Google and search for workflow engines"
        }
      }
    ]
  }')

echo "Workflow creation response: $WORKFLOW_RESPONSE"
echo "---------------------------------------------"

# Extract workflow ID and task ID from the response - fixed extraction
WORKFLOW_ID=$(echo $WORKFLOW_RESPONSE | grep -o '"id":"[^"]*"' | tail -1 | cut -d'"' -f4)
TASK_ID=$(echo $WORKFLOW_RESPONSE | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "Extracted Workflow ID: $WORKFLOW_ID"
echo "Extracted Task ID: $TASK_ID"
echo "---------------------------------------------"

echo "Enqueuing task for execution..."
ENQUEUE_RESPONSE=$(curl -s -X POST "$BASE_URL/workflows/$WORKFLOW_ID/tasks/$TASK_ID/enqueue" \
  -H "Content-Type: application/json" \
  -d '{
    "priority": 1
  }')

echo "Task enqueue response: $ENQUEUE_RESPONSE"
echo "---------------------------------------------"

echo "Processing next task in queue..."
PROCESS_RESPONSE=$(curl -s -X POST "$BASE_URL/queue/process-next" \
  -H "Content-Type: application/json" \
  -d '{}')

echo "Process next task response: $PROCESS_RESPONSE"
echo "---------------------------------------------"

echo "Checking queue status..."
STATUS_RESPONSE=$(curl -s "$BASE_URL/queue/status")
echo "Queue status: $STATUS_RESPONSE" 