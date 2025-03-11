#!/bin/bash

# Script to set up persistent headless Chrome in the hire-ai container
# This script will:
# 1. Find the running hire-ai container
# 2. Set up headless Chrome that persists after exiting
# 3. Configure environment variables for connecting to Chrome

# Get the container name
CONTAINER_NAME=$(docker ps | grep hire-ai | awk '{print $NF}')

if [ -z "$CONTAINER_NAME" ]; then
  echo "Error: hire-ai container not found or not running."
  echo "Please start the container first with 'docker-compose up -d'"
  exit 1
fi

echo "Found container: $CONTAINER_NAME"
echo ""

# Commands to run inside the container
CONTAINER_COMMANDS='
# Create log directory
mkdir -p /app/chrome-logs
apt-get update && apt-get install -y curl

# Kill any existing Chrome processes
pkill -f "chromium" || true

# Start Chromium in headless mode
nohup chromium \
  --headless=new \
  --disable-gpu \
  --no-sandbox \
  --disable-dev-shm-usage \
  --remote-debugging-address=0.0.0.0 \
  --remote-debugging-port=9222 \
  --window-size=1280,720 \
  > /app/chrome-logs/chrome.log 2>&1 &

# Store the process ID
echo $! > /app/chrome.pid

# Wait for Chrome to start
sleep 3

# Check if Chrome is running
if ! ps -p $(cat /app/chrome.pid) > /dev/null; then
  echo "Failed to start Chrome. Check logs at /app/chrome-logs/chrome.log"
  exit 1
fi

# Get WebSocket URL (using simpler command)
WS_URL=$(curl -s http://localhost:9222/json/version | grep -o "ws://[^\"]*")

# Create environment variables file
cat > /app/chrome-env.sh << EOL
#!/bin/bash
export CONNECTION_MODE=cdp
export CHROME_HOST=localhost
export CHROME_PORT=9222
export CHROME_CDP_URL=$WS_URL
export HEADLESS=True
EOL

chmod +x /app/chrome-env.sh
source /app/chrome-env.sh
'

# Run commands in container
echo "Setting up Chrome in container..."
docker exec -it $CONTAINER_NAME bash -c "$CONTAINER_COMMANDS"

echo ""
echo "Chrome is now running in headless mode in the container."
echo "It will continue running even after you exit the container."
echo ""
echo "To reconnect to Chrome in future sessions:"
echo "1. Log into the container: docker exec -it $CONTAINER_NAME bash"
echo "2. Load environment variables: source /app/chrome-env.sh"
echo ""
echo "To check if Chrome is running:"
echo "docker exec $CONTAINER_NAME ps aux | grep chromium"
echo ""
echo "To view Chrome logs:"
echo "docker exec $CONTAINER_NAME cat /app/chrome-logs/chrome.log" 