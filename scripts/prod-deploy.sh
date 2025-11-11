#!/bin/bash

# Production deployment script for Spirit of Kiro game components
# Deploys: item-images service, game server, and client application
# Exit immediately on any error, undefined variable, or pipe failure
set -euo pipefail

# ============================================================================
# Configuration
# ============================================================================

readonly ITEM_IMAGES_PREFIX="kiro-game-images"
readonly SERVER_PREFIX="game-server"
readonly WEST_REGION="us-west-2"
readonly EAST_REGION="us-east-1"

# Client-specific configuration
readonly SERVER_ENDPOINT="game-server.nathanpeck.gg:443"
readonly DOMAIN_NAME="nathanpeck.gg"
readonly ACM_CERTIFICATE_ARN="arn:aws:acm:us-east-1:784059518401:certificate/94e1f477-2af7-4f9a-a547-5f4ddd59474b"

# Script location for relative path resolution
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ============================================================================
# Utility Functions
# ============================================================================

# Print timestamped log message
log() {
    local message="$1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $message"
}

# Print error message to stderr and exit
error_exit() {
    local message="$1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $message" >&2
    exit 1
}

# Change to directory safely with error handling
change_directory() {
    local target_dir="$1"
    cd "$target_dir" || error_exit "Failed to change directory to: $target_dir"
}

# Execute deployment script with region configuration
deploy_component() {
    local component_name="$1"
    local deploy_script="$2"
    local region="$3"
    shift 3
    local deploy_args=("$@")

    log "📦 Deploying $component_name..."

    if [[ ! -x "$deploy_script" ]]; then
        error_exit "Deploy script not found or not executable: $deploy_script"
    fi

    AWS_REGION="$region" "$deploy_script" "${deploy_args[@]}" || \
        error_exit "Failed to deploy $component_name"

    log "✅ $component_name deployed successfully"
}

# Retrieve CloudFormation stack output value
get_stack_output() {
    local stack_name="$1"
    local output_key="$2"
    local region="$3"

    log "🔍 Retrieving $output_key from stack: $stack_name"

    local output_value
    output_value=$(AWS_REGION="$region" aws cloudformation describe-stacks \
        --stack-name "$stack_name" \
        --query "Stacks[0].Outputs[?OutputKey=='$output_key'].OutputValue" \
        --output text 2>/dev/null) || \
        error_exit "Failed to retrieve $output_key from stack: $stack_name"

    if [[ -z "$output_value" ]]; then
        error_exit "Output $output_key not found in stack: $stack_name"
    fi

    echo "$output_value"
}

# ============================================================================
# Deployment Steps
# ============================================================================

deploy_item_images() {
    log "📸 Starting item-images service deployment"

    local iac_dir="$PROJECT_ROOT/item-images/iac"
    local deploy_script="$iac_dir/deploy.sh"

    change_directory "$iac_dir"
    deploy_component "item-images service" "./deploy.sh" "$WEST_REGION" "$ITEM_IMAGES_PREFIX"
    change_directory "$PROJECT_ROOT"
}

deploy_server() {
    log "🖥️ Starting game server deployment"

    local iac_dir="$PROJECT_ROOT/server/iac"
    local deploy_script="$iac_dir/deploy.sh"

    change_directory "$iac_dir"
    deploy_component "game server" "./deploy.sh" "$WEST_REGION" "$SERVER_PREFIX"
    change_directory "$PROJECT_ROOT"
}

deploy_client() {
    log "🌐 Starting client application deployment"

    # Note: SERVER_DNS is retrieved but not currently used
    # Keeping the retrieval for potential future use or debugging
    local server_dns
    server_dns=$(get_stack_output "$SERVER_PREFIX" "LoadBalancerDNS" "$WEST_REGION")
    log "ℹ️ Server Load Balancer DNS: $server_dns"

    local iac_dir="$PROJECT_ROOT/client/iac"
    local deploy_script="$iac_dir/deploy.sh"

    change_directory "$iac_dir"
    deploy_component "client application" "./deploy.sh" "$EAST_REGION" \
        "$SERVER_ENDPOINT" "$DOMAIN_NAME" "$ACM_CERTIFICATE_ARN"
    change_directory "$PROJECT_ROOT"
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    log "🚀 Starting production deployment for Spirit of Kiro"
    log "📍 Project root: $PROJECT_ROOT"

    # Verify we're in the correct directory
    if [[ ! -d "$PROJECT_ROOT/server" ]] || [[ ! -d "$PROJECT_ROOT/client" ]]; then
        error_exit "Invalid project structure. Expected server/ and client/ directories."
    fi

    # Execute deployments in dependency order
    deploy_item_images
    deploy_server
    deploy_client

    log "✅ Production deployment completed successfully!"
    log "🎮 Game should be accessible at: https://$DOMAIN_NAME"
}

# Execute main function
main "$@" 