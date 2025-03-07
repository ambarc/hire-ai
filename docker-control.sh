#!/bin/bash

# Function to display usage information
usage() {
  echo "Usage: $0 [start|stop|restart|logs|status]"
  echo ""
  echo "Commands:"
  echo "  start    - Start the Docker container"
  echo "  stop     - Stop the Docker container"
  echo "  restart  - Restart the Docker container"
  echo "  logs     - View logs from the Docker container"
  echo "  status   - Check the status of the Docker container"
  echo ""
  exit 1
}

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed or not in PATH"
  exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
  echo "Error: Docker Compose is not installed or not in PATH"
  exit 1
fi

# Check if .env file exists
if [ ! -f .env ]; then
  echo "Warning: .env file not found. Creating from template..."
  if [ -f .env.docker ]; then
    cp .env.docker .env
    echo "Created .env from .env.docker template. Please edit with your actual values."
  else
    echo "Error: .env.docker template not found. Please create a .env file manually."
    exit 1
  fi
fi

# Process command
case "$1" in
  start)
    echo "Starting Hire-AI Docker container..."
    docker-compose up -d
    echo "Container started. Access the application at http://localhost:3000"
    ;;
  
  stop)
    echo "Stopping Hire-AI Docker container..."
    docker-compose down
    echo "Container stopped."
    ;;
  
  restart)
    echo "Restarting Hire-AI Docker container..."
    docker-compose down
    docker-compose up -d
    echo "Container restarted. Access the application at http://localhost:3000"
    ;;
  
  logs)
    echo "Showing logs from Hire-AI Docker container..."
    docker-compose logs -f
    ;;
  
  status)
    echo "Checking status of Hire-AI Docker container..."
    docker-compose ps
    ;;
  
  *)
    usage
    ;;
esac

exit 0 