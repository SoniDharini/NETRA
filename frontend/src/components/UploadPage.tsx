import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { DataUpload } from './DataUpload';
import { useData, UploadedFile } from '../contexts/DataContext';
import { useUpload } from '../hooks/useUpload';
import { ProjectData } from '../App';

// ========= PROPS =========
interface UploadPageProps {
  onNavigate: (section: any) => void;
  updateProjectData: (data: Partial<ProjectData>) => void;
  markStepComplete: (step: string) => void;
}

// ========= CONSTANTS =========
const MAX_FILE_SIZE_BYTES = 1 * 1024 * 1024 * 1024; // 1GB
const SUPPORTED_FORMATS = { 'text/csv': ['.csv'], 'application/vnd.ms-excel': ['.xls'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'], 'application/json': ['.json'] };
const generateId = () => `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// ========= MAIN COMPONENT =========
export function UploadPage({ onNavigate, markStepComplete, updateProjectData }: UploadPageProps) {
  const { files, addFiles } = useData();
  const [isUploading, setIsUploading] = useState(false);
  const { parseAndUploadFile } = useUpload();

  const onDrop = useCallback((acceptedFiles: File[], fileRejections: any[]) => {
    const newUploads: UploadedFile[] = [];
    acceptedFiles.forEach(file => {
      newUploads.push({
        id: generateId(),
        file,
        fileName: file.name,
        status: 'waiting',
        progress: 0
      });
    });
    fileRejections.forEach(rejection => {
      const errorMsg = rejection.errors.map((e: any) => e.message).join(', ');
      newUploads.push({
        id: generateId(),
        file: rejection.file,
        fileName: rejection.file?.name || 'unknown',
        status: 'error',
        progress: 0,
        error: errorMsg
      });
    });
    addFiles(newUploads);
  }, [addFiles]);

  const handleUpload = async () => {
    setIsUploading(true);
    await Promise.all(
      files
        .filter(f => f.status === 'waiting')
        .map(file => parseAndUploadFile(file))
    );
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

    updateProjectData({
      fileName: completedFile.file?.name || completedFile.fileName || 'dataset.csv',
      fileId: completedFile.fileId,
    });
    markStepComplete('upload');
    onNavigate('preprocessing');
  };

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

      <DataUpload isUploading={isUploading} />

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
