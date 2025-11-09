#!/bin/bash

# Script to backup generated images from the item-images container

echo "Backing up images from item-images container..."

# Create backup directory if it doesn't exist
mkdir -p ./item-images-backup

# Copy images from container to host
docker cp item-images:/app/images ./item-images-backup

if [ $? -eq 0 ]; then
    echo "✓ Images backed up successfully to ./item-images-backup/images/"
    echo "  You can now rebuild the container safely."
else
    echo "✗ Failed to backup images. Make sure the item-images container is running."
    exit 1
fi
