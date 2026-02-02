import { FileText, CheckCircle, AlertCircle, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Progress } from './ui/progress';
import { useData, UploadedFile } from '../contexts/DataContext';

// ========= PREVIEW TABLE COMPONENT =========
function PreviewTable({ data }: { data: any }) {
  if (!data || !data.rows || data.rows.length === 0) return null;

  const headers = data.columns.slice(0, 5);
  const rows = data.rows.slice(0, 5);

  return (
    <div className="rounded-lg border overflow-auto mt-4 max-w-full">
      <Table>
        <TableHeader>
          <TableRow>
            {headers.map((header: string) => (
              <TableHead key={header}>{header}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row: any, idx: number) => (
            <TableRow key={idx}>
              {headers.map((header: string, cellIdx: number) => (
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
export function DataUpload({ isUploading }: { isUploading: boolean }) {
  const { files, removeFile } = useData();

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

  if (files.length === 0) {
    return null; // Don't render anything if there are no files
  }

  return (
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
                    {uploadedFile.file?.name || uploadedFile.fileName || 'Unknown file'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {uploadedFile.file?.size
                      ? `${(uploadedFile.file.size / (1024 * 1024)).toFixed(2)} MB`
                      : 'Size unknown'}
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

            {uploadedFile.status === 'completed' && uploadedFile.data && (
              <div>
                <div className="flex items-center space-x-2 mt-4 text-green-600">
                  <CheckCircle className="w-5 h-5" />
                  <p>Upload complete. Preview of the first 5 rows and 5 columns:</p>
                </div>
                <PreviewTable data={uploadedFile.data} />
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

