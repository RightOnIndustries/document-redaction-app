"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useRef, useEffect } from 'react';
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Upload, FileText, Database, Settings, AlertCircle, Download, File, Eye, Play, Loader2, Lightbulb, Save, ChevronDown, ChevronRight } from "lucide-react";
// API call utility function
const apiCall = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
};

interface SelectedFile {
    file: File;
    name: string;
    size: number;
    type: string;
    preview?: string;
    previewUrl?: string;
    isUploaded: boolean;
    ucPath?: string;
    isProcessing: boolean;
    processError?: string;
    format?: string;
    extension?: string;
    handlerAvailable?: boolean;
    redactionSupported?: boolean;
}

interface WarehouseConfig {
    warehouse_id: string;
    default_warehouse_id: string;
}

interface VolumePathConfig {
    volume_path: string;
    default_volume_path: string;
}

interface DeltaTablePathConfig {
    delta_table_path: string;
    default_delta_table_path: string;
}

interface SupportedFormats {
    supported_formats: string[];
    upload_formats: string[];
    export_formats: string[];
    format_handlers_available: {
        markdown: boolean;
        excel: boolean;
        powerpoint: boolean;
        pdf: boolean;
    };
}

interface ExportInfo {
    success: boolean;
    export_file_path: string;
    download_filename: string;
    export_format: string;
    files_processed: number;
}

interface RedactedFile {
    original_file: string;
    redacted_file: string;
    entities_count: number;
    entities?: any;
    status: string;
    format: string;
}

