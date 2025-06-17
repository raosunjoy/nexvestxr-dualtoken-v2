#!/bin/bash

# NexVestXR v2 Dual Token Platform - AWS Deployment Script
# Production deployment automation for scalable infrastructure

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-production}"
STACK_NAME="${ENVIRONMENT}-nexvestxr-infrastructure"
ECR_REPOSITORY_NAME="nexvestxr-v2"

# Logging function
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}" >&2
}

warning() {
    echo -e "${YELLOW}[WARNING] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        error "AWS CLI is not installed"
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
        exit 1
    fi
    
    # Check jq
    if ! command -v jq &> /dev/null; then
        error "jq is not installed"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        error "AWS credentials are not configured"
        exit 1
    fi
    
    info "Prerequisites check passed"
}

# Create ECR repositories
create_ecr_repositories() {
    log "Creating ECR repositories..."
    
    local account_id=$(aws sts get-caller-identity --query Account --output text)
    local ecr_uri="${account_id}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}"
    
    # Create repository if it doesn't exist
    if ! aws ecr describe-repositories --repository-names "$ECR_REPOSITORY_NAME" &> /dev/null; then
        aws ecr create-repository \
            --repository-name "$ECR_REPOSITORY_NAME" \
            --image-scanning-configuration scanOnPush=true \
            --encryption-configuration encryptionType=AES256 \
            --region "$AWS_REGION"
        
        info "ECR repository created: $ECR_REPOSITORY_NAME"
    else
        info "ECR repository already exists: $ECR_REPOSITORY_NAME"
    fi
    
    # Set lifecycle policy
    aws ecr put-lifecycle-policy \
        --repository-name "$ECR_REPOSITORY_NAME" \
        --lifecycle-policy-text file://"$SCRIPT_DIR/../ecr/lifecycle-policy.json" \
        --region "$AWS_REGION"
    
    echo "$ecr_uri"
}

# Build and push Docker images
build_and_push_images() {
    local ecr_uri=$1
    
    log "Building and pushing Docker images..."
    
    # Login to ECR
    aws ecr get-login-password --region "$AWS_REGION" | \
        docker login --username AWS --password-stdin "$ecr_uri"
    
    # Build backend image
    info "Building backend image..."
    docker build \
        -f "$PROJECT_ROOT/aws-infrastructure/docker/Dockerfile.backend" \
        -t "${ecr_uri}:backend-latest" \
        -t "${ecr_uri}:backend-$(git rev-parse --short HEAD)" \
        "$PROJECT_ROOT"
    
    # Build frontend image
    info "Building frontend image..."
    docker build \
        -f "$PROJECT_ROOT/aws-infrastructure/docker/Dockerfile.frontend" \
        -t "${ecr_uri}:frontend-latest" \
        -t "${ecr_uri}:frontend-$(git rev-parse --short HEAD)" \
        "$PROJECT_ROOT"
    
    # Push images
    info "Pushing backend image..."
    docker push "${ecr_uri}:backend-latest"
    docker push "${ecr_uri}:backend-$(git rev-parse --short HEAD)"
    
    info "Pushing frontend image..."
    docker push "${ecr_uri}:frontend-latest"
    docker push "${ecr_uri}:frontend-$(git rev-parse --short HEAD)"
    
    log "Docker images built and pushed successfully"
}

# Deploy CloudFormation stack
deploy_infrastructure() {
    log "Deploying infrastructure stack..."
    
    local template_file="$PROJECT_ROOT/aws-infrastructure/cloudformation/nexvestxr-infrastructure.yaml"
    local parameters_file="$PROJECT_ROOT/aws-infrastructure/cloudformation/${ENVIRONMENT}-parameters.json"
    
    if [[ ! -f "$parameters_file" ]]; then
        error "Parameters file not found: $parameters_file"
        error "Please create the parameters file with required values"
        exit 1
    fi
    
    # Validate template
    aws cloudformation validate-template \
        --template-body file://"$template_file" \
        --region "$AWS_REGION"
    
    # Deploy stack
    if aws cloudformation describe-stacks --stack-name "$STACK_NAME" &> /dev/null; then
        info "Updating existing stack..."
        aws cloudformation update-stack \
            --stack-name "$STACK_NAME" \
            --template-body file://"$template_file" \
            --parameters file://"$parameters_file" \
            --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
            --region "$AWS_REGION"
    else
        info "Creating new stack..."
        aws cloudformation create-stack \
            --stack-name "$STACK_NAME" \
            --template-body file://"$template_file" \
            --parameters file://"$parameters_file" \
            --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
            --enable-termination-protection \
            --region "$AWS_REGION"
    fi
    
    # Wait for stack to complete
    info "Waiting for stack deployment to complete..."
    aws cloudformation wait stack-create-complete \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" 2>/dev/null || \
    aws cloudformation wait stack-update-complete \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION"
    
    log "Infrastructure stack deployed successfully"
}

