# Persistent Headless Chrome Setup for hire-ai

This guide explains how to set up a persistent headless Chrome instance in your hire-ai Docker container that continues running even after you exit the container.

## Quick Start

1. Copy the script into the hire-ai container:
```bash
docker cp chrome-setup.sh hire-ai:/app/
```

2. Log into the container:
```bash
docker exec -it hire-ai bash
```

3. Make the script executable and run it:
```bash
cd /app
chmod +x chrome-setup.sh
./chrome-setup.sh
```

The script will:
- Start headless Chrome with remote debugging enabled
- Configure Chrome to persist after you exit the container
- Set up environment variables for connecting to Chrome
- Create a persistent environment file for future sessions

## Reconnecting in Future Sessions

When you log back into the container, just run:
```bash
source /app/chrome-env.sh
```

This will load all the necessary environment variables to connect to the running Chrome instance.

## Verifying Chrome Status

To check if Chrome is running:
```bash
ps aux | grep chromium
```

To view Chrome logs:
```bash
cat /app/chrome-logs/chrome.log
```

## Environment Variables

The script sets up the following environment variables:
- `CONNECTION_MODE=cdp`: Uses Chrome DevTools Protocol
- `CHROME_HOST=localhost`: Chrome is running locally in the container
- `CHROME_PORT=9222`: Default debugging port
- `CHROME_CDP_URL`: WebSocket URL for CDP connection
- `HEADLESS=True`: Runs Chrome in headless mode

## Troubleshooting

If Chrome fails to start:

1. Check the logs:
```bash
cat /app/chrome-logs/chrome.log
```

2. Make sure no other Chrome instances are running:
```bash
pkill -f "chromium"
```

3. Run the setup script again:
```bash
./chrome-setup.sh
```

Note: If the container is restarted, you'll need to run the setup script again. 