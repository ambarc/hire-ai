# Docker Setup for Hire-AI

This Docker setup wraps the browser service, workflow service, and frontend into a single container with proper routing between services.

## Prerequisites

- Docker and Docker Compose installed on your machine
- PostgreSQL database (can be external or run in a separate container)

## Configuration

1. Copy the `.env.docker` file to `.env`:

```bash
cp .env.docker .env
```

2. Edit the `.env` file with your actual configuration values:
   - Database connection details
   - Supabase credentials
   - OpenAI API key
   - Other service-specific settings

## Building and Running

### Using Docker Compose (Recommended)

1. Build and start the container:

```bash
docker-compose up -d
```

2. View logs:

```bash
docker-compose logs -f
```

3. Stop the container:

```bash
docker-compose down
```

### Using Docker Directly

1. Build the Docker image:

```bash
docker build -t hire-ai .
```

2. Run the container:

```bash
docker run -d --name hire-ai \
  -p 3000:3000 -p 3001:3001 -p 3100:3100 \
  --env-file .env \
  hire-ai
```

3. View logs:

```bash
docker logs -f hire-ai
```

4. Stop the container:

```bash
docker stop hire-ai
docker rm hire-ai
```

## Service Ports

- Frontend (Next.js): Port 3000
- Browser Service: Port 3001
- Workflow Service: Port 3100

## Accessing the Services

- Frontend: http://localhost:3000
- Browser Service API: http://localhost:3000/api/browser-agent/
- Workflow Service API: http://localhost:3000/api/workflow/

## Volumes

The Docker setup includes two persistent volumes:

- `browser_recordings`: Stores browser recordings from the browser service
- `workflow_data`: Stores workflow data when using file storage

## AWS ECS Deployment

To deploy this container to AWS ECS:

1. Build and push the Docker image to Amazon ECR:

```bash
aws ecr get-login-password --region your-region | docker login --username AWS --password-stdin your-account-id.dkr.ecr.your-region.amazonaws.com
docker build -t your-account-id.dkr.ecr.your-region.amazonaws.com/hire-ai:latest .
docker push your-account-id.dkr.ecr.your-region.amazonaws.com/hire-ai:latest
```

2. Create an ECS task definition that:
   - Uses the ECR image
   - Maps ports 3000, 3001, and 3100
   - Sets all required environment variables
   - Configures appropriate CPU and memory resources

3. Create an ECS service that:
   - Uses the task definition
   - Configures networking (VPC, subnets, security groups)
   - Sets up load balancing if needed
   - Configures auto-scaling if needed

4. For secrets management, use AWS Secrets Manager or Parameter Store to store sensitive values and reference them in your task definition.

## Troubleshooting

- If services fail to start, check the logs for each service:
  ```bash
  docker-compose exec hire-ai cat /var/log/supervisor/frontend.log
  docker-compose exec hire-ai cat /var/log/supervisor/browser-service.log
  docker-compose exec hire-ai cat /var/log/supervisor/workflow-service.log
  ```

- To restart a specific service:
  ```bash
  docker-compose exec hire-ai supervisorctl restart frontend
  docker-compose exec hire-ai supervisorctl restart browser-service
  docker-compose exec hire-ai supervisorctl restart workflow-service
  ``` 