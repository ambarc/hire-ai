#!/bin/bash

# Build the Docker image
echo "Building Docker image..."
docker build -t hire-ai .

# Run the Docker container
echo "Starting Docker container..."
docker run -p 3000:3000 -p 3001:3001 -p 3100:3100 --env-file .env hire-ai 