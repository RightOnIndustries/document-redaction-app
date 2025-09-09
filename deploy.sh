#!/bin/bash

# Accept parameters
APP_FOLDER_IN_WORKSPACE=${1:-"/Workspace/Users/q.yu@databricks.com/databricks_apps/my-new-app"}
LAKEHOUSE_APP_NAME=${2:-"my-new-app"}

echo "🚀 Deploying AI Functions Financial Services Demo"
echo "📁 Workspace Path: $APP_FOLDER_IN_WORKSPACE"
echo "🏷️  App Name: $LAKEHOUSE_APP_NAME"

# Frontend build and import
echo "🔨 Building frontend..."
(
 cd frontend
 
 # Clean previous build to ensure fresh compilation
 echo "🧹 Cleaning previous build..."
 rm -rf out .next 2>/dev/null || true
 
 # Install dependencies if node_modules is missing or package.json changed
 if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules/.package-lock.json" ]; then
   echo "📦 Installing/updating dependencies..."
   npm install
 fi
 
 # Verify Next.js installation
 if ! npx next --version >/dev/null 2>&1; then
   echo "🔧 Next.js installation issue detected, reinstalling..."
   rm -rf node_modules package-lock.json
   npm install
 fi
 
 # Build with latest source
 echo "🏗️ Building latest frontend..."
 npm run build
 
 # Fix routing for static export - ensure proper file structure
 echo "🔧 Fixing static export routing..."
 cp out/next-steps/index.html out/next-steps.html 2>/dev/null || true
 cp out/financial-services/index.html out/financial-services.html 2>/dev/null || true
 cp out/document-intelligence/index.html out/document-intelligence.html 2>/dev/null || true
 
 # Ensure all public assets are in build output (Next.js should handle this, but let's be explicit)
 echo "🎨 Ensuring all public assets are included..."
 if [ -d "public" ]; then
   # Copy any assets from public that might not have been included in build
   for file in public/*; do
     if [ -f "$file" ]; then
       filename=$(basename "$file")
       if [ ! -f "out/$filename" ]; then
         echo "📋 Adding missing asset: $filename"
         cp "$file" "out/$filename"
       fi
     fi
   done
 fi
 
 # Clean up any outdated assets that might be lingering
 echo "🗑️ Cleaning outdated assets..."
 # Remove any asset files that don't exist in public folder
 if [ -d "public" ] && [ -d "out" ]; then
   find out -name "*.png" -o -name "*.jpg" -o -name "*.svg" -o -name "*.ico" 2>/dev/null | while read -r outfile; do
     if [ -f "$outfile" ]; then
       filename=$(basename "$outfile")
       if [ ! -f "public/$filename" ]; then
         echo "🗑️ Removing outdated asset: $filename"
         rm -f "$outfile"
       fi
     fi
   done
 fi
 
 # List what we're about to upload
 echo "📋 Files to be uploaded:"
 find out -type f -name "*.png" -o -name "*.jpg" -o -name "*.svg" -o -name "*.ico" -o -name "*.html" -o -name "*.js" -o -name "*.css" | head -20
 
 # Force delete old static files from workspace first
 echo "🗑️ Cleaning old workspace static files..."
 databricks workspace delete "$APP_FOLDER_IN_WORKSPACE/static" --recursive 2>/dev/null || echo "No existing static folder to delete"
 
 echo "📤 Uploading fresh frontend static files..."
 databricks workspace import-dir out "$APP_FOLDER_IN_WORKSPACE/static" --overwrite
) &

# Backend packaging
echo "📦 Packaging backend..."
(
 cd backend
 mkdir -p build
 # Copy all necessary files except hidden files and build directories
 find . -mindepth 1 -maxdepth 1 -not -name '.*' -not -name "local_conf*" -not -name 'build' -not -name '__pycache__' -exec cp -r {} build/ \;
 
 echo "📤 Uploading backend..."
 # Import and deploy the application
 databricks workspace import-dir build "$APP_FOLDER_IN_WORKSPACE" --overwrite
 rm -rf build
) &

# Wait for both background processes to finish
wait

echo "🚀 Deploying application..."
# Deploy the application
databricks apps deploy "$LAKEHOUSE_APP_NAME" --source-code-path "$APP_FOLDER_IN_WORKSPACE"

echo "✅ Deployment complete!"
echo "🌐 App URL: Check your Databricks workspace for the app URL"
echo "📊 App Name: $LAKEHOUSE_APP_NAME" 