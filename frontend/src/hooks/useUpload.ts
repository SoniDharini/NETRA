import { useData, UploadedFile } from '../contexts/DataContext';
import { apiService } from '../services/api.service';
import Papa from 'papaparse';
import { toast } from 'sonner';

export const useUpload = () => {
  const { updateFile } = useData();

  const parseAndUploadFile = async (uploadedFile: UploadedFile) => {
    updateFile(uploadedFile.id, { status: 'parsing' });

    const file = uploadedFile.file;
    const isCsv = file.type === 'text/csv' || file.name.endsWith('.csv');

    const uploadJson = async (data: { columns: string[], rows: any[] }) => {
      try {
        updateFile(uploadedFile.id, { data, status: 'uploading', progress: 0 });
        
        const res = await apiService.uploadJsonData(uploadedFile.file.name, data.rows, (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? 1));
          updateFile(uploadedFile.id, { progress });
        });

        if (res.success && res.data) {
          updateFile(uploadedFile.id, {
            status: 'completed',
            progress: 100,
            fileId: res.data.fileId,
            data: { columns: res.data.preview.columns, rows: res.data.preview.rows },
          });
          toast.success(`Upload complete for ${uploadedFile.file.name}!`);
        } else {
          throw new Error(res.error || 'Failed to upload file.');
        }
      } catch (err: any) {
        updateFile(uploadedFile.id, { status: 'error', error: err.message });
        toast.error(`Upload failed for ${uploadedFile.file.name}: ${err.message}`);
      }
    };

    const uploadFile = async () => {
        try {
          updateFile(uploadedFile.id, { status: 'uploading', progress: 0 });
          
          const res = await apiService.uploadDataset(uploadedFile.file, (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total ?? uploadedFile.file.size));
            updateFile(uploadedFile.id, { progress });
          });
  
          if (res.success && res.data) {
            updateFile(uploadedFile.id, {
              status: 'completed',
              progress: 100,
              fileId: res.data.fileId,
              data: { columns: res.data.preview.columns, rows: res.data.preview.rows },
            });
            toast.success(`Upload complete for ${uploadedFile.file.name}!`);
          } else {
            throw new Error(res.error || 'Failed to upload file.');
          }
        } catch (err: any) {
          updateFile(uploadedFile.id, { status: 'error', error: err.message });
          toast.error(`Upload failed for ${uploadedFile.file.name}: ${err.message}`);
        }
      };

    if (isCsv) {
      // Parse CSV files client-side
      Papa.parse(file, {
        worker: true,
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const data = {
            columns: results.meta.fields || [],
            rows: results.data as any[],
          };
          uploadJson(data);
        },
        error: (err: any) => {
          updateFile(uploadedFile.id, { status: 'error', error: `CSV parsing failed: ${err.message}` });
          toast.error(`Could not parse ${file.name}.`);
        },
      });
    } else {
      // For other file types (like XLSX), we upload them directly.
      toast.info(`Parsing for ${file.type} is not yet supported in-browser. Uploading directly.`);
      uploadFile();
    }
  };

  return { parseAndUploadFile };
};
