# Backend Changes Required for .md, .xlsx, and .ppt Support

## Overview

To support Markdown (.md), Excel (.xlsx), and PowerPoint (.ppt/.pptx) formats, the backend requires significant enhancements to handle file processing, redaction, and export capabilities across these formats.

## 1. Dependencies and Requirements

### Update `requirements.txt`

Add the following packages to support new file formats:

```txt
# Existing dependencies
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

# New dependencies for additional format support
openpyxl>=3.1.0           # Excel file reading/writing
xlsxwriter>=3.1.0         # Excel file creation
python-pptx>=0.6.21       # PowerPoint file handling
markdown>=3.5.0           # Markdown processing
markdownify>=0.11.6       # Convert HTML to Markdown
python-docx>=0.8.11       # Word document handling (for conversion)
xlrd>=2.0.1              # Excel file reading (legacy support)
pandoc>=2.3               # Universal document converter
mistune>=3.0.1            # Fast Markdown parser
```

## 2. Core Backend File Structure Changes

### New Modules to Create

1. **`backend/format_handlers/`** - Directory for format-specific handlers
   - `__init__.py`
   - `markdown_handler.py`
   - `excel_handler.py`
   - `powerpoint_handler.py`
   - `base_handler.py`

2. **`backend/exporters/`** - Directory for export functionality
   - `__init__.py`
   - `markdown_exporter.py`
   - `excel_exporter.py`
   - `powerpoint_exporter.py`
   - `base_exporter.py`

3. **`backend/utils/`** - Utility functions
   - `__init__.py`
   - `file_utils.py`
   - `format_detection.py`

## 3. API Endpoint Changes Required

### A. New Pydantic Models in `app.py`

```python
class ExportRequest(BaseModel):
    file_paths: List[str]
    export_format: str  # 'md', 'xlsx', 'pptx'
    output_filename: str = None

class RedactDocumentRequest(BaseModel):
    file_paths: List[str]
    file_types: List[str] = []  # Support multiple formats

class FileFormatInfo(BaseModel):
    supported_formats: List[str]
    upload_formats: List[str]
    export_formats: List[str]
```

### B. New API Endpoints to Add

```python
@app.get("/api/supported-formats")
def get_supported_formats():
    """Get list of supported file formats for upload and export"""

@app.post("/api/export-document")
def export_document(request: ExportRequest):
    """Export processed document data to specified format"""

@app.post("/api/redact-document")
def redact_document(request: RedactDocumentRequest):
    """Redact documents across multiple formats (replaces redact-pdf)"""

@app.get("/api/download-exported/{export_id}")
def download_exported_file(export_id: str):
    """Download exported file by ID"""
```

### C. Modify Existing Endpoints

#### Update `upload_to_uc()` function:
- Add validation for .md, .xlsx, .pptx files
- Add format-specific preprocessing

#### Update `redact_pdf_documents()` to `redact_documents()`:
- Remove PDF-only restriction
- Add support for multiple file formats
- Implement format-specific redaction logic

## 4. Format Handler Implementation

### Base Handler (`backend/format_handlers/base_handler.py`)

```python
from abc import ABC, abstractmethod
from typing import Dict, Any, List

class BaseFormatHandler(ABC):
    @abstractmethod
    def can_handle(self, file_path: str, mime_type: str) -> bool:
        """Check if handler can process this file type"""
        pass
    
    @abstractmethod
    def extract_content(self, file_path: str) -> str:
        """Extract text content from file"""
        pass
    
    @abstractmethod
    def redact_content(self, file_path: str, replacements: Dict[str, str]) -> str:
        """Redact content and return new file path"""
        pass
    
    @abstractmethod
    def get_supported_extensions(self) -> List[str]:
        """Return list of supported file extensions"""
        pass
```

### Markdown Handler (`backend/format_handlers/markdown_handler.py`)

```python
import re
import tempfile
import os
from typing import Dict, List

class MarkdownHandler(BaseFormatHandler):
    def can_handle(self, file_path: str, mime_type: str) -> bool:
        return file_path.lower().endswith('.md') or mime_type == 'text/markdown'
    
    def extract_content(self, file_path: str) -> str:
        """Extract text content from Markdown file"""
        # Implementation details
    
    def redact_content(self, file_path: str, replacements: Dict[str, str]) -> str:
        """Redact Markdown content using text replacement"""
        # Implementation details
    
    def get_supported_extensions(self) -> List[str]:
        return ['.md', '.markdown']
```

### Excel Handler (`backend/format_handlers/excel_handler.py`)

