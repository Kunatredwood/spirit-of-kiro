#!/bin/bash

# Exit on error
set -e

# Check if stack name is provided
if [ -z "$1" ]; then
  echo "Usage: $0 <stack-name>"
  echo "Example: $0 game-auth"
  exit 1
fi

STACK_NAME=$1
REGION=${AWS_REGION:-us-east-2}

echo "Updating Cognito User Pool auto-verification for stack: $STACK_NAME"
echo "Region: $REGION"

# Get the User Pool ID from CloudFormation stack
USER_POOL_ID=$(aws cloudformation describe-stacks \
  --stack-name $STACK_NAME \
  --query "Stacks[0].Outputs[?OutputKey=='UserPoolId'].OutputValue" \
  --output text \
  --region $REGION)

if [ -z "$USER_POOL_ID" ]; then
  echo "Error: Could not find User Pool ID for stack $STACK_NAME"
  exit 1
fi

echo "Found User Pool ID: $USER_POOL_ID"

# Update the User Pool to enable auto-verified email
echo "Enabling auto-verified email attribute..."
aws cognito-idp update-user-pool \
  --user-pool-id $USER_POOL_ID \
  --auto-verified-attributes email \
  --region $REGION

echo "✓ Successfully enabled auto-verified email for User Pool: $USER_POOL_ID"
echo "You can now use the resend verification code feature!"