# Get stack outputs
get_stack_outputs() {
    log "Retrieving stack outputs..."
    
    aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[*].[OutputKey,OutputValue]' \
        --output table
    
    # Export important values
    export VPC_ID=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`VPCId`].OutputValue' \
        --output text)
    
    export ECS_CLUSTER_NAME=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ECSClusterName`].OutputValue' \
        --output text)
    
    export DATABASE_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`DatabaseEndpoint`].OutputValue' \
        --output text)
    
    export REDIS_ENDPOINT=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`RedisEndpoint`].OutputValue' \
        --output text)
    
    info "Stack outputs retrieved and exported"
}

# Deploy ECS services
deploy_ecs_services() {
    local ecr_uri=$1
    
    log "Deploying ECS services..."
    
    # Get required ARNs from stack outputs
    local execution_role_arn=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ECSTaskExecutionRoleArn`].OutputValue' \
        --output text)
    
    local task_role_arn=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`ECSTaskRoleArn`].OutputValue' \
        --output text)
    
    # Process task definitions
    process_task_definition() {
        local task_def_file=$1
        local service_name=$2
        
        # Replace placeholders in task definition
        local processed_file="/tmp/${service_name}-task-definition.json"
        
        sed -e "s/\${ECR_REPOSITORY_URI}/${ecr_uri//\//\\/}/g" \
            -e "s/\${ECS_EXECUTION_ROLE_ARN}/${execution_role_arn//\//\\/}/g" \
            -e "s/\${ECS_TASK_ROLE_ARN}/${task_role_arn//\//\\/}/g" \
            -e "s/\${AWS_REGION}/${AWS_REGION}/g" \
            -e "s/\${ENVIRONMENT}/${ENVIRONMENT}/g" \
            "$task_def_file" > "$processed_file"
        
        # Register task definition
        aws ecs register-task-definition \
            --cli-input-json file://"$processed_file" \
            --region "$AWS_REGION"
        
        info "Task definition registered for $service_name"
    }
    
    # Process backend task definition
    process_task_definition \
        "$PROJECT_ROOT/aws-infrastructure/ecs/backend-task-definition.json" \
        "backend"
    
    # Process frontend task definition
    process_task_definition \
        "$PROJECT_ROOT/aws-infrastructure/ecs/frontend-task-definition.json" \
        "frontend"
    
    # Create or update services
    create_or_update_service() {
        local service_name=$1
        local task_family=$2
        local target_group_arn=$3
        
        local service_full_name="${ENVIRONMENT}-nexvestxr-${service_name}"
        
        # Get latest task definition ARN
        local task_definition_arn=$(aws ecs describe-task-definition \
            --task-definition "$task_family" \
            --region "$AWS_REGION" \
            --query 'taskDefinition.taskDefinitionArn' \
            --output text)
        
        # Check if service exists
        if aws ecs describe-services \
            --cluster "$ECS_CLUSTER_NAME" \
            --services "$service_full_name" \
            --region "$AWS_REGION" | jq -e '.services[0].status == "ACTIVE"' &> /dev/null; then
            
            info "Updating existing service: $service_full_name"
            aws ecs update-service \
                --cluster "$ECS_CLUSTER_NAME" \
                --service "$service_full_name" \
                --task-definition "$task_definition_arn" \
                --region "$AWS_REGION"
        else
            info "Creating new service: $service_full_name"
            # Service creation would be handled by CloudFormation or separate script
            # This is a placeholder for the actual service creation logic
        fi
    }
    
    # Update services
    create_or_update_service "backend" "nexvestxr-backend" "$BACKEND_TARGET_GROUP_ARN"
    create_or_update_service "frontend" "nexvestxr-frontend" "$FRONTEND_TARGET_GROUP_ARN"
    
    log "ECS services deployed successfully"
}

# Run database migrations
run_database_migrations() {
    log "Running database migrations..."
    
    # Create a one-time task to run migrations
    local migration_task_def="/tmp/migration-task-definition.json"
    
    # Create migration task definition
    cat > "$migration_task_def" << EOF
{
  "family": "nexvestxr-migration",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "256",
  "memory": "512",
  "executionRoleArn": "${execution_role_arn}",
  "containerDefinitions": [
    {
      "name": "migration",
      "image": "${ecr_uri}:backend-latest",
      "essential": true,
      "command": ["npm", "run", "db:migrate"],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "\${DATABASE_SECRET_ARN}:database_url::"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/nexvestxr-migration",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "migration"
        }
      }
    }
  ]
}
EOF
    
    # Register and run migration task
    aws ecs register-task-definition \
        --cli-input-json file://"$migration_task_def" \
        --region "$AWS_REGION"
    
    # Run migration task
    local task_arn=$(aws ecs run-task \
        --cluster "$ECS_CLUSTER_NAME" \
        --task-definition "nexvestxr-migration" \
        --launch-type FARGATE \
        --network-configuration "awsvpcConfiguration={subnets=[subnet-xxx],securityGroups=[sg-xxx]}" \
        --region "$AWS_REGION" \
        --query 'tasks[0].taskArn' \
        --output text)
    
    # Wait for migration to complete
    aws ecs wait tasks-stopped \
        --cluster "$ECS_CLUSTER_NAME" \
        --tasks "$task_arn" \
        --region "$AWS_REGION"
    
    log "Database migrations completed"
}