```python
import openpyxl
import pandas as pd
from typing import Dict, List

class ExcelHandler(BaseFormatHandler):
    def can_handle(self, file_path: str, mime_type: str) -> bool:
        return (file_path.lower().endswith(('.xlsx', '.xls')) or 
                mime_type in ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
    
    def extract_content(self, file_path: str) -> str:
        """Extract text content from Excel sheets"""
        # Implementation: Read all sheets, convert to text
    
    def redact_content(self, file_path: str, replacements: Dict[str, str]) -> str:
        """Redact Excel content across all sheets"""
        # Implementation: Process each sheet, replace cell values
    
    def get_supported_extensions(self) -> List[str]:
        return ['.xlsx', '.xls']
```

### PowerPoint Handler (`backend/format_handlers/powerpoint_handler.py`)

```python
from pptx import Presentation
from typing import Dict, List

class PowerPointHandler(BaseFormatHandler):
    def can_handle(self, file_path: str, mime_type: str) -> bool:
        return (file_path.lower().endswith(('.pptx', '.ppt')) or 
                mime_type == 'application/vnd.openxmlformats-officedocument.presentationml.presentation')
    
    def extract_content(self, file_path: str) -> str:
        """Extract text content from PowerPoint slides"""
        # Implementation: Read all slides, extract text from shapes
    
    def redact_content(self, file_path: str, replacements: Dict[str, str]) -> str:
        """Redact PowerPoint content across all slides"""
        # Implementation: Process each slide, replace text in shapes
    
    def get_supported_extensions(self) -> List[str]:
        return ['.pptx', '.ppt']
```

## 5. Export Functionality

### Base Exporter (`backend/exporters/base_exporter.py`)

```python
from abc import ABC, abstractmethod
from typing import Any, Dict

class BaseExporter(ABC):
    @abstractmethod
    def export(self, content: str, metadata: Dict[str, Any]) -> str:
        """Export content to specific format, return file path"""
        pass
    
    @abstractmethod
    def get_mime_type(self) -> str:
        """Return MIME type for exported format"""
        pass
```

### Markdown Exporter (`backend/exporters/markdown_exporter.py`)

```python
class MarkdownExporter(BaseExporter):
    def export(self, content: str, metadata: Dict[str, Any]) -> str:
        """Export content as Markdown file"""
        # Implementation: Format content as Markdown with proper headers
    
    def get_mime_type(self) -> str:
        return 'text/markdown'
```

### Excel Exporter (`backend/exporters/excel_exporter.py`)

```python
import openpyxl
import pandas as pd

class ExcelExporter(BaseExporter):
    def export(self, content: str, metadata: Dict[str, Any]) -> str:
        """Export content as Excel workbook"""
        # Implementation: Create workbook with structured data
    
    def get_mime_type(self) -> str:
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
```

### PowerPoint Exporter (`backend/exporters/powerpoint_exporter.py`)

```python
from pptx import Presentation

class PowerPointExporter(BaseExporter):
    def export(self, content: str, metadata: Dict[str, Any]) -> str:
        """Export content as PowerPoint presentation"""
        # Implementation: Create slides with structured content
    
    def get_mime_type(self) -> str:
        return 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
```

## 6. Core App.py Modifications

### A. Import Additions

```python
# Add at top of app.py
from format_handlers.markdown_handler import MarkdownHandler
from format_handlers.excel_handler import ExcelHandler
from format_handlers.powerpoint_handler import PowerPointHandler
from exporters.markdown_exporter import MarkdownExporter
from exporters.excel_exporter import ExcelExporter
from exporters.powerpoint_exporter import PowerPointExporter
from utils.format_detection import detect_file_format, get_format_handler
from utils.file_utils import get_file_extension, validate_file_format
```

### B. Format Handler Registry

```python
# Add after imports
FORMAT_HANDLERS = {
    'markdown': MarkdownHandler(),
    'excel': ExcelHandler(),
    'powerpoint': PowerPointHandler()
}

EXPORTERS = {
    'md': MarkdownExporter(),
    'xlsx': ExcelExporter(),
    'pptx': PowerPointExporter()
}
```

### C. Modified Functions

#### Update `upload_to_uc()` function:

