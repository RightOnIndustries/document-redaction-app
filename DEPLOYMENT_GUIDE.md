# Databricks App Deployment Guide

## Overview
This guide covers how to bundle the frontend and create the `/static` folder for deploying the multi-format document redaction app to Databricks.

## Prerequisites

1. **Databricks CLI** installed and configured
   ```bash
   pip install databricks-cli
   databricks configure
   ```

2. **Node.js and npm** installed (for frontend building)
   ```bash
   node --version  # Should be 18+
   npm --version
   ```

3. **Databricks workspace access** with permissions to create apps

4. **Git repository** properly configured (see Version Control section below)

## Step-by-Step Deployment Process

### Step 1: Install Frontend Dependencies

```bash
cd frontend
npm install
```

### Step 2: Build the Frontend for Static Export

The Next.js app is already configured for static export in `next.config.ts`:

```bash
cd frontend
npm run build
```

This creates the `frontend/out` directory with static files:
- `out/` - Contains all static HTML, CSS, JS files
- `out/_next/` - Next.js bundled assets
- `out/` - Public assets (images, favicons, etc.)

### Step 3: Verify Build Output

Check that the build created the expected files:

```bash
ls -la frontend/out/
# Should show:
# - index.html (main page)
# - document-intelligence/ (or document-intelligence.html)
# - next-steps/ (or next-steps.html)
# - _next/ (bundled assets)
# - *.png, *.svg (static assets)
```

### Step 4: Prepare Backend Files

```bash
cd backend
# Backend files should include:
# - app.py (main FastAPI app with multi-format support)
# - requirements.txt (with new dependencies)
# - app.yaml (configuration)
# - ner_prompt.md (NER prompt file)
```

### Step 5: Deploy Using the Deploy Script

The provided `deploy.sh` script handles the entire deployment:

```bash
# Option 1: Use default paths
./deploy.sh

# Option 2: Specify custom paths
./deploy.sh "/Workspace/Users/your.email@company.com/databricks_apps/document-redaction" "document-redaction-app"
```

**What the deploy script does:**

1. **Frontend Build & Upload:**
   - Cleans previous builds
   - Installs/updates npm dependencies
   - Builds static export with `npm run build`
   - Fixes routing for Next.js static export
   - Copies static files to Databricks workspace at `{APP_PATH}/static`

2. **Backend Package & Upload:**
   - Packages backend files (excluding build artifacts)
   - Uploads to Databricks workspace at `{APP_PATH}`

3. **App Deployment:**
   - Deploys the Databricks app using the uploaded files

### Step 6: Manual Deployment (Alternative)

If you prefer manual control:

#### 6.1: Build Frontend Manually
```bash
cd frontend
npm install
npm run build
```

#### 6.2: Upload Static Files
```bash
# Replace with your actual workspace path
databricks workspace import-dir frontend/out "/Workspace/Users/your.email@company.com/databricks_apps/document-redaction/static" --overwrite
```

#### 6.3: Upload Backend Files
```bash
cd backend
databricks workspace import-dir . "/Workspace/Users/your.email@company.com/databricks_apps/document-redaction" --overwrite
```

#### 6.4: Deploy App
```bash
databricks apps deploy "document-redaction-app" --source-code-path "/Workspace/Users/your.email@company.com/databricks_apps/document-redaction"
```

## Required File Structure in Databricks Workspace

After deployment, your workspace should contain:

```
/Workspace/Users/your.email@company.com/databricks_apps/document-redaction/
├── app.py                 # Main FastAPI application
├── requirements.txt       # Python dependencies (with new packages)
├── app.yaml              # App configuration
├── ner_prompt.md         # NER prompt file
└── static/               # Frontend static files
    ├── index.html        # Main page
    ├── document-intelligence/
    │   └── index.html    # Document intelligence page
    ├── next-steps/
    │   └── index.html    # Next steps page
    ├── _next/            # Next.js assets
    │   ├── static/
    │   └── ...
    ├── favicon.ico
    ├── *.png            # Static images
    └── *.svg            # Static SVGs
```

## Key Configuration Files

### 1. `frontend/next.config.ts`
```typescript
const nextConfig: NextConfig = {
  output: 'export',        // Static export
  trailingSlash: true,     // Required for static hosting
  images: {
    unoptimized: true      // Required for static export
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  typescript: {
    ignoreBuildErrors: true
  }
};
```

### 2. `backend/app.yaml`
```yaml
command: ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

env:
- name: "DATABRICKS_APP_PORT"
  value: "8000"
- name: "STATIC_FILES_PATH"
  value: "/Workspace/Users/q.yu@databricks.com/databricks_apps/pdf-redaction-app/static"
# ... other environment variables
```

### 3. `backend/requirements.txt`
```txt
# Core dependencies
fastapi
uvicorn[standard]
databricks-sdk
python-dotenv
requests
python-multipart
PyYAML
PyPDF2 
pandas
pymupdf

# New multi-format dependencies
openpyxl>=3.1.0
xlsxwriter>=3.1.0
python-pptx>=0.6.21
markdown>=3.5.0
markdownify>=0.11.6
python-docx>=0.8.11
xlrd>=2.0.1
mistune>=3.0.1
```

## Troubleshooting

### Common Issues and Solutions

