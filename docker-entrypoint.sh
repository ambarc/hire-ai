#!/bin/bash
set -e

# Install supervisor if not already installed
if ! command -v supervisord &> /dev/null; then
    echo "Installing supervisor..."
    apt-get update && apt-get install -y supervisor
    rm -rf /var/lib/apt/lists/*
fi

# Set default values for configurable parameters
BROWSER_HOST="${BROWSER_HOST:-0.0.0.0}"
BROWSER_PORT="${BROWSER_PORT:-3001}"
BROWSER_WORKERS="${BROWSER_WORKERS:-1}"

# Create supervisor configuration
cat > /etc/supervisor/conf.d/services.conf << EOF
[supervisord]
nodaemon=true
user=root
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:browser-service]
command=/app/venv/bin/uvicorn browser_service.server:app --host ${BROWSER_HOST} --port ${BROWSER_PORT} --workers ${BROWSER_WORKERS}
directory=/app
environment=PORT="${BROWSER_PORT}",HOST="${BROWSER_HOST}",HEADLESS="True",OPENAI_API_KEY="%(ENV_OPENAI_API_KEY)s"
autostart=true
autorestart=true
startsecs=10
stopwaitsecs=10
stdout_logfile=/var/log/supervisor/browser-service.log
stderr_logfile=/var/log/supervisor/browser-service-error.log

[program:workflow-service]
command=node /app/workflow/dist/src/index.js
directory=/app/workflow
autostart=true
autorestart=true
stdout_logfile=/var/log/supervisor/workflow-service.log
stderr_logfile=/var/log/supervisor/workflow-service-error.log

[program:frontend]
command=node /app/node_modules/.bin/next start
directory=/app
environment=NODE_ENV="production",PORT="3000",SUPABASE_URL="%(ENV_SUPABASE_URL)s",NEXT_PUBLIC_SUPABASE_URL="%(ENV_NEXT_PUBLIC_SUPABASE_URL)s",SUPABASE_SERVICE_ROLE_KEY="%(ENV_SUPABASE_SERVICE_ROLE_KEY)s",NEXT_PUBLIC_SUPABASE_ANON_KEY="%(ENV_NEXT_PUBLIC_SUPABASE_ANON_KEY)s",OPENAI_API_KEY="%(ENV_OPENAI_API_KEY)s"
autostart=true
autorestart=true
stdout_logfile=/var/log/supervisor/frontend.log
stderr_logfile=/var/log/supervisor/frontend-error.log
EOF

# Create log directory
mkdir -p /var/log/supervisor

# Start supervisor
exec supervisord -c /etc/supervisor/supervisord.conf 