```python
@app.post("/api/upload-to-uc")
async def upload_to_uc(files: List[UploadFile] = FastAPIFile(...)):
    """Upload files to Databricks UC Volume - supports multiple formats"""
    if not w:
        raise HTTPException(status_code=500, detail="Databricks connection is not configured.")
    
    supported_extensions = ['.pdf', '.md', '.xlsx', '.xls', '.pptx', '.ppt', '.txt', '.doc', '.docx', '.csv', '.json']
    
    try:
        uploaded_files = []
        
        for file in files:
            # Validate file format
            file_ext = get_file_extension(file.filename)
            if file_ext not in supported_extensions:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Unsupported file format: {file_ext}. Supported formats: {', '.join(supported_extensions)}"
                )
            
            # Create a temporary file to store the uploaded content
            with tempfile.NamedTemporaryFile(delete=False) as temp_file:
                shutil.copyfileobj(file.file, temp_file)
                temp_file_path = temp_file.name
            
            try:
                # Upload to UC Volume
                base_path = get_uc_volume_path().rstrip('/')
                uc_file_path = f"{base_path}/{file.filename}"
                
                with open(temp_file_path, 'rb') as f:
                    w.files.upload(
                        file_path=uc_file_path,
                        contents=f,
                        overwrite=True
                    )
                
                file_size = os.path.getsize(temp_file_path)
                
                uploaded_files.append({
                    "name": file.filename,
                    "path": uc_file_path,
                    "size": file_size,
                    "format": file_ext,
                    "handler_available": file_ext in ['.pdf', '.md', '.xlsx', '.pptx']
                })
                
            finally:
                os.unlink(temp_file_path)
        
        return {
            "success": True,
            "uploaded_files": uploaded_files,
            "message": f"Successfully uploaded {len(uploaded_files)} files to UC Volume"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
```

## 7. Redaction Function Updates

### Replace `redact_pdf_documents()` with `redact_documents()`:

```python
@app.post("/api/redact-document")
def redact_documents(request: RedactDocumentRequest):
    """Perform NER-based redaction on uploaded documents across formats"""
    if not w:
        raise HTTPException(status_code=500, detail="Databricks connection is not configured.")
    
    if not current_warehouse_id:
        raise HTTPException(status_code=500, detail="DATABRICKS_WAREHOUSE_ID is not set.")
    
    if not request.file_paths:
        raise HTTPException(status_code=400, detail="file_paths is required")
    
    try:
        destination_table = get_delta_table_path()
        redacted_files = []
        
        for original_file_path in request.file_paths:
            print(f"Processing redaction for: {original_file_path}")
            
            # Detect file format
            file_format = detect_file_format(original_file_path)
            handler = get_format_handler(file_format)
            
            if not handler:
                print(f"No handler available for: {original_file_path}")
                continue
            
            # Get document content from Delta table
            dbfs_path = 'dbfs:' + original_file_path if original_file_path.startswith('/Volumes/') else original_file_path
            
            query = f"""
            SELECT content
            FROM IDENTIFIER('{destination_table}')
            WHERE path = '{dbfs_path}'
            LIMIT 1
            """
            
            result = w.statement_execution.execute_statement(
                statement=query,
                warehouse_id=current_warehouse_id,
                wait_timeout='30s'
            )
            
            if not result.result or not result.result.data_array:
                continue
            
            content = result.result.data_array[0][0]
            if not content or not content.strip():
                continue
            
            # Extract entities for redaction using NER
            entities_to_redact = extract_entities_for_redaction(content)
            
            if not entities_to_redact:
                redacted_files.append({
                    "original_file": original_file_path,
                    "redacted_file": original_file_path,
                    "entities_count": 0,
                    "status": "no_entities_found",
                    "format": file_format
                })
                continue
            
            # Perform format-specific redaction
            redacted_path = handler.redact_content(original_file_path, entities_to_redact)
            
            redacted_files.append({
                "original_file": original_file_path,
                "redacted_file": redacted_path,
                "entities_count": len(entities_to_redact),
                "entities": entities_to_redact,
                "status": "redacted",
                "format": file_format
            })
        
        return {
            "success": True,
            "message": f"Successfully processed {len(redacted_files)} file(s) for redaction",
            "redacted_files": redacted_files
        }
        
    except Exception as e:
        print(f"Document redaction error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to redact documents: {str(e)}")
```

## 8. Export Endpoint Implementation

```python
@app.post("/api/export-document")
def export_document(request: ExportRequest):
    """Export processed document data to specified format"""
    if not w:
        raise HTTPException(status_code=500, detail="Databricks connection is not configured.")
    
    if request.export_format not in EXPORTERS:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported export format: {request.export_format}. Supported: {list(EXPORTERS.keys())}"
        )
    
    try:
        destination_table = get_delta_table_path()
        
        # Get document content from Delta table
        if request.file_paths:
            dbfs_paths = [('dbfs:' + fp if fp.startswith('/Volumes/') else fp) for fp in request.file_paths]
            path_conditions = ", ".join([f"'{fp}'" for fp in dbfs_paths])
            where_clause = f"WHERE path IN ({path_conditions})"
        else:
            where_clause = ""
        
        query = f"""
        SELECT path, content
        FROM IDENTIFIER('{destination_table}')
        {where_clause}
        """
        
        result = w.statement_execution.execute_statement(
            statement=query,
            warehouse_id=current_warehouse_id,
            wait_timeout='30s'
        )
        
        if not result.result or not result.result.data_array:
            raise HTTPException(status_code=404, detail="No document data found")
        
        # Combine content from all documents
        combined_content = ""
        metadata = {"files": [], "export_format": request.export_format}
        
        for row in result.result.data_array:
            path, content = row[0], row[1]
            combined_content += f"\n\n{content}" if combined_content else content
            metadata["files"].append(path)
        
        # Export using appropriate exporter
        exporter = EXPORTERS[request.export_format]
        export_file_path = exporter.export(combined_content, metadata)
        
        # Generate download filename
        output_filename = request.output_filename or f"exported_document.{request.export_format}"
        
        return {
            "success": True,
            "export_file_path": export_file_path,
            "download_filename": output_filename,
            "export_format": request.export_format,
            "files_processed": len(metadata["files"])
        }
        
    except Exception as e:
        print(f"Export error: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to export document: {str(e)}")
```

