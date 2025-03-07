#!/bin/bash
set -e

# Install supervisor if not already installed
if ! command -v supervisord &> /dev/null; then
    echo "Installing supervisor..."
    apt-get update && apt-get install -y supervisor
    rm -rf /var/lib/apt/lists/*
fi

# Create supervisor configuration
cat > /etc/supervisor/conf.d/services.conf << EOF
[supervisord]
nodaemon=true
user=root
logfile=/var/log/supervisor/supervisord.log
pidfile=/var/run/supervisord.pid

[program:browser-service]
command=/app/venv/bin/python /app/browser_service/server.py
directory=/app/browser_service
environment=PORT="3001",HOST="0.0.0.0",HEADLESS="True",OPENAI_API_KEY="%(ENV_OPENAI_API_KEY)s"
autostart=true
autorestart=true
stdout_logfile=/var/log/supervisor/browser-service.log
stderr_logfile=/var/log/supervisor/browser-service-error.log

[program:workflow-service]
command=node /app/workflow/dist/src/index.js
directory=/app/workflow
environment=NODE_ENV="production",SERVER_PORT="3100",STORAGE_TYPE="%(ENV_STORAGE_TYPE)s",PG_HOST="%(ENV_PG_HOST)s",PG_PORT="%(ENV_PG_PORT)s",PG_USER="%(ENV_PG_USER)s",PG_PASSWORD="%(ENV_PG_PASSWORD)s",PG_DATABASE="%(ENV_PG_DATABASE)s"
autostart=true
autorestart=true
stdout_logfile=/var/log/supervisor/workflow-service.log
stderr_logfile=/var/log/supervisor/workflow-service-error.log

[program:frontend]
command=node /app/node_modules/.bin/next start
directory=/app
environment=NODE_ENV="production",PORT="3000",POSTGRES_URL="%(ENV_POSTGRES_URL)s",POSTGRES_PRISMA_URL="%(ENV_POSTGRES_PRISMA_URL)s",SUPABASE_URL="%(ENV_SUPABASE_URL)s",NEXT_PUBLIC_SUPABASE_URL="%(ENV_NEXT_PUBLIC_SUPABASE_URL)s",SUPABASE_SERVICE_ROLE_KEY="%(ENV_SUPABASE_SERVICE_ROLE_KEY)s",NEXT_PUBLIC_SUPABASE_ANON_KEY="%(ENV_NEXT_PUBLIC_SUPABASE_ANON_KEY)s",OPENAI_API_KEY="%(ENV_OPENAI_API_KEY)s"
autostart=true
autorestart=true
stdout_logfile=/var/log/supervisor/frontend.log
stderr_logfile=/var/log/supervisor/frontend-error.log
EOF

# Create log directory
mkdir -p /var/log/supervisor

# Start supervisor
exec supervisord -c /etc/supervisor/supervisord.conf 