export default function DocumentIntelligencePage() {
    const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
    const [activeFileIndex, setActiveFileIndex] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // Demo Value and Settings state
    const [showValueModal, setShowValueModal] = useState(false);
    const [showWarehouseConfig, setShowWarehouseConfig] = useState(false);
    const [warehouseConfig, setWarehouseConfig] = useState<WarehouseConfig>({ warehouse_id: '', default_warehouse_id: '' });
    const [newWarehouseId, setNewWarehouseId] = useState('');
    const [warehouseLoading, setWarehouseLoading] = useState(false);
    const [warehouseSuccess, setWarehouseSuccess] = useState(false);

    // Volume path configuration state
    const [volumePathConfig, setVolumePathConfig] = useState<VolumePathConfig>({ volume_path: '', default_volume_path: '' });
    const [newVolumePath, setNewVolumePath] = useState('');
    const [volumePathLoading, setVolumePathLoading] = useState(false);
    const [volumePathSuccess, setVolumePathSuccess] = useState(false);

    // Delta table path configuration state
    const [deltaTablePathConfig, setDeltaTablePathConfig] = useState<DeltaTablePathConfig>({ delta_table_path: '', default_delta_table_path: '' });
    const [newDeltaTablePath, setNewDeltaTablePath] = useState('');
    const [deltaTablePathLoading, setDeltaTablePathLoading] = useState(false);
    const [deltaTablePathSuccess, setDeltaTablePathSuccess] = useState(false);

    // Collapse state for panels
    const [isDocumentPreviewCollapsed, setIsDocumentPreviewCollapsed] = useState(false);
    const [isFileUploadCollapsed, setIsFileUploadCollapsed] = useState(false);
    const [isSelectedFilesCollapsed, setIsSelectedFilesCollapsed] = useState(false);
    const [isDeltaTableResultsCollapsed, setIsDeltaTableResultsCollapsed] = useState(false);

    // Delta table state
    const [deltaTableResults, setDeltaTableResults] = useState<any[]>([]);
    const [deltaTableLoading, setDeltaTableLoading] = useState(false);
    const [deltaTableError, setDeltaTableError] = useState<string | null>(null);
    const [processedSessionFiles, setProcessedSessionFiles] = useState<string[]>([]);
    const [showDeltaTableResults, setShowDeltaTableResults] = useState(false);

    // AI Functions test state
    const [aiTestLoading, setAiTestLoading] = useState(false);
    const [aiTestResult, setAiTestResult] = useState<{success: boolean, message: string} | null>(null);
    
    
    // Multi-format redaction state (replaces PDF-only redaction)
    const [documentRedactionLoading, setDocumentRedactionLoading] = useState(false);
    const [documentRedactionError, setDocumentRedactionError] = useState<string | null>(null);
    const [documentRedactionSuccess, setDocumentRedactionSuccess] = useState(false);
    const [redactedFiles, setRedactedFiles] = useState<RedactedFile[]>([]);
    
    // Export functionality state
    const [exportLoading, setExportLoading] = useState(false);
    const [exportError, setExportError] = useState<string | null>(null);
    const [exportSuccess, setExportSuccess] = useState(false);
    const [exportInfo, setExportInfo] = useState<ExportInfo | null>(null);
    const [selectedExportFormat, setSelectedExportFormat] = useState<string>('md');
    
    // Supported formats state
    const [supportedFormats, setSupportedFormats] = useState<SupportedFormats | null>(null);
    const [formatsLoading, setFormatsLoading] = useState(false);

    // Utility function to extract error message from various error types
    const getErrorMessage = (err: unknown): string => {
        // Debug logging to understand what we're receiving
        console.log('getErrorMessage received:', err, 'type:', typeof err);
        
        if (err instanceof Error) {
            return err.message;
        } else if (typeof err === 'string') {
            return err;
        } else if (err && typeof err === 'object') {
            const errObj = err as any;
            // Try multiple properties that might contain the error message
            const message = errObj.detail || errObj.message || errObj.error || errObj.statusText;
            if (message && typeof message === 'string') {
                return message;
            }
            // If no string message found, stringify the object but make it readable
            try {
                return JSON.stringify(err, null, 2);
            } catch {
                return 'Error object could not be serialized';
            }
        }
        return 'An unknown error occurred';
    };

    // Test AI Functions availability
    const testAiFunctions = async () => {
        setAiTestLoading(true);
        setAiTestResult(null);
        
        try {
            const response = await apiCall("/api/test-ai-functions", {
                method: "POST"
            });
            
            setAiTestResult({
                success: response.success,
                message: response.message
            });
        } catch (err) {
            setAiTestResult({
                success: false,
                message: getErrorMessage(err)
            });
        } finally {
            setAiTestLoading(false);
        }
    };

    // Load supported formats
    const loadSupportedFormats = async () => {
        setFormatsLoading(true);
        try {
            const formats = await apiCall("/api/supported-formats");
            setSupportedFormats(formats);
        } catch (err) {
            console.warn('Failed to load supported formats:', err);
        } finally {
            setFormatsLoading(false);
        }
    };

    // Load configuration on component mount
    useEffect(() => {
        const loadConfigurations = async () => {
            try {
                // Load warehouse config
                const warehouseConfig = await apiCall("/api/warehouse-config");
                setWarehouseConfig(warehouseConfig);
                setNewWarehouseId(warehouseConfig.warehouse_id || '');

                // Load volume path config
                const volumePathConfig = await apiCall("/api/volume-path-config");
                setVolumePathConfig(volumePathConfig);
                setNewVolumePath(volumePathConfig.volume_path || '');

                // Load delta table path config
                const deltaTablePathConfig = await apiCall("/api/delta-table-path-config");
                setDeltaTablePathConfig(deltaTablePathConfig);
                setNewDeltaTablePath(deltaTablePathConfig.delta_table_path || '');
                
                // Load supported formats
                await loadSupportedFormats();
            } catch (err) {
                console.warn('Failed to load configurations:', err);
            }
        };

        loadConfigurations();
    }, []);

    // Update warehouse configuration
    const updateWarehouseConfig = async () => {
        if (!newWarehouseId.trim()) return;
        
        setWarehouseLoading(true);
        setWarehouseSuccess(false);
        
        try {
            const result = await apiCall("/api/warehouse-config", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ warehouse_id: newWarehouseId.trim() }),
            });
            
            if (result.success) {
                setWarehouseConfig(prev => ({ ...prev, warehouse_id: result.warehouse_id }));
                setWarehouseSuccess(true);
                setTimeout(() => setWarehouseSuccess(false), 3000);
            } else {
                throw new Error(result.message || 'Failed to update warehouse ID');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update warehouse configuration');
        } finally {
            setWarehouseLoading(false);
        }
    };

    // Update volume path configuration
    const updateVolumePathConfig = async () => {
        if (!newVolumePath.trim()) return;
        
        setVolumePathLoading(true);
        setVolumePathSuccess(false);
        
        try {
            const result = await apiCall("/api/volume-path-config", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ volume_path: newVolumePath.trim() }),
            });
            
            if (result.success) {
                setVolumePathConfig(prev => ({ ...prev, volume_path: result.volume_path }));
                setVolumePathSuccess(true);
                setTimeout(() => setVolumePathSuccess(false), 3000);
            } else {
                throw new Error(result.message || 'Failed to update volume path');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update volume path configuration');
        } finally {
            setVolumePathLoading(false);
        }
    };

    // Update delta table path configuration
    const updateDeltaTablePathConfig = async () => {
        if (!newDeltaTablePath.trim()) return;
        
        setDeltaTablePathLoading(true);
        setDeltaTablePathSuccess(false);
        
        try {
            const result = await apiCall("/api/delta-table-path-config", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ delta_table_path: newDeltaTablePath.trim() }),
            });
            
            if (result.success) {
                setDeltaTablePathConfig(prev => ({ ...prev, delta_table_path: result.delta_table_path }));
                setDeltaTablePathSuccess(true);
                setTimeout(() => setDeltaTablePathSuccess(false), 3000);
            } else {
                throw new Error(result.message || 'Failed to update delta table path');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to update delta table path configuration');
        } finally {
            setDeltaTablePathLoading(false);
        }
    };

    // Cleanup blob URLs when component unmounts or files change
    useEffect(() => {
        return () => {
            selectedFiles.forEach(file => {
                if (file.previewUrl) {
                    URL.revokeObjectURL(file.previewUrl);
                }
            });
        };
    }, [selectedFiles]);

    const handleFileSelect = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            // Clean up old blob URLs
            selectedFiles.forEach(file => {
                if (file.previewUrl) {
                    URL.revokeObjectURL(file.previewUrl);
                }
            });

            const fileArray = Array.from(files).map(file => ({
                file,
                name: file.name,
                size: file.size,
                type: file.type,
                isUploaded: false,
                isProcessing: false
            }));
            setSelectedFiles(fileArray);
            setActiveFileIndex(null);
            setError(null);
        }
    };

    const handleFilePreview = async (fileIndex: number) => {
        const file = selectedFiles[fileIndex];
        if (!file) return;

        setActiveFileIndex(fileIndex);

        // If preview already exists, no need to regenerate
        if (file.preview) return;

        // Generate preview for the file
        try {
            let preview = "";
            let previewUrl = "";
            
            if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
                // Text/Markdown file - read content
                const text = await file.file.text();
                if (file.name.endsWith('.md')) {
                    preview = `MARKDOWN:\n${text}`;
                } else {
                    preview = text;
                }
            } else if (file.type === 'application/pdf') {
                // PDF file - create blob URL for iframe preview
                const blob = new Blob([file.file], { type: 'application/pdf' });
                previewUrl = URL.createObjectURL(blob);
                preview = "PDF_PREVIEW"; // Special marker for PDF preview
            } else if (file.type.startsWith('image/')) {
                // Image file - create blob URL for image preview
                const blob = new Blob([file.file], { type: file.type });
                previewUrl = URL.createObjectURL(blob);
                preview = "IMAGE_PREVIEW"; // Special marker for image preview
            } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                // Excel file - show file info
                preview = `EXCEL_PREVIEW:\n\nFile: ${file.name}\nSize: ${formatFileSize(file.size)}\nType: Excel Spreadsheet\n\nThis Excel file contains spreadsheet data. Upload and process to view extracted content using AI document parsing.`;
            } else if (file.name.endsWith('.pptx') || file.name.endsWith('.ppt')) {
                // PowerPoint file - show file info
                preview = `POWERPOINT_PREVIEW:\n\nFile: ${file.name}\nSize: ${formatFileSize(file.size)}\nType: PowerPoint Presentation\n\nThis PowerPoint file contains presentation slides. Upload and process to view extracted content using AI document parsing.`;
            } else {
                // Other file types
                preview = `[Document - ${formatFileSize(file.size)}]

File: ${file.name}
Size: ${formatFileSize(file.size)}
Type: ${file.type}

Click the "Process" button to upload this file to UC Volume and extract its content using AI document parsing.`;
            }

            // Update the file with preview
            setSelectedFiles(prev => prev.map((f, i) => 
                i === fileIndex ? { ...f, preview, previewUrl } : f
            ));

        } catch (err) {
            setError(`Failed to preview file: ${err}`);
        }
    };

    // Function to collapse previous panels when an action is triggered
    const collapseAllPanels = () => {
        setIsFileUploadCollapsed(true);
        setIsSelectedFilesCollapsed(true);
        setIsDocumentPreviewCollapsed(true);
        setIsDeltaTableResultsCollapsed(true);
    };

    const handleProcessFile = async (fileIndex: number) => {
        const file = selectedFiles[fileIndex];
        if (!file) return;

        // Processing starts without collapsing panels

        // Mark as processing
        setSelectedFiles(prev => prev.map((f, i) => 
            i === fileIndex ? { ...f, isProcessing: true, processError: undefined } : f
        ));

        try {
            // Step 1: Upload to UC Volume
            const formData = new FormData();
            formData.append('files', file.file);

            const uploadResult = await apiCall("/api/upload-to-uc", {
                method: "POST",
                body: formData
            });
            const ucPath = uploadResult.uploaded_files[0]?.path;

            if (!ucPath) {
                throw new Error("Failed to get UC path from upload response");
            }

            // Update file with UC path and format information from backend
            const uploadedFileInfo = uploadResult.uploaded_files[0];
            setSelectedFiles(prev => prev.map((f, i) => 
                i === fileIndex ? { 
                    ...f, 
                    isUploaded: true, 
                    ucPath,
                    format: uploadedFileInfo?.format,
                    extension: uploadedFileInfo?.extension,
                    handlerAvailable: uploadedFileInfo?.handler_available,
                    redactionSupported: uploadedFileInfo?.redaction_supported
                } : f
            ));

            // Upload complete - mark file as uploaded and not processing
            setSelectedFiles(prev => prev.map((f, i) => 
                i === fileIndex ? { 
                    ...f, 
                    isProcessing: false
                } : f
            ));

        } catch (err) {
            setSelectedFiles(prev => prev.map((f, i) => 
                i === fileIndex ? { 
                    ...f, 
                    isProcessing: false, 
                    processError: getErrorMessage(err)
                } : f
            ));
        }
    };

    const writeToDeltaTable = async (filePaths: string[]) => {
        try {
            setDeltaTableError(null); // Clear previous errors
            setDeltaTableLoading(true); // Show loading state
            console.log("Starting write operation for:", filePaths);
            
            // FIRE AND FORGET: Start the write operation but don't wait for it
            // The backend will complete in 60+ seconds, but we'll poll for results
            apiCall("/api/write-to-delta-table", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    file_paths: filePaths,
                    limit: 10
                })
            }).then(() => {
                console.log("Write operation completed in background");
            }).catch(error => {
                console.log("Write operation timeout (expected):", error.message);
            });
            
            // IMMEDIATELY show UI sections and start polling for results
            setProcessedSessionFiles(filePaths);
            setShowDeltaTableResults(true);
            setDeltaTableResults([]);
            setDeltaTableError("Processing document... This may take 1-2 minutes for large files.");
            
            console.log("Starting polling for results...");
            
            // POLL for results every 10 seconds
            const pollForResults = async (attemptCount = 0) => {
                const maxAttempts = 30; // 5 minutes of polling (30 * 10 seconds)
                
                if (attemptCount >= maxAttempts) {
                    setDeltaTableError("Processing is taking longer than expected. The operation may still be running in the background. Try refreshing in a few minutes.");
                    setDeltaTableLoading(false);
                    return;
                }
                
                try {
                    console.log(`Polling attempt ${attemptCount + 1}/${maxAttempts}`);
                    const queryResult = await apiCall("/api/query-delta-table", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            file_paths: filePaths,
                            limit: 10
                        })
                    });
                    
                    if (queryResult.success && queryResult.data && queryResult.data.length > 0) {
                        // SUCCESS: Found results!
                        setDeltaTableResults(queryResult.data);
                        setDeltaTableError(null);
                        setDeltaTableLoading(false);
                        console.log(`SUCCESS: Retrieved ${queryResult.data.length} results after ${attemptCount + 1} attempts`);
                        return;
                    } else {
                        // No results yet, continue polling
                        console.log(`No results yet, will retry in 10 seconds...`);
                        setTimeout(() => pollForResults(attemptCount + 1), 10000);
                    }
                    
                } catch (error) {
                    console.error(`Polling attempt ${attemptCount + 1} failed:`, error);
                    // Continue polling even if individual queries fail
                    setTimeout(() => pollForResults(attemptCount + 1), 10000);
                }
            };
            
            // Start polling immediately
            setTimeout(() => pollForResults(), 1000); // Start polling after 1 second
            
        } catch (error) {
            console.error("Error starting write operation:", error);
            setDeltaTableError("Failed to start processing operation");
            setDeltaTableLoading(false);
            setShowDeltaTableResults(false);
        } finally {
            // Don't set loading to false here - polling will handle it
        }
    };

    // Write to Delta Table - Parse uploaded files and write to delta table
    const handleWriteToDeltaTable = async () => {
        try {
            // Get all uploaded files' UC paths
            const uploadedFiles = selectedFiles.filter(file => file.isUploaded && file.ucPath);
            const filePaths = uploadedFiles.map(file => file.ucPath!);
            
            if (filePaths.length === 0) {
                throw new Error("No uploaded files found. Please upload files first.");
            }
            
            console.log("Calling writeToDeltaTable with files:", filePaths);
            
            // Call the new polling-based function - this handles everything
            await writeToDeltaTable(filePaths);
            
        } catch (error) {
            console.error("Error in handleWriteToDeltaTable:", error);
            setDeltaTableError(error instanceof Error ? error.message : String(error));
        }
    };


    const queryDeltaTableResults = async () => {
        console.log("Querying delta table results for files:", processedSessionFiles);
        
        if (processedSessionFiles.length === 0) {
            console.log("No processed files in session, skipping query");
            setDeltaTableResults([]);
            return;
        }

        setDeltaTableLoading(true);
        setDeltaTableError(null);

        try {
            const result = await apiCall("/api/query-delta-table", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    file_paths: processedSessionFiles,
                    limit: 20
                })
            });

            console.log("Delta table query result:", result);
            
            if (result.success) {
                setDeltaTableResults(result.data || []);
                console.log(`Set ${result.data?.length || 0} delta table results`);
            } else {
                throw new Error(result.error || result.message || "Query failed");
            }

        } catch (error) {
            console.error("Delta table query error:", error);
            
            // Handle timeout errors with user-friendly message
            let errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('504') || errorMessage.includes('timeout') || errorMessage.includes('upstream request timeout')) {
                errorMessage = "The query is taking longer than expected. Please by patient.";
            } else if (errorMessage.includes('500') || errorMessage.includes('Internal Server Error')) {
                errorMessage = "There was a server error querying your data. Please check your configuration and try again.";
            } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
                errorMessage = "Network error occurred. Please check your connection and try again.";
            }
            
            setDeltaTableError(errorMessage);
            setDeltaTableResults([]);
        } finally {
            setDeltaTableLoading(false);
        }
    };

    // Export document functionality
    const handleExportDocument = async () => {
        try {
            setExportError(null);
            setExportLoading(true);
            setExportSuccess(false);
            
            // Get all uploaded files' paths
            const uploadedFiles = selectedFiles.filter(file => file.isUploaded && file.ucPath);
            const filePaths = uploadedFiles.map(file => file.ucPath!);
            
            if (filePaths.length === 0) {
                throw new Error("No uploaded files found. Please upload files first.");
            }
            
            if (deltaTableResults.length === 0) {
                throw new Error("No document data found. Please write to Delta Table first.");
            }
            
            console.log("Exporting documents:", filePaths, "Format:", selectedExportFormat);
            
            const result = await apiCall("/api/export-document", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    file_paths: filePaths,
                    export_format: selectedExportFormat,
                    output_filename: `exported_document.${selectedExportFormat}`
                })
            });

            console.log("Export result:", result);
            
            if (result.success) {
                setExportInfo(result);
                setExportSuccess(true);
                console.log(`Successfully exported to ${selectedExportFormat} format`);
            } else {
                setExportError(result.message || "Export failed");
            }
            
        } catch (error) {
            console.error("Export error:", error);
            setExportError(error instanceof Error ? error.message : String(error));
        } finally {
            setExportLoading(false);
        }
    };

    // Download exported file
    const handleDownloadExported = async (filename: string) => {
        try {
            console.log(`Downloading exported file: ${filename}`);
            
            // Get the correct base URL for API calls
            const getDownloadUrl = () => {
                if (typeof window !== 'undefined') {
                    // Check if running in Databricks environment
                    if (window.location.hostname.includes('cloud.databricks.com')) {
                        // Use same origin for downloads in Databricks
                        return `${window.location.protocol}//${window.location.hostname}/api/download-exported/${encodeURIComponent(filename)}`;
                    }
                }
                // For local development
                return `/api/download-exported/${encodeURIComponent(filename)}`;
            };
            
            const downloadUrl = getDownloadUrl();
            console.log(`Download URL: ${downloadUrl}`);
            
            // Use fetch to get the file
            const response = await fetch(downloadUrl);
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Download failed: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            // Get the blob from the response
            const blob = await response.blob();
            
            // Create a blob URL and download
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            
            console.log(`Download completed for ${filename}`);
            
        } catch (error) {
            console.error("Export download error:", error);
            alert(`Download failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const handleRedactDocuments = async () => {
        try {
            setDocumentRedactionError(null);
            setDocumentRedactionLoading(true);
            setDocumentRedactionSuccess(false);
            
            // Get all uploaded files' paths that support redaction
            const uploadedFiles = selectedFiles.filter(file => file.isUploaded && file.ucPath && file.redactionSupported);
            const filePaths = uploadedFiles.map(file => file.ucPath!);
            
            if (filePaths.length === 0) {
                throw new Error("No uploaded files with redaction support found. Please upload supported files first.");
            }
            
            if (deltaTableResults.length === 0) {
                throw new Error("No document data found. Please write to Delta Table first.");
            }
            
            console.log("Redacting documents:", filePaths);
            
            const result = await apiCall("/api/redact-document", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    file_paths: filePaths
                })
            });

            console.log("Document redaction result:", result);
            
            if (result.success && result.redacted_files) {
                setRedactedFiles(result.redacted_files);
                setDocumentRedactionSuccess(true);
                console.log(`Successfully processed ${result.redacted_files.length} documents for redaction`);
            } else {
                setDocumentRedactionError(result.message || "No documents were redacted");
                setRedactedFiles([]);
            }
            
        } catch (error) {
            console.error("Document redaction error:", error);
            setDocumentRedactionError(error instanceof Error ? error.message : String(error));
            setRedactedFiles([]);
        } finally {
            setDocumentRedactionLoading(false);
        }
    };

    const handleDownloadRedactedPDF = async (filePath: string, fileName: string) => {
        try {
            console.log(`Downloading redacted PDF: ${fileName} from ${filePath}`);
            
            // Get the correct base URL for API calls
            const getDownloadUrl = () => {
                if (typeof window !== 'undefined') {
                    // Check if running in Databricks environment
                    if (window.location.hostname.includes('cloud.databricks.com')) {
                        // Use same origin for downloads in Databricks
                        return `${window.location.protocol}//${window.location.hostname}/api/download-redacted-pdf?file_path=${encodeURIComponent(filePath)}`;
                    }
                }
                // For local development
                return `/api/download-redacted-pdf?file_path=${encodeURIComponent(filePath)}`;
            };
            
            const downloadUrl = getDownloadUrl();
            console.log(`Download URL: ${downloadUrl}`);
            
            // Use fetch to get the file
            const response = await fetch(downloadUrl);
            
            if (!response.ok) {
                const errorText = await response.text().catch(() => 'Unknown error');
                throw new Error(`Download failed: ${response.status} ${response.statusText} - ${errorText}`);
            }
            
            // Get the blob from the response
            const blob = await response.blob();
            
            // Create a blob URL and download
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            
            // Clean up
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            
            console.log(`Download completed for ${fileName}`);
            
        } catch (error) {
            console.error("Redacted PDF download error:", error);
            alert(`Download failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const renderDeltaTableResults = () => {
        if (deltaTableLoading) {
            return (
                <div className="flex items-center justify-center p-8">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" />
                    <span>Writing to delta table and retrieving results...</span>
                </div>
            );
        }

        if (deltaTableError) {
            return (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                    <div className="flex items-center mb-2">
                        <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                        <span className="font-medium text-red-700">Delta Table Error</span>
                    </div>
                    <p className="text-red-700 text-sm">{deltaTableError}</p>
                </div>
            );
        }

        if (deltaTableResults.length === 0) {
            return (
                <div className="text-center py-8 text-gray-500">
                    <Database className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                    <p>No document processing results yet.</p>
                    <p className="text-sm">Upload documents and click "Write to Delta Table" to process content.</p>
                    <p className="text-xs mt-2 text-gray-400">
                        Results will show data inserted into: {deltaTablePathConfig.delta_table_path}
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">
                    Showing {deltaTableResults.length} processed documents from delta table: {deltaTablePathConfig.delta_table_path}
                </div>
                {deltaTableResults.map((result, index) => (
                    <div key={index} className="border rounded p-4 bg-gray-50">
                        <div className="font-medium text-sm mb-2 text-blue-600">
                            Document {index + 1}
                        </div>
                        <div className="text-xs text-gray-500 mb-3 space-y-1">
                            <div>File: {result.path?.split('/').pop() || 'Unknown file'}</div>
                            <div>Document Index: {index + 1}</div>
                        </div>
                        
                        {/* Document Content Display */}
                        <div className="mb-3">
                            <div className="font-medium text-xs text-green-600 mb-1">Document Content (ai_parse_document):</div>
                            <div className="bg-white p-3 rounded border text-sm max-h-64 overflow-y-auto">
                                <pre className="whitespace-pre-wrap font-mono text-xs">
                                    {result.content || 'No content available'}
                                </pre>
                            </div>
                        </div>
                        
                        {/* Metadata */}
                        <div className="text-xs text-gray-400 bg-gray-100 p-2 rounded">
                            <strong>Extraction Info:</strong> Processed document using ai_parse_document function - concatenated page content
                        </div>
                    </div>
                ))}
            </div>
        );
    };


    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };


    const activeFile = activeFileIndex !== null ? selectedFiles[activeFileIndex] : null;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Value Proposition Modal */}
            {showValueModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
                    <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-300">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-3xl font-bold text-blue-600 flex items-center">
                                    <FileText className="mr-3 h-8 w-8" />
                                    Databricks AI Functions: Transform Document Processing
                                </h2>
                                <button 
                                    onClick={() => setShowValueModal(false)}
                                    className="text-gray-500 hover:text-gray-700 text-2xl"
                                >
                                    ×
                                </button>
                            </div>
                            
                            <div className="space-y-6">
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border-l-4 border-blue-500">
                                    <h3 className="text-xl font-semibold mb-3 text-blue-700">🎯 The Challenge: Document Intelligence at Scale</h3>
                                    <p className="text-gray-700 leading-relaxed">
                                        Modern organizations process thousands of documents daily—PDFs, contracts, invoices, reports—requiring 
                                        complex AI workflows to extract, analyze, and understand content. Traditional approaches involve multiple 
                                        tools, APIs, and manual processing that don't scale with enterprise document volumes.
                                    </p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="bg-red-50 p-5 rounded-lg border border-red-200">
                                        <h4 className="font-semibold text-red-700 mb-3">❌ Traditional Approach</h4>
                                        <ul className="text-sm text-red-600 space-y-2">
                                            <li>• Multiple document processing APIs</li>
                                            <li>• Complex OCR and parsing pipelines</li>
                                            <li>• Security risks with external services</li>
                                            <li>• Manual file handling and storage</li>
                                            <li>• Inconsistent extraction quality</li>
                                            <li>• Limited scalability for enterprise volumes</li>
                                        </ul>
                                    </div>
                                    
                                    <div className="bg-green-50 p-5 rounded-lg border border-green-200">
                                        <h4 className="font-semibold text-green-700 mb-3">✅ Databricks AI Functions</h4>
                                        <ul className="text-sm text-green-600 space-y-2">
                                            <li>• Simple SQL: ai_parse_document(file_path)</li>
                                            <li>• Built-in Unity Catalog file storage</li>
                                            <li>• Data never leaves your secure environment</li>
                                            <li>• Native lakehouse integration</li>
                                            <li>• Consistent, reliable AI parsing</li>
                                            <li>• Seamless scaling to thousands of documents</li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-6 rounded-lg border-l-4 border-purple-500">
                                    <h3 className="text-xl font-semibold mb-4 text-purple-700">🚀 Demo Journey: Single Document → Enterprise Scale</h3>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div>
                                            <h4 className="font-semibold text-purple-600 mb-2">Interactive Prototype</h4>
                                            <p className="text-sm text-gray-700 mb-3">
                                                Upload any document type and see how ai_parse_document extracts structured content 
                                                with headers, footers, and intelligent parsing.
                                            </p>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-purple-600 mb-2">Production Pipeline</h4>
                                            <p className="text-sm text-gray-700 mb-3">
                                                Scale the same workflow to process <strong>entire document libraries</strong> 
                                                with automated batch processing using Lakeflow.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-gradient-to-r from-yellow-50 to-orange-50 p-6 rounded-lg border-l-4 border-yellow-500">
                                    <h3 className="text-xl font-semibold mb-3 text-yellow-700">💰 Scale Impact</h3>
                                    <div className="grid md:grid-cols-3 gap-4 text-center">
                                        <div>
                                            <div className="text-2xl font-bold text-yellow-600">1000x</div>
                                            <div className="text-sm text-gray-600">Scale from 1 to enterprise volumes</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-yellow-600">95%</div>
                                            <div className="text-sm text-gray-600">Less integration complexity</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-bold text-yellow-600">Zero</div>
                                            <div className="text-sm text-gray-600">External API dependencies</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-blue-600 text-white p-6 rounded-lg">
                                    <h3 className="text-xl font-semibold mb-3">🎬 Ready to Experience Document Intelligence?</h3>
                                    <p className="mb-4">
                                        This interactive demo showcases the complete document processing journey from individual file upload 
                                        to enterprise-scale document intelligence using Databricks AI Functions.
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <div className="text-sm opacity-90">
                                            Upload documents → Parse with AI → Extract structured data → Scale to production
                                        </div>
                                        <button 
                                            onClick={() => setShowValueModal(false)}
                                            className="bg-white text-blue-600 px-6 py-2 rounded font-semibold hover:bg-gray-100 transition-colors"
                                        >
                                            Start Demo →
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <header className="bg-white shadow-sm border-b border-gray-200">
                <div className="flex items-center justify-between px-8 py-4">
                    <div className="flex items-center space-x-6">
                        <Image
                            src="/pwc-logo.png"
                            alt="PwC Logo"
                            width={150}
                            height={75}
                            className="h-12 w-auto"
                            priority
                        />
                        <Link href="/" className="flex items-center text-blue-600 hover:text-blue-800 font-medium">
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            back to main menu
                        </Link>
                    </div>
                    <div className="flex items-center space-x-4">
                        <button 
                            onClick={() => setShowWarehouseConfig(!showWarehouseConfig)}
                            className="flex items-center text-gray-600 hover:text-gray-800 text-sm font-medium"
                            title="Configure Databricks Warehouse"
                        >
                            <Settings className="w-4 h-4 mr-1" />
                            Settings
                        </button>
                        <h1 className="text-xl font-semibold text-gray-800">Document Intelligence</h1>
                    </div>
                </div>
            </header>

            {/* Warehouse Configuration Section */}
            {showWarehouseConfig && (
                <div className="bg-gray-100 border-b border-gray-200 p-6">
                    <Card className="max-w-2xl mx-auto">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Database className="mr-2 h-5 w-5" />
                                Databricks Warehouse Configuration
                            </CardTitle>
                            <CardDescription>
                                Configure your Databricks SQL Warehouse ID for AI Functions used in document processing. Each user may have a different warehouse ID.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Current Warehouse ID
                                </label>
                                <div className="flex items-center space-x-2">
                                    <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded border flex-1 font-mono">
                                        {warehouseConfig.warehouse_id || 'Loading...'}
                                    </div>
                                    {warehouseConfig.warehouse_id !== warehouseConfig.default_warehouse_id && (
                                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Custom</span>
                                    )}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Update Warehouse ID
                                </label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={newWarehouseId}
                                        onChange={(e) => setNewWarehouseId(e.target.value)}
                                        placeholder="Enter your warehouse ID (e.g., 3708ab0cd3e20acd)"
                                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <Button 
                                        onClick={updateWarehouseConfig}
                                        disabled={warehouseLoading || !newWarehouseId.trim() || newWarehouseId === warehouseConfig.warehouse_id}
                                        size="sm"
                                        className="flex items-center"
                                    >
                                        {warehouseLoading ? (
                                            "Saving..."
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-1" />
                                                Save
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {warehouseSuccess && (
                                <div className="flex items-center text-green-600 text-sm">
                                    <AlertCircle className="w-4 h-4 mr-2" />
                                    Warehouse ID updated successfully! Document processing AI Functions will now use the new warehouse.
                                </div>
                            )}

                            <div className="border-t pt-4 mt-4">
                                <h4 className="text-sm font-medium text-gray-700 mb-2">Test AI Functions</h4>
                                <Button 
                                    onClick={testAiFunctions}
                                    disabled={aiTestLoading}
                                    size="sm"
                                    variant="outline"
                                    className="mb-3"
                                >
                                    {aiTestLoading ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Testing...
                                        </>
                                    ) : (
                                        "Test AI Functions"
                                    )}
                                </Button>
                                
                                {aiTestResult && (
                                    <div className={`p-2 rounded text-sm ${
                                        aiTestResult.success 
                                            ? 'bg-green-50 text-green-700 border border-green-200'
                                            : 'bg-red-50 text-red-700 border border-red-200'
                                    }`}>
                                        {aiTestResult.message}
                                    </div>
                                )}
                            </div>

                            <div className="bg-blue-50 border border-blue-200 rounded p-3">
                                <h4 className="text-sm font-medium text-blue-800 mb-1">How to find your Warehouse ID:</h4>
                                <ol className="text-xs text-blue-700 space-y-1 ml-4 list-decimal">
                                    <li>Go to your Databricks workspace</li>
                                    <li>Navigate to "SQL Warehouses" in the sidebar</li>
                                    <li>Click on your warehouse name</li>
                                    <li>Copy the ID from the URL or warehouse details</li>
                                </ol>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Volume Path Configuration */}
                    <Card className="max-w-2xl mx-auto mt-4">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Database className="mr-2 h-5 w-5" />
                                Databricks Volume Path Configuration
                            </CardTitle>
                            <CardDescription>
                                Configure your Databricks UC Volume path for document storage and processing.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Current Volume Path
                                </label>
                                <div className="flex items-center space-x-2">
                                    <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded border flex-1 font-mono">
                                        {volumePathConfig.volume_path || 'Loading...'}
                                    </div>
                                    {volumePathConfig.volume_path !== volumePathConfig.default_volume_path && (
                                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Custom</span>
                                    )}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Update Volume Path
                                </label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={newVolumePath}
                                        onChange={(e) => setNewVolumePath(e.target.value)}
                                        placeholder="Enter your volume path (e.g., /Volumes/catalog/schema/volume/)"
                                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <Button 
                                        onClick={updateVolumePathConfig}
                                        disabled={volumePathLoading || !newVolumePath.trim() || newVolumePath === volumePathConfig.volume_path}
                                        size="sm"
                                        className="flex items-center"
                                    >
                                        {volumePathLoading ? (
                                            "Saving..."
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-1" />
                                                Save
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {volumePathSuccess && (
                                <div className="flex items-center text-green-600 text-sm">
                                    <AlertCircle className="w-4 h-4 mr-2" />
                                    Volume path updated successfully! Document uploads will now use the new path.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Delta Table Path Configuration */}
                    <Card className="max-w-2xl mx-auto mt-4">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Database className="mr-2 h-5 w-5" />
                                Databricks Delta Table Path Configuration
                            </CardTitle>
                            <CardDescription>
                                Configure your Databricks Delta table path for storing parsed document results.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Current Delta Table Path
                                </label>
                                <div className="flex items-center space-x-2">
                                    <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded border flex-1 font-mono">
                                        {deltaTablePathConfig.delta_table_path || 'Loading...'}
                                    </div>
                                    {deltaTablePathConfig.delta_table_path !== deltaTablePathConfig.default_delta_table_path && (
                                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">Custom</span>
                                    )}
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Update Delta Table Path
                                </label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="text"
                                        value={newDeltaTablePath}
                                        onChange={(e) => setNewDeltaTablePath(e.target.value)}
                                        placeholder="Enter your delta table path (e.g., /catalog.schema.table_name)"
                                        className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    />
                                    <Button 
                                        onClick={updateDeltaTablePathConfig}
                                        disabled={deltaTablePathLoading || !newDeltaTablePath.trim() || newDeltaTablePath === deltaTablePathConfig.delta_table_path}
                                        size="sm"
                                        className="flex items-center"
                                    >
                                        {deltaTablePathLoading ? (
                                            "Saving..."
                                        ) : (
                                            <>
                                                <Save className="w-4 h-4 mr-1" />
                                                Save
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>

                            {deltaTablePathSuccess && (
                                <div className="flex items-center text-green-600 text-sm">
                                    <AlertCircle className="w-4 h-4 mr-2" />
                                    Delta table path updated successfully! Parsed results will now be stored in the new table.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            <main className="flex flex-col lg:flex-row gap-8 p-8 h-[calc(100vh-120px)]">
                {/* Left Panel: File Management - 1/4 width */}
                <div className="lg:w-1/4 flex flex-col gap-4 overflow-y-auto pr-2">
                    <h2 className="text-lg font-semibold text-center">Document Processing</h2>
                    
                    {/* File Upload Card */}
                    <Card className="h-fit">
                        <CardHeader className="pb-3">
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Select Documents
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsFileUploadCollapsed(!isFileUploadCollapsed)}
                                    className="h-6 w-6 p-0"
                                >
                                    {isFileUploadCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                            </CardTitle>
                            {!isFileUploadCollapsed && (
                                <CardDescription className="text-sm">
                                    Select files from your local system to preview and process with AI
                                </CardDescription>
                            )}
                        </CardHeader>
                        {!isFileUploadCollapsed && (
                            <CardContent className="pt-0">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    multiple
                                    onChange={handleFileChange}
                                    className="hidden"
                                    accept=".txt,.pdf,.doc,.docx,.csv,.json,.jpg,.jpeg,.png,.md,.xlsx,.xls,.pptx,.ppt"
                                />
                                <Button onClick={handleFileSelect} className="w-full text-sm">
                                    <Upload className="mr-2 h-4 w-4" />
                                    Select Files to Upload
                                </Button>
                            </CardContent>
                        )}
                    </Card>

                    {/* Selected Files Card */}
                    {selectedFiles.length > 0 && (
                        <Card className="h-fit">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <Database className="mr-2 h-4 w-4" />
                                        Selected Files ({selectedFiles.length})
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsSelectedFilesCollapsed(!isSelectedFilesCollapsed)}
                                        className="h-6 w-6 p-0"
                                    >
                                        {isSelectedFilesCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                </CardTitle>
                                {!isSelectedFilesCollapsed && (
                                    <CardDescription className="text-sm">
                                        Click to preview a file, then use Upload to upload to UC Volume
                                    </CardDescription>
                                )}
                            </CardHeader>
                            {!isSelectedFilesCollapsed && (
                                <CardContent className="space-y-2 pt-0">
                                {selectedFiles.map((file, index) => (
                                    <div 
                                        key={index} 
                                        className={`flex items-center justify-between p-3 border rounded cursor-pointer transition-colors ${
                                            activeFileIndex === index ? 'bg-blue-50 border-blue-200' : 'bg-white hover:bg-gray-50'
                                        }`}
                                    >
                                        <div 
                                            className="flex items-center flex-1 min-w-0"
                                            onClick={() => handleFilePreview(index)}
                                        >
                                            <FileText className="mr-2 h-4 w-4 flex-shrink-0" />
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium text-sm truncate">{file.name}</div>
                                                <div className="text-xs text-gray-500">
                                                    {formatFileSize(file.size)} • {file.type}
                                                    {file.isUploaded && <span className="text-green-600 ml-2">✓ Uploaded</span>}
                                                    {file.format && (
                                                        <div className="mt-1 flex items-center gap-1">
                                                            <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs font-medium">
                                                                {file.format}
                                                            </span>
                                                            {file.redactionSupported && (
                                                                <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-xs">
                                                                    Redaction Support
                                                                </span>
                                                            )}
                                                            {!file.handlerAvailable && (
                                                                <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-xs">
                                                                    Limited Support
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 ml-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleFilePreview(index)}
                                                disabled={file.isProcessing}
                                            >
                                                <Eye className="h-4 w-4" />
                                                Preview
                                            </Button>
                                            <Button
                                                size="sm"
                                                onClick={() => handleProcessFile(index)}
                                                disabled={file.isProcessing || file.isUploaded}
                                                className="min-w-[80px]"
                                            >
                                                {file.isProcessing ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : file.isUploaded ? (
                                                    "Uploaded"
                                                ) : (
                                                    <>
                                                        <Upload className="h-4 w-4 mr-1" />
                                                        Upload
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                                </CardContent>
                            )}
                        </Card>
                    )}



                    {/* Write to Delta Table Panel - Shows after upload like other panels */}
                    {selectedFiles.length > 0 && (
                        <Card className="h-fit bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <Database className="mr-2 h-5 w-5 text-blue-600" />
                                        Write to Delta Table
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsDeltaTableResultsCollapsed(!isDeltaTableResultsCollapsed)}
                                        className="h-6 w-6 p-0"
                                    >
                                        {isDeltaTableResultsCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                </CardTitle>
                                {!isDeltaTableResultsCollapsed && (
                                    <CardDescription className="text-sm">
                                        Parse uploaded documents with ai_parse_document to extract content and write to Delta Table for persistent storage and querying.
                                    </CardDescription>
                                )}
                            </CardHeader>
                            {!isDeltaTableResultsCollapsed && (
                                <CardContent className="space-y-3 pt-0">
                                    {selectedFiles.filter(f => f.isUploaded).length > 0 && (
                                        <div className="p-3 bg-white rounded border">
                                            <div className="text-sm font-medium text-gray-700 mb-2">
                                                Uploaded Files: {selectedFiles.filter(f => f.isUploaded).length} file(s)
                                            </div>
                                            <div className="text-xs text-gray-600 space-y-1">
                                                {selectedFiles.filter(f => f.isUploaded).slice(0, 3).map((file, i) => (
                                                    <div key={i} className="font-mono">{file.name}</div>
                                                ))}
                                                {selectedFiles.filter(f => f.isUploaded).length > 3 && (
                                                    <div className="text-gray-500">+ {selectedFiles.filter(f => f.isUploaded).length - 3} more files</div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    <Button
                                        onClick={handleWriteToDeltaTable}
                                        disabled={deltaTableLoading || selectedFiles.filter(f => f.isUploaded).length === 0}
                                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400"
                                        size="lg"
                                    >
                                        {deltaTableLoading ? (
                                            <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Writing to Delta Table...
                                            </>
                                        ) : (
                                            <>
                                                <Database className="h-4 w-4 mr-2" />
                                                Write to Delta Table
                                            </>
                                        )}
                                    </Button>

                                    {selectedFiles.filter(f => f.isUploaded).length === 0 && (
                                        <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded text-center">
                                            Upload documents first to write to Delta Table
                                        </div>
                                    )}

                                    {deltaTableError && (
                                        <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                            {deltaTableError}
                                        </div>
                                    )}
                                </CardContent>
                            )}
                        </Card>
                    )}

                    {/* Error Display */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded p-3 flex items-center">
                            <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
                            <span className="text-red-700 text-sm">{error}</span>
                        </div>
                    )}
                </div>

                {/* Right Panel: File Preview and Results - 3/4 width */}
                <div className="lg:w-3/4 flex flex-col gap-6 overflow-y-auto pl-2">
                    <h2 className="text-xl font-semibold text-center">Preview & Results</h2>
                    
                    {/* Delta Table Results Card - Shows first when available */}
                    {showDeltaTableResults && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <Database className="mr-2 h-5 w-5 text-blue-600" />
                                        Delta Table Results
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsDeltaTableResultsCollapsed(!isDeltaTableResultsCollapsed)}
                                        className="h-8 w-8 p-0"
                                    >
                                        {isDeltaTableResultsCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                    </Button>
                                </CardTitle>
                                {!isDeltaTableResultsCollapsed && (
                                    <CardDescription>
                                        Processed document results from ai_parse_document function stored in Delta table.
                                    </CardDescription>
                                )}
                            </CardHeader>
                            {!isDeltaTableResultsCollapsed && (
                                <CardContent>
                                    {renderDeltaTableResults()}
                                </CardContent>
                            )}
                        </Card>
                    )}

                    {/* Export Document Panel - Shows when Delta table results exist */}
                    {deltaTableResults.length > 0 && showDeltaTableResults && (
                        <Card className="h-fit bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <Download className="mr-2 h-5 w-5 text-purple-600" />
                                        Export Documents
                                    </div>
                                </CardTitle>
                                <CardDescription className="text-sm">
                                    Export processed document content to various formats (Markdown, Excel, PowerPoint).
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-0">
                                {/* Export Format Selection */}
                                <div className="p-3 bg-white rounded border">
                                    <div className="text-sm font-medium text-gray-700 mb-2">Export Format</div>
                                    <div className="flex gap-2">
                                        {supportedFormats?.export_formats.map((format) => (
                                            <button
                                                key={format}
                                                onClick={() => setSelectedExportFormat(format)}
                                                className={`px-3 py-2 rounded text-xs font-medium transition-colors ${
                                                    selectedExportFormat === format
                                                        ? 'bg-purple-600 text-white'
                                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                            >
                                                .{format.toLowerCase()}
                                            </button>
                                        ))}
                                    </div>
                                    {supportedFormats && (
                                        <div className="text-xs text-gray-500 mt-2">
                                            Format support: {Object.entries(supportedFormats.format_handlers_available)
                                                .filter(([_, available]) => available)
                                                .map(([format, _]) => format)
                                                .join(', ')}
                                        </div>
                                    )}
                                </div>

                                <Button
                                    onClick={handleExportDocument}
                                    disabled={exportLoading || deltaTableResults.length === 0}
                                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400"
                                    size="lg"
                                >
                                    {exportLoading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Exporting to {selectedExportFormat.toUpperCase()}...
                                        </>
                                    ) : (
                                        <>
                                            <Download className="h-4 w-4 mr-2" />
                                            Export to {selectedExportFormat.toUpperCase()}
                                        </>
                                    )}
                                </Button>

                                {exportError && (
                                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                        {exportError}
                                    </div>
                                )}

                                {exportSuccess && exportInfo && (
                                    <div className="space-y-2">
                                        <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                                            ✓ Successfully exported {exportInfo.files_processed} document(s) to {exportInfo.export_format.toUpperCase()} format
                                        </div>
                                        <div className="bg-white p-2 rounded border">
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm text-gray-800">
                                                        {exportInfo.download_filename}
                                                    </div>
                                                    <div className="text-xs text-gray-600">
                                                        Format: {exportInfo.export_format.toUpperCase()} • Files processed: {exportInfo.files_processed}
                                                    </div>
                                                </div>
                                                <Button
                                                    onClick={() => handleDownloadExported(exportInfo.download_filename)}
                                                    size="sm"
                                                    className="ml-2 bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 h-6 text-xs"
                                                >
                                                    <Download className="h-3 w-3 mr-1" />
                                                    Download
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Redact Documents Panel - Shows when Delta table results exist and supported files uploaded */}
                    {deltaTableResults.length > 0 && showDeltaTableResults && selectedFiles.some(f => f.isUploaded && f.redactionSupported) && (
                        <Card className="h-fit bg-gradient-to-r from-red-50 to-pink-50 border-red-200">
                            <CardHeader className="pb-3">
                                <CardTitle className="flex items-center justify-between">
                                    <div className="flex items-center">
                                        <FileText className="mr-2 h-5 w-5 text-red-600" />
                                        Redact Documents
                                    </div>
                                </CardTitle>
                                <CardDescription className="text-sm">
                                    Use AI-powered Named Entity Recognition to identify and redact sensitive information across multiple document formats.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 pt-0">
                                {selectedFiles.filter(f => f.isUploaded && f.redactionSupported).length > 0 && (
                                    <div className="p-3 bg-white rounded border">
                                        <div className="text-sm font-medium text-gray-700 mb-2">
                                            Ready to Redact: {selectedFiles.filter(f => f.isUploaded && f.redactionSupported).length} file(s)
                                        </div>
                                        <div className="text-xs text-gray-600 space-y-1">
                                            {selectedFiles.filter(f => f.isUploaded && f.redactionSupported).slice(0, 3).map((file, i) => (
                                                <div key={i} className="flex items-center gap-2">
                                                    <span className="font-mono">redacted_{file.name}</span>
                                                    <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">
                                                        {file.format || 'unknown'}
                                                    </span>
                                                </div>
                                            ))}
                                            {selectedFiles.filter(f => f.isUploaded && f.redactionSupported).length > 3 && (
                                                <div className="text-gray-500">+ {selectedFiles.filter(f => f.isUploaded && f.redactionSupported).length - 3} more files</div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                <Button
                                    onClick={handleRedactDocuments}
                                    disabled={documentRedactionLoading || deltaTableResults.length === 0 || selectedFiles.filter(f => f.isUploaded && f.redactionSupported).length === 0}
                                    className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400"
                                    size="lg"
                                >
                                    {documentRedactionLoading ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Redacting Documents...
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="h-4 w-4 mr-2" />
                                            Redact Documents
                                        </>
                                    )}
                                </Button>

                                {documentRedactionError && (
                                    <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                                        {documentRedactionError}
                                    </div>
                                )}

                                {documentRedactionSuccess && redactedFiles.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="text-xs text-green-600 bg-green-50 p-2 rounded">
                                            ✓ Successfully processed {redactedFiles.length} document(s) for redaction
                                        </div>
                                        <div className="space-y-1">
                                            {redactedFiles.map((file, index) => (
                                                <div key={index} className="text-xs bg-white p-2 rounded border">
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <div className="font-medium text-gray-800">{file.redacted_file.split('/').pop()}</div>
                                                                <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-xs">
                                                                    {file.format}
                                                                </span>
                                                            </div>
                                                            <div className="text-gray-600">
                                                                {file.entities_count} entities redacted • {file.status}
                                                            </div>
                                                            {file.entities && Object.keys(file.entities).length > 0 && (
                                                                <div className="text-xs text-gray-500 mt-1">
                                                                    Redacted: {Object.keys(file.entities).slice(0, 3).join(', ')}
                                                                    {Object.keys(file.entities).length > 3 && ` +${Object.keys(file.entities).length - 3} more`}
                                                                </div>
                                                            )}
                                                        </div>
                                                        {file.status === 'redacted' && (
                                                            <Button
                                                                onClick={() => handleDownloadRedactedPDF(file.redacted_file, file.redacted_file.split('/').pop() || 'redacted_file')}
                                                                size="sm"
                                                                className="ml-2 bg-red-600 hover:bg-red-700 text-white px-2 py-1 h-6 text-xs"
                                                            >
                                                                <Download className="h-3 w-3 mr-1" />
                                                                Download
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* File Preview Card */}
                    <Card className="flex-1">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <Eye className="mr-2 h-5 w-5" />
                                    Document Preview
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setIsDocumentPreviewCollapsed(!isDocumentPreviewCollapsed)}
                                    className="h-8 w-8 p-0"
                                >
                                    {isDocumentPreviewCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </Button>
                            </CardTitle>
                            {!isDocumentPreviewCollapsed && (
                                <CardDescription>
                                    {activeFile ? `Previewing: ${activeFile.name}` : "Select a file to preview its content"}
                                </CardDescription>
                            )}
                        </CardHeader>
                        {!isDocumentPreviewCollapsed && (
                            <CardContent>
                                {activeFile?.preview ? (
                                    <div className="w-full h-[600px]">
                                        {activeFile.preview === "PDF_PREVIEW" && activeFile.previewUrl ? (
                                            <iframe
                                                src={activeFile.previewUrl}
                                                className="w-full h-full border rounded"
                                                title={`Preview of ${activeFile.name}`}
                                            />
                                        ) : activeFile.preview === "IMAGE_PREVIEW" && activeFile.previewUrl ? (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-50 border rounded">
                                                <img
                                                    src={activeFile.previewUrl}
                                                    alt={`Preview of ${activeFile.name}`}
                                                    className="max-w-full max-h-full object-contain"
                                                />
                                            </div>
                                        ) : activeFile.preview.startsWith('MARKDOWN:') ? (
                                            <div className="bg-gray-50 p-4 rounded border h-full overflow-y-auto">
                                                <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                                                    <FileText className="h-4 w-4 text-blue-600" />
                                                    <span className="font-medium text-blue-600">Markdown File</span>
                                                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs">
                                                        {activeFile.format || 'markdown'}
                                                    </span>
                                                </div>
                                                <pre className="text-sm whitespace-pre-wrap font-mono">{activeFile.preview.replace('MARKDOWN:\n', '')}</pre>
                                            </div>
                                        ) : activeFile.preview.startsWith('EXCEL_PREVIEW:') ? (
                                            <div className="bg-green-50 p-4 rounded border h-full overflow-y-auto">
                                                <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                                                    <Database className="h-4 w-4 text-green-600" />
                                                    <span className="font-medium text-green-600">Excel Spreadsheet</span>
                                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs">
                                                        {activeFile.format || 'excel'}
                                                    </span>
                                                </div>
                                                <pre className="text-sm whitespace-pre-wrap">{activeFile.preview.replace('EXCEL_PREVIEW:\n', '')}</pre>
                                            </div>
                                        ) : activeFile.preview.startsWith('POWERPOINT_PREVIEW:') ? (
                                            <div className="bg-purple-50 p-4 rounded border h-full overflow-y-auto">
                                                <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                                                    <FileText className="h-4 w-4 text-purple-600" />
                                                    <span className="font-medium text-purple-600">PowerPoint Presentation</span>
                                                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs">
                                                        {activeFile.format || 'powerpoint'}
                                                    </span>
                                                </div>
                                                <pre className="text-sm whitespace-pre-wrap">{activeFile.preview.replace('POWERPOINT_PREVIEW:\n', '')}</pre>
                                            </div>
                                        ) : (
                                            <div className="bg-gray-50 p-4 rounded border h-full overflow-y-auto">
                                                <pre className="text-sm whitespace-pre-wrap font-mono">{activeFile.preview}</pre>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex items-center justify-center h-[600px] text-gray-500">
                                        <div className="text-center">
                                            <FileText className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                                            <p>Select a file to preview its content</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        )}
                    </Card>


                </div>
            </main>
        </div>
    );
} 