## 9. Utility Functions Required

### File Utils (`backend/utils/file_utils.py`)

```python
import os
from typing import Optional

def get_file_extension(filename: str) -> str:
    """Get file extension from filename"""
    return os.path.splitext(filename.lower())[1]

def validate_file_format(filename: str, supported_formats: list) -> bool:
    """Validate if file format is supported"""
    ext = get_file_extension(filename)
    return ext in supported_formats

def generate_output_filename(original_path: str, suffix: str, new_extension: str = None) -> str:
    """Generate output filename with suffix"""
    base_path = os.path.dirname(original_path)
    filename = os.path.splitext(os.path.basename(original_path))[0]
    ext = new_extension or os.path.splitext(original_path)[1]
    return os.path.join(base_path, f"{filename}_{suffix}{ext}").replace('\\', '/')
```

### Format Detection (`backend/utils/format_detection.py`)

```python
from typing import Optional
import mimetypes

def detect_file_format(file_path: str) -> str:
    """Detect file format from path and return format type"""
    ext = os.path.splitext(file_path.lower())[1]
    
    format_mapping = {
        '.md': 'markdown',
        '.markdown': 'markdown',
        '.xlsx': 'excel',
        '.xls': 'excel',
        '.pptx': 'powerpoint',
        '.ppt': 'powerpoint',
        '.pdf': 'pdf'
    }
    
    return format_mapping.get(ext, 'unknown')

def get_format_handler(format_type: str):
    """Get appropriate format handler"""
    from app import FORMAT_HANDLERS
    return FORMAT_HANDLERS.get(format_type)
```

## 10. Configuration Updates

### Update `app.yaml` if needed:

```yaml
command: ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000"]

env:
- name: "DATABRICKS_APP_PORT"
  value: "8000"
- name: "DATABRICKS_WAREHOUSE_ID"
  value: "862f1d757f0424f7"
- name: "STATIC_FILES_PATH"
  value: "/Workspace/Users/q.yu@databricks.com/databricks_apps/pdf-redaction-app/static"
- name: "NEXT_PUBLIC_API_URL"
  value: "https://e2-demo-field-eng.cloud.databricks.com:8000"
- name: "DATABRICKS_VOLUME_PATH"
  value: "/Volumes/fins_genai/unstructured_documents/pwc_document_processing/"
- name: "DATABRICKS_DELTA_TABLE_PATH"
  value: "fins_genai.unstructured_documents.document_processing"
# New configuration for multi-format support
- name: "SUPPORTED_UPLOAD_FORMATS"
  value: ".pdf,.md,.xlsx,.xls,.pptx,.ppt,.txt,.doc,.docx,.csv,.json"
- name: "SUPPORTED_EXPORT_FORMATS"
  value: "md,xlsx,pptx,pdf"
- name: "MAX_FILE_SIZE_MB"
  value: "50"

runtime: python_3.10
```

## 11. Testing Requirements

### Add Test Endpoints (for development/testing):

```python
@app.get("/api/test-format-handlers")
def test_format_handlers():
    """Test all format handlers are working"""
    # Implementation to test each handler

@app.get("/api/test-exporters")
def test_exporters():
    """Test all exporters are working"""
    # Implementation to test each exporter
```

## 12. Implementation Priority

1. **Phase 1**: Update dependencies and create base structure
2. **Phase 2**: Implement Markdown support (simplest format)
3. **Phase 3**: Implement Excel support
4. **Phase 4**: Implement PowerPoint support
5. **Phase 5**: Add export functionality
6. **Phase 6**: Update existing endpoints and add new ones
7. **Phase 7**: Testing and optimization

## 13. Breaking Changes

- `redact-pdf` endpoint will be deprecated in favor of `redact-document`
- Response formats will include format type information
- New error codes for unsupported formats
- Modified upload response structure

## 14. Performance Considerations

- Large Excel files may require streaming processing
- PowerPoint files with many slides need memory management
- Consider async processing for large document exports
- Implement file size limits and validation

This comprehensive set of changes will enable full support for Markdown, Excel, and PowerPoint formats in the document redaction application.
