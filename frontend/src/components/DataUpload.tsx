import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, CheckCircle, AlertCircle, X, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { ProjectData } from '../App';
import { useData, UploadedFile, PreviewData } from '../contexts/DataContext';
import { apiService } from '../services/api.service';

// ========= PROPS =========
interface DataUploadProps {
  onNavigate: (section: any) => void;
  updateProjectData: (data: Partial<ProjectData>) => void;
  markStepComplete: (step: string) => void;
}

// ========= CONSTANTS =========
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024 * 1024; // 1GB
const SUPPORTED_FORMATS = { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/json': ['.json'] };
const generateId = () => `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// ========= PREVIEW TABLE COMPONENT =========
function PreviewTable({ data }: { data: any }) {
  const headers = Object.keys(data[Object.keys(data)[0]]);
  const rows = Object.keys(data).map(key => data[key]);

  return (
    <div className="rounded-lg border overflow-auto mt-4">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => (
            <TableRow key={idx}>
              {headers.map((header, cellIdx) => (
                <TableCell key={cellIdx}>{String(row[header])}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ========= MAIN COMPONENT =========
export function DataUpload({ onNavigate, markStepComplete, updateProjectData }: DataUploadProps) {
  const { files, addFiles, updateFile, removeFile, setFiles } = useData();
  const [isUploading, setIsUploading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Sync with backend on mount
  useEffect(() => {
    const syncDatasets = async () => {
      setIsSyncing(true);
      try {
        const res = await apiService.listDatasets();
        if (res.success && res.data) {
          // Format backend datasets into UploadedFile format
          const backendFiles: UploadedFile[] = res.data.map((ds: any) => ({
            id: ds.id,
            fileId: ds.id,
            name: ds.name,
            size: ds.file_size || 0,
            status: 'completed',
            progress: 100,
            preview: ds.metadata?.preview,
          }));

          // Only add backend files that aren't already locally in state
          setFiles(prev => {
            const existingIds = prev.map(f => f.fileId).filter(Boolean);
            const newOnes = backendFiles.filter(bf => !existingIds.includes(bf.fileId));
            return [...prev, ...newOnes];
          });
        }
      } catch (err) {
        console.error("Failed to sync datasets", err);
      } finally {
        setIsSyncing(false);
      }
    };

    syncDatasets();
  }, [setFiles]);

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    const newUploads: UploadedFile[] = [];
    acceptedFiles.forEach(file => {
      newUploads.push({ id: generateId(), file, status: 'waiting', progress: 0 });
    });
    fileRejections.forEach(rejection => {
      const errorMsg = rejection.errors.map((e: any) => e.message).join(', ');
      newUploads.push({ id: generateId(), file: rejection.file, status: 'error', progress: 0, error: errorMsg });
    });
    addFiles(newUploads);
  }, [addFiles]);

  const handleUpload = async () => {
    setIsUploading(true);
    for (const uploadedFile of files) {
      if (uploadedFile.status === 'waiting') {
        try {
          updateFile(uploadedFile.id, { status: 'uploading', progress: 0 });
          if (!uploadedFile.file) {
            throw new Error("No local file source available for upload.");
          }
          const res = await apiService.uploadDataset(uploadedFile.file, (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            updateFile(uploadedFile.id, { progress });
          });

          if (res.success && res.data) {
            updateFile(uploadedFile.id, {
              status: 'completed',
              progress: 100,
              fileId: res.data.id,
              preview: res.data.metadata?.preview,
            });
            toast.success(`Upload complete for ${uploadedFile.file.name}!`);
          } else {
            throw new Error(res.error || 'Failed to upload file.');
          }
        } catch (err: any) {
          updateFile(uploadedFile.id, { status: 'error', error: err.message });
          toast.error(`Upload failed for ${uploadedFile.file.name}: ${err.message}`);
        }
      }
    }
    setIsUploading(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: MAX_FILE_SIZE_BYTES,
    accept: SUPPORTED_FORMATS,
  });

  const handleContinue = async () => {
    const completedFile = files.find(f => f.status === 'completed' && f.fileId);
    if (!completedFile) {
      toast.error('Please wait for a file to complete uploading.');
      return;
    }

    let extractedColumns: string[] = [];
    if (completedFile.preview) {
      try {
        const data = completedFile.preview;
        if (Array.isArray(data) && data.length > 0) {
          extractedColumns = Object.keys(data[0]);
        } else if (typeof data === 'object' && Object.keys(data).length > 0) {
          const firstKey = Object.keys(data)[0];
          extractedColumns = Object.keys(data[firstKey]);
        }
      } catch (e) {
        console.error('Failed to extract columns', e);
      }
    }

    updateProjectData({
      fileName: completedFile.file?.name || completedFile.name || 'dataset.csv',
      fileId: completedFile.fileId,
      columns: extractedColumns,
    });
    markStepComplete('upload');
    onNavigate('preprocessing');
  };

  const getStatusMessage = (file: UploadedFile): string => {
    switch (file.status) {
      case 'uploading':
        return `Uploading... (${file.progress.toFixed(0)}%)`;
      case 'completed':
        return 'File ready for preprocessing.';
      case 'error':
        return 'An error occurred.';
      default:
        return 'Waiting to upload...';
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Upload</h1>
        <p className="text-lg text-gray-600">Upload your datasets to begin the analysis process.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Datasets</CardTitle>
          <CardDescription>Supported formats: CSV, XLSX, JSON. Max size: 1GB.</CardDescription>
        </CardHeader>
        <CardContent>
          <div {...getRootProps()} className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors cursor-pointer ${isDragActive ? 'border-primary bg-primary/10' : 'border-gray-300 hover:border-gray-400'}`}>
            <input {...getInputProps()} />
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-900 font-semibold mb-2">Drag & drop files here, or click to select</p>
          </div>
        </CardContent>
      </Card>

      {files.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Uploads</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {files.map((uploadedFile) => (
              <div key={uploadedFile.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-6 h-6 text-gray-500" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {uploadedFile.file?.name || uploadedFile.name || 'Unknown File'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {((uploadedFile.file?.size || uploadedFile.size || 0) / (1024 * 1024)).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => removeFile(uploadedFile.id)} disabled={isUploading}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {(uploadedFile.status === 'uploading' || uploadedFile.status === 'completed') && (
                  <Progress value={uploadedFile.progress} className="mt-2" />
                )}

                <p className="text-sm text-gray-500 mt-2">{getStatusMessage(uploadedFile)}</p>

                {uploadedFile.status === 'error' && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{uploadedFile.error}</AlertDescription>
                  </Alert>
                )}

                {uploadedFile.status === 'completed' && uploadedFile.preview && (
                  <div>
                    <div className="flex items-center space-x-2 mt-4 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <p>Upload complete. Preview of the first 5 rows and 5 columns:</p>
                    </div>
                    <PreviewTable data={uploadedFile.preview} />
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {files.length > 0 && (
        <div className="flex justify-end mt-6">
          <Button onClick={handleUpload} disabled={isUploading || files.every(f => f.status !== 'waiting')}>
            {isUploading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Uploading...</>
            ) : (
              'Upload'
            )}
          </Button>
        </div>
      )}

      {files.some(f => f.status === 'completed') && (
        <div className="flex justify-end mt-6">
          <Button onClick={handleContinue}>
            <><ArrowRight className="w-4 h-4 mr-2" /> Continue to Preprocessing</>
          </Button>
        </div>
      )}
    </div>
  );
}