# Setup monitoring and alerting
setup_monitoring() {
    log "Setting up monitoring and alerting..."
    
    # Deploy monitoring stack
    local monitoring_template="$PROJECT_ROOT/aws-infrastructure/cloudformation/monitoring.yaml"
    local monitoring_stack="${ENVIRONMENT}-nexvestxr-monitoring"
    
    if [[ -f "$monitoring_template" ]]; then
        aws cloudformation deploy \
            --template-file "$monitoring_template" \
            --stack-name "$monitoring_stack" \
            --capabilities CAPABILITY_IAM \
            --region "$AWS_REGION" \
            --parameter-overrides \
                Environment="$ENVIRONMENT" \
                ECSClusterName="$ECS_CLUSTER_NAME"
        
        info "Monitoring stack deployed"
    else
        warning "Monitoring template not found, skipping monitoring setup"
    fi
}

# Validate deployment
validate_deployment() {
    log "Validating deployment..."
    
    # Check ECS services health
    local backend_service="${ENVIRONMENT}-nexvestxr-backend"
    local frontend_service="${ENVIRONMENT}-nexvestxr-frontend"
    
    info "Checking ECS service health..."
    
    # Wait for services to be stable
    aws ecs wait services-stable \
        --cluster "$ECS_CLUSTER_NAME" \
        --services "$backend_service" "$frontend_service" \
        --region "$AWS_REGION"
    
    # Check ALB target health
    info "Checking load balancer target health..."
    
    # Get ALB ARN and check target health
    local alb_arn=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerArn`].OutputValue' \
        --output text)
    
    # Basic health check
    local alb_dns=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --region "$AWS_REGION" \
        --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' \
        --output text)
    
    # Wait a bit for services to start
    info "Waiting for services to start..."
    sleep 60
    
    # Test endpoints
    if curl -f -s "https://$alb_dns/health" > /dev/null; then
        info "Frontend health check passed"
    else
        warning "Frontend health check failed"
    fi
    
    if curl -f -s "https://$alb_dns/api/health" > /dev/null; then
        info "Backend health check passed"
    else
        warning "Backend health check failed"
    fi
    
    log "Deployment validation completed"
}

# Print deployment summary
print_summary() {
    log "Deployment Summary"
    echo "=================="
    echo "Environment: $ENVIRONMENT"
    echo "Region: $AWS_REGION"
    echo "Stack Name: $STACK_NAME"
    echo "ECS Cluster: $ECS_CLUSTER_NAME"
    echo ""
    echo "Endpoints:"
    echo "  Frontend: https://$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`CloudFrontDomainName`].OutputValue' --output text)"
    echo "  Load Balancer: https://$(aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$AWS_REGION" --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' --output text)"
    echo ""
    echo "Database: $DATABASE_ENDPOINT"
    echo "Redis: $REDIS_ENDPOINT"
    echo ""
    echo "Docker Repository: $(aws sts get-caller-identity --query Account --output text).dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}"
}

# Main deployment function
main() {
    log "Starting NexVestXR v2 Deployment"
    log "Environment: $ENVIRONMENT"
    log "Region: $AWS_REGION"
    
    check_prerequisites
    
    local ecr_uri
    ecr_uri=$(create_ecr_repositories)
    
    build_and_push_images "$ecr_uri"
    deploy_infrastructure
    get_stack_outputs
    deploy_ecs_services "$ecr_uri"
    run_database_migrations
    setup_monitoring
    validate_deployment
    print_summary
    
    log "Deployment completed successfully!"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "build")
        check_prerequisites
        ecr_uri=$(create_ecr_repositories)
        build_and_push_images "$ecr_uri"
        ;;
    "infrastructure")
        check_prerequisites
        deploy_infrastructure
        get_stack_outputs
        ;;
    "services")
        check_prerequisites
        ecr_uri=$(aws sts get-caller-identity --query Account --output text).dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY_NAME}
        get_stack_outputs
        deploy_ecs_services "$ecr_uri"
        ;;
    "validate")
        validate_deployment
        ;;
    *)
        echo "Usage: $0 {deploy|build|infrastructure|services|validate}"
        echo ""
        echo "Commands:"
        echo "  deploy         - Full deployment (default)"
        echo "  build          - Build and push Docker images only"
        echo "  infrastructure - Deploy CloudFormation stack only"
        echo "  services       - Deploy ECS services only"
        echo "  validate       - Validate existing deployment"
        exit 1
        ;;
esac