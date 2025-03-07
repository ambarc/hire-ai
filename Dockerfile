FROM node:20-slim AS frontend-builder

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm i

# Create a dummy .env file for build
RUN echo "# Dummy environment variables for build" > .env.local

# Copy the rest of the frontend code
COPY app/ ./app/
COPY public/ ./public/
COPY next.config.js ./
COPY tsconfig.json ./
COPY tailwind.config.ts ./
COPY postcss.config.mjs ./
COPY next-env.d.ts ./
COPY eslint.config.mjs ./

# Set dummy environment variables for build
ENV SUPABASE_URL=https://placeholder-for-build.supabase.co
ENV NEXT_PUBLIC_SUPABASE_URL=https://placeholder-for-build.supabase.co
ENV NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-for-build
ENV SUPABASE_SERVICE_ROLE_KEY=placeholder-for-build
ENV POSTGRES_URL=postgres://placeholder:placeholder@localhost:5432/placeholder
ENV POSTGRES_PRISMA_URL=postgres://placeholder:placeholder@localhost:5432/placeholder
ENV OPENAI_API_KEY=placeholder-for-build

# Build the Next.js app
RUN npm run build

# Workflow service builder
FROM node:20-slim AS workflow-builder

WORKDIR /app

# Copy package files and install dependencies from root
COPY package.json package-lock.json ./
RUN npm ci

# Copy workflow files
COPY workflow/tsconfig.json ./workflow/
COPY workflow/src/ ./workflow/src/
COPY workflow/public/ ./workflow/public/

# Build the workflow service
WORKDIR /app/workflow
RUN mkdir -p dist/public/admin
RUN cp -r public/admin/* dist/public/admin/ || true
RUN ../node_modules/.bin/tsc

# Final image
FROM node:20-slim

WORKDIR /app

# Install Python and required packages
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    chromium \
    && rm -rf /var/lib/apt/lists/*

# Set up browser service
WORKDIR /app/browser_service
COPY browser_service/requirements.txt ./
# Create and activate a virtual environment
RUN python3 -m venv /app/venv
# Use the virtual environment's pip to install packages
RUN /app/venv/bin/pip install --no-cache-dir -r requirements.txt
COPY browser_service/server.py ./
COPY browser_service/openapi.yaml ./
COPY browser_service/static/ ./static/
RUN mkdir -p recordings

# Set up workflow service
WORKDIR /app/workflow
COPY --from=workflow-builder /app/workflow/dist ./dist
COPY workflow/start.sh ./
RUN chmod +x start.sh
RUN mkdir -p .workflows

# Set up frontend
WORKDIR /app
COPY --from=frontend-builder /app/node_modules ./node_modules
COPY --from=frontend-builder /app/.next ./.next
COPY --from=frontend-builder /app/public ./public
COPY package.json ./

# Copy the entrypoint script
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Expose ports
EXPOSE 3000 3001 3100

# Set environment variables
ENV NODE_ENV=production

ENTRYPOINT ["/app/docker-entrypoint.sh"] 