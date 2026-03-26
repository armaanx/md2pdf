#!/bin/bash
set -e

echo "Installing workspace dependencies..."
npm install

echo "Generating Prisma client..."
npm run db:generate

echo "Install completed."

