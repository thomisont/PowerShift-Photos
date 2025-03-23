#!/bin/bash

echo "Completely clearing Next.js build and cache..."
rm -rf .next
rm -rf node_modules/.cache

echo "Finding npx location..."
NPX_PATH="./node_modules/.bin/npx"
if [ -f "$NPX_PATH" ]; then
  echo "Found npx at $NPX_PATH"
else
  echo "npx not found in node_modules, trying to install it..."
  npm install npx -g
  NPX_PATH=$(which npx)
  if [ -z "$NPX_PATH" ]; then
    echo "Failed to find npx. Using node directly..."
    node ./node_modules/next/dist/bin/next dev
    exit 1
  fi
fi

echo "Starting PowerShift Photo App with npx..."
export PATH=$PATH:./node_modules/.bin
$NPX_PATH next dev 