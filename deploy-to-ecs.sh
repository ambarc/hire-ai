#!/bin/bash

# Configuration variables - modify these as needed
AWS_REGION="us-east-1"
ECR_REPOSITORY_NAME="hire-ai"
ECS_CLUSTER_NAME="hire-ai-cluster"
ECS_SERVICE_NAME="hire-ai-service"
ECS_TASK_FAMILY="hire-ai-task"
ECS_CONTAINER_NAME="hire-ai"

# Function to display usage information
usage() {
  echo "Usage: $0 [build|push|deploy|all]"
  echo ""
  echo "Commands:"
  echo "  build   - Build the Docker image"
  echo "  push    - Push the Docker image to ECR"
  echo "  deploy  - Deploy the updated task definition to ECS"
  echo "  all     - Perform all actions: build, push, and deploy"
  echo ""
  exit 1
}

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
  echo "Error: AWS CLI is not installed or not in PATH"
  exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "Error: Docker is not installed or not in PATH"
  exit 1
fi

# Get AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
if [ $? -ne 0 ]; then
  echo "Error: Failed to get AWS account ID. Make sure you're authenticated with AWS CLI."
  exit 1
fi

# ECR repository URI
ECR_REPOSITORY_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}"

# Build the Docker image
build_image() {
  echo "Building Docker image..."
  docker build -t ${ECR_REPOSITORY_NAME}:latest .
  if [ $? -ne 0 ]; then
    echo "Error: Docker build failed."
    exit 1
  fi
  docker tag ${ECR_REPOSITORY_NAME}:latest ${ECR_REPOSITORY_URI}:latest
  echo "Docker image built and tagged as ${ECR_REPOSITORY_URI}:latest"
}

# Push the Docker image to ECR
push_image() {
  echo "Logging in to Amazon ECR..."
  aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPOSITORY_URI}
  if [ $? -ne 0 ]; then
    echo "Error: Failed to log in to Amazon ECR."
    exit 1
  fi
  
  # Check if repository exists, create if it doesn't
  aws ecr describe-repositories --repository-names ${ECR_REPOSITORY_NAME} --region ${AWS_REGION} > /dev/null 2>&1
  if [ $? -ne 0 ]; then
    echo "Creating Amazon ECR repository..."
    aws ecr create-repository --repository-name ${ECR_REPOSITORY_NAME} --region ${AWS_REGION}
    if [ $? -ne 0 ]; then
      echo "Error: Failed to create Amazon ECR repository."
      exit 1
    fi
  fi
  
  echo "Pushing Docker image to Amazon ECR..."
  docker push ${ECR_REPOSITORY_URI}:latest
  if [ $? -ne 0 ]; then
    echo "Error: Failed to push Docker image to Amazon ECR."
    exit 1
  fi
  echo "Docker image pushed to ${ECR_REPOSITORY_URI}:latest"
}

# Deploy the updated task definition to ECS
deploy_to_ecs() {
  echo "Retrieving current task definition..."
  TASK_DEFINITION=$(aws ecs describe-task-definition --task-definition ${ECS_TASK_FAMILY} --region ${AWS_REGION} 2> /dev/null)
  
  if [ $? -ne 0 ]; then
    echo "Task definition doesn't exist yet. You need to create it first in the AWS console."
    echo "Make sure to:"
    echo "1. Create a task definition with family name: ${ECS_TASK_FAMILY}"
    echo "2. Add a container named: ${ECS_CONTAINER_NAME}"
    echo "3. Set the image to: ${ECR_REPOSITORY_URI}:latest"
    echo "4. Configure environment variables, port mappings, and resource limits"
    exit 1
  fi
  
  # Get the current revision number
  REVISION=$(echo ${TASK_DEFINITION} | jq -r '.taskDefinition.revision')
  
  # Update the image in the task definition
  NEW_TASK_DEFINITION=$(echo ${TASK_DEFINITION} | jq --arg IMAGE "${ECR_REPOSITORY_URI}:latest" '.taskDefinition | .containerDefinitions[0].image = $IMAGE | {containerDefinitions: .containerDefinitions, family: .family, taskRoleArn: .taskRoleArn, executionRoleArn: .executionRoleArn, networkMode: .networkMode, volumes: .volumes, placementConstraints: .placementConstraints, requiresCompatibilities: .requiresCompatibilities, cpu: .cpu, memory: .memory}')
  
  # Register the new task definition
  echo "Registering new task definition..."
  NEW_TASK_INFO=$(aws ecs register-task-definition --region ${AWS_REGION} --cli-input-json "${NEW_TASK_DEFINITION}")
  if [ $? -ne 0 ]; then
    echo "Error: Failed to register new task definition."
    exit 1
  fi
  
  NEW_REVISION=$(echo ${NEW_TASK_INFO} | jq -r '.taskDefinition.revision')
  echo "New task definition registered with revision: ${NEW_REVISION}"
  
  # Update the service to use the new task definition
  echo "Updating ECS service..."
  aws ecs update-service --cluster ${ECS_CLUSTER_NAME} --service ${ECS_SERVICE_NAME} --task-definition ${ECS_TASK_FAMILY}:${NEW_REVISION} --region ${AWS_REGION}
  if [ $? -ne 0 ]; then
    echo "Error: Failed to update ECS service."
    echo "Make sure the cluster '${ECS_CLUSTER_NAME}' and service '${ECS_SERVICE_NAME}' exist."
    exit 1
  fi
  
  echo "ECS service updated successfully. Deployment in progress..."
  echo "You can check the deployment status in the AWS ECS console."
}

# Process command
case "$1" in
  build)
    build_image
    ;;
  
  push)
    push_image
    ;;
  
  deploy)
    deploy_to_ecs
    ;;
  
  all)
    build_image
    push_image
    deploy_to_ecs
    ;;
  
  *)
    usage
    ;;
esac

exit 0 