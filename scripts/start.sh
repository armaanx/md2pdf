#!/bin/bash
set -e

echo "Starting local infrastructure..."
docker compose up -d postgres redis minio minio-setup

echo "Start the web app with: npm run dev:web"
echo "Start the worker with: npm run dev:worker"