1. **Build Errors:**
   ```bash
   # Clean and rebuild
   cd frontend
   rm -rf node_modules package-lock.json .next out
   npm install
   npm run build
   ```

2. **Static File Access Issues:**
   - Ensure `STATIC_FILES_PATH` in `app.yaml` matches your workspace path
   - Check that files exist in the `/static` directory in workspace

3. **Missing Dependencies:**
   ```bash
   # Verify backend dependencies
   cd backend
   pip install -r requirements.txt
   ```

4. **App Deployment Failures:**
   - Check Databricks CLI configuration: `databricks configure --token`
   - Verify workspace permissions for app creation
   - Ensure unique app name

### Verification Steps

1. **Check Static Files:**
   ```bash
   databricks workspace list "/Workspace/Users/your.email@company.com/databricks_apps/document-redaction/static"
   ```

2. **Check App Status:**
   ```bash
   databricks apps list
   ```

3. **Test Endpoints:**
   - Visit the app URL in Databricks
   - Test `/api/supported-formats` endpoint
   - Upload test files and verify new format support

## New Features Verification

After deployment, verify the new multi-format features:

1. **Upload Support:** Test uploading .md, .xlsx, .pptx files
2. **Format Detection:** Check format badges and support indicators
3. **Export Functionality:** Test exporting to MD, XLSX, PPTX formats
4. **Multi-Format Redaction:** Test redaction across different formats
5. **Enhanced Previews:** Verify format-specific preview rendering

## Performance Considerations

- **Static File Caching:** Next.js automatically optimizes static assets
- **Bundle Size:** The new dependencies add ~10-15MB to the backend
- **Memory Usage:** Excel/PowerPoint processing may require more memory
- **Concurrent Processing:** Large file processing may benefit from increased resources

## Security Notes

- All file processing happens within the Databricks environment
- No external API calls for document processing
- Unity Catalog integration maintains data governance
- New format handlers follow the same security model as PDF processing

This deployment process will create a fully functional multi-format document redaction application in your Databricks workspace with support for Markdown, Excel, PowerPoint, and PDF formats.

## Version Control Best Practices

### Git Repository Structure

The repository includes a comprehensive `.gitignore` file that excludes:

**Build Outputs:**
- `frontend/out/` - Next.js static export
- `frontend/.next/` - Next.js build cache
- `backend/build/` - Backend build artifacts
- `static/` - Generated static files

**Dependencies:**
- `node_modules/` - npm packages
- `__pycache__/` - Python cache files
- `venv/` - Python virtual environments

**Environment Files:**
- `.env*` - Environment variables
- `config/local.json` - Local configuration

**IDE and OS Files:**
- `.vscode/`, `.idea/` - Editor settings
- `.DS_Store`, `Thumbs.db` - OS generated files

### What to Commit

**✅ Include in Git:**
```
├── .gitignore                 # Version control rules
├── README.md                  # Project documentation
├── DEPLOYMENT_GUIDE.md        # Deployment instructions
├── backendchanges.md          # Backend implementation details
├── deploy.sh                  # Deployment script
├── frontend/
│   ├── package.json          # Frontend dependencies
│   ├── next.config.ts        # Next.js configuration
│   ├── tsconfig.json         # TypeScript configuration
│   └── src/                  # Source code
├── backend/
│   ├── app.py                # Main application
│   ├── requirements.txt      # Python dependencies
│   ├── app.yaml             # App configuration
│   └── ner_prompt.md        # NER prompt template
```

**❌ Exclude from Git:**
```
├── frontend/out/             # Build output
├── frontend/.next/           # Build cache
├── frontend/node_modules/    # Dependencies
├── backend/__pycache__/      # Python cache
├── backend/venv/            # Virtual environment
├── .env                     # Environment variables
├── static/                  # Generated static files
```

### Development Workflow

1. **Initial Setup:**
   ```bash
   git clone <repository-url>
   cd document-redaction-app
   
   # Install frontend dependencies
   cd frontend && npm install && cd ..
   
   # Install backend dependencies
   cd backend && pip install -r requirements.txt && cd ..
   ```

2. **Development:**
   ```bash
   # Frontend development
   cd frontend && npm run dev
   
   # Backend development
   cd backend && uvicorn app:app --reload
   ```

3. **Before Deployment:**
   ```bash
   # Ensure clean repository
   git status
   git add .
   git commit -m "feat: add multi-format document support"
   git push origin main
   
   # Deploy
   ./deploy.sh
   ```

### CI/CD Considerations

For automated deployments, ensure your CI/CD pipeline:

1. **Installs Dependencies:**
   ```yaml
   - name: Install Node.js dependencies
     run: cd frontend && npm ci
   
   - name: Install Python dependencies
     run: cd backend && pip install -r requirements.txt
   ```

2. **Builds Frontend:**
   ```yaml
   - name: Build frontend
     run: cd frontend && npm run build
   ```

3. **Excludes Build Artifacts:**
   - Uses `.gitignore` to prevent committing build outputs
   - Generates fresh builds in CI/CD environment

4. **Manages Secrets:**
   - Databricks credentials as environment variables
   - No hardcoded paths or tokens in repository

This version control setup ensures that only source code is tracked while build artifacts and dependencies are regenerated during deployment.
