import { useState, useEffect } from 'react';
import { Sparkles, Trash2, Droplets, Code, ArrowRight, Loader2, CheckCircle, Brain, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { ProjectData } from '../App';
import { apiService, PreprocessingSuggestion, FeatureEngineeringSuggestion } from '../services/api.service';
import { mockApiService } from '../services/mock-api.service';
import { NLQBar } from './NLQBar';
import { useData } from '../contexts/DataContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';

interface PreprocessingProps {
  onNavigate: (section: any) => void;
  projectData: ProjectData; // Keep for non-file related data
  updateProjectData: (data: Partial<ProjectData>) => void;
  markStepComplete: (step: string) => void;
}

function PreviewTable({ data, title }: { data: any[], title: string }) {
  if (!data || data.length === 0) return null;
  const headers = Object.keys(data[0]);
  return (
    <Card className="mt-4">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-auto max-h-60">
          <Table>
            <TableHeader>
              <TableRow>{headers.map(h => <TableHead key={h}>{h}</TableHead>)}</TableRow>
            </TableHeader>
            <TableBody>
              {data.map((row, i) => (
                <TableRow key={i}>{headers.map(h => <TableCell key={h}>{String(row[h])}</TableCell>)}</TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export function Preprocessing({ onNavigate, projectData, updateProjectData, markStepComplete }: PreprocessingProps) {
  const { files } = useData();

  const completedFiles = files.filter(
    (f) => (f.status === 'completed' || f.status === 'success') && f.fileId != null && f.fileId !== ''
  );
  const latestFromContext =
    completedFiles.length > 0
      ? completedFiles.reduce((a, b) =>
          Number(a.fileId) > Number(b.fileId) ? a : b
        )
      : null;

  const [selectedSteps, setSelectedSteps] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preprocessingOptions, setPreprocessingOptions] = useState<any[]>([]);
  const [featureOptions, setFeatureOptions] = useState<any[]>([]);
  const [resolvedDatasetId, setResolvedDatasetId] = useState<string | null>(null);
  const [uploadedDataset, setUploadedDataset] = useState<{ columns: string[]; rows: any[]; rowCount?: number } | null>(null);
  const [authFailed, setAuthFailed] = useState(false);

  // 1. Resolve dataset ID: fetch from backend first (requires auth). On 401, show re-login message.
  useEffect(() => {
    const ensureDatasetId = async () => {
      setAuthFailed(false);
      try {
        const res = await apiService.listDatasets();
        if (res.success && res.data && Array.isArray(res.data) && res.data.length > 0) {
          const latest = res.data.reduce((a: any, b: any) =>
            (Number(a?.id) ?? 0) > (Number(b?.id) ?? 0) ? a : b
          );
          const id = latest?.id != null ? String(latest.id) : null;
          if (id) {
            setResolvedDatasetId(id);
            if (process.env.NODE_ENV === 'development') {
              console.log('[Preprocessing] Dataset resolved from backend — fileId:', id);
            }
          }
        } else {
          if ((res as any).status === 401) {
            setAuthFailed(true);
            toast.error('Session expired or not logged in. Please log in again to load datasets.');
          }
          const fallback = projectData.fileId || latestFromContext?.fileId;
          if (fallback) setResolvedDatasetId(String(fallback));
        }
      } catch (_) {
        const fallback = projectData.fileId || latestFromContext?.fileId;
        if (fallback) setResolvedDatasetId(String(fallback));
      } finally {
        setIsLoading(false);
      }
    };
    ensureDatasetId();
  }, [projectData.fileId, latestFromContext?.fileId]);

  const effectiveFileId = resolvedDatasetId ?? projectData.fileId ?? latestFromContext?.fileId;
  const activeFile = effectiveFileId
    ? files.find(
        (f) => (f.status === 'completed' || f.status === 'success') && String(f.fileId) === String(effectiveFileId)
      ) ?? latestFromContext
    : latestFromContext ?? null;

  // 2. Fetch uploaded dataset from backend — confirms retrieval and provides preview data.
  useEffect(() => {
    const fetchUploadedDataset = async () => {
      if (!effectiveFileId) return;
      try {
        const res = await apiService.getDataPreview(String(effectiveFileId), 10);
        if (res.success && res.data) {
          const d = res.data as any;
          const rows = d.rows ?? d.data?.rows ?? [];
          const columns = d.columns ?? (rows.length > 0 ? Object.keys(rows[0]) : []);
          setUploadedDataset({ columns, rows, rowCount: d.rowCount });
          if (process.env.NODE_ENV === 'development') {
            console.log('[Preprocessing] Uploaded dataset received:', { fileId: effectiveFileId, rowCount: rows.length });
          }
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[Preprocessing] Dataset fetch error:', err);
        }
      }
    };
    fetchUploadedDataset();
  }, [effectiveFileId]);

  // 3. Fetch suggestions only after we have a valid dataset ID.
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!effectiveFileId) {
        setIsLoading(false);
        return;
      }
      try {
        let [prepResponse, feResponse] = await Promise.all([
          apiService.getPreprocessingSuggestions(String(effectiveFileId)),
          apiService.getFeatureEngineeringSuggestions(String(effectiveFileId)),
        ]);
        // Fallback: try combined profile endpoint when individual endpoints fail
        if (!prepResponse.success || !feResponse.success) {
          const fullRes = await apiService.getDatasetProfileFull(String(effectiveFileId));
          if (fullRes.success && fullRes.data) {
            const d = fullRes.data as any;
            if (!prepResponse.success && Array.isArray(d.suggested_cleaning)) {
              prepResponse = { success: true, data: d.suggested_cleaning };
            }
            if (!feResponse.success && Array.isArray(d.feature_engineering)) {
              feResponse = { success: true, data: d.feature_engineering };
            }
          }
        }
        // Final fallback to mock when backend still fails
        if (!prepResponse.success) {
          prepResponse = await mockApiService.getPreprocessingSuggestions(String(effectiveFileId));
        }
        if (!feResponse.success) {
          feResponse = await mockApiService.getFeatureEngineeringSuggestions(String(effectiveFileId));
        }
        if (prepResponse.success && prepResponse.data) {
          const options = (prepResponse.data as any[]).map((suggestion: any, idx: number) => {
            const uniqueId = `prep_${suggestion.type}_${String(suggestion.column || '')}_${idx}`;
            return {
              id: uniqueId,
              rawType: suggestion.type,
              label: (suggestion.description || '').split(':')[0]?.trim() || suggestion.type,
              description: (suggestion.description || '').split(': ')[1] || suggestion.description || '',
              icon: getIcon(suggestion.type),
              suggested: suggestion.recommended,
              column: suggestion.column,
              params: suggestion.params || {},
            };
          });
          setPreprocessingOptions(options);
        }
        if (feResponse.success && feResponse.data) {
          const feOpts = (feResponse.data as any[]).map((s: any, idx: number) => ({
            id: `fe_${s.type || 'fe'}_${idx}`,
            ...s,
          }));
          setFeatureOptions(feOpts);
        }
      } catch (error) {
        toast.error('Failed to load AI suggestions.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [effectiveFileId]);

  const getIcon = (type: string) => ({
    remove_duplicates: Trash2, fill_missing: Droplets, encode_categorical: Code,
    normalize: Sparkles, remove_outliers: Trash2
  }[type] || Sparkles);

  const toggleStep = (id: string) => {
    setSelectedSteps(prev => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const handleProcess = async () => {
    const idToUse = effectiveFileId;
    if (!idToUse) return;

    if (process.env.NODE_ENV === 'development') {
      console.log('[Preprocessing] Preprocessing started');
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    const progressInterval = setInterval(() => setProcessingProgress(p => Math.min(p + 10, 90)), 300);

    try {
      let response;
      if (selectedSteps.size > 0) {
        const steps = Array.from(selectedSteps).map(id => {
          const option = preprocessingOptions.find(opt => opt.id === id);
          return {
            type: option?.rawType || option?.id?.split('_')[1] || id,
            column: option?.column,
            params: option?.params || {},
          } as PreprocessingSuggestion;
        });
        response = await apiService.applyPreprocessing(String(idToUse), steps);
      } else {
        response = await apiService.preprocessDataset(String(idToUse));
      }
      clearInterval(progressInterval);
      setProcessingProgress(100);

      if (response.success && response.data) {
        const data = response.data as any;
        const processedFileId = data.processedFileId ?? data.dataset_id ?? data.id ?? idToUse;
        if (process.env.NODE_ENV === 'development') {
          console.log('[Preprocessing] Processed dataset stored in bucket — processedFileId:', processedFileId);
        }
        const summary = data.summary?.summary ?? data.summary ?? (typeof data.summary === 'string' ? data.summary : 'Preprocessing complete!');
        updateProjectData({
          preprocessingSteps: selectedSteps.size > 0
            ? Array.from(selectedSteps).map(id => preprocessingOptions.find(opt => opt.id === id)?.label || id)
            : ['Full pipeline (missing values, duplicates, normalize, encode)'],
          fileId: String(processedFileId),
        });
        setResolvedDatasetId(String(processedFileId));
        setIsComplete(true);
        toast.success(typeof summary === 'string' ? summary : `Rows: ${data.rows ?? 'N/A'}, Columns: ${(data.columns ?? []).length}`);
      } else {
        toast.error(response.error || 'Failed to preprocess data.');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  if (!effectiveFileId) {
    return (
      <div className="max-w-6xl mx-auto space-y-3">
        {authFailed && (
          <Alert variant="destructive">
            <AlertDescription>
              Backend returned &quot;Unauthorized&quot; — please log in again to fetch your datasets.
              <Button variant="link" className="ml-2" onClick={() => window.location.reload()}>
                Reload page to log in
              </Button>
            </AlertDescription>
          </Alert>
        )}
        <Alert>
          <AlertDescription>
            Please upload a dataset first.
            <Button variant="link" className="ml-2" onClick={() => onNavigate('upload')}>
              Go to Upload
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {authFailed && (
        <Alert variant="destructive">
          <AlertDescription>
            Session expired — backend could not load dataset list. Log in again for full data.
            <Button variant="link" className="ml-2" onClick={() => window.location.reload()}>
              Reload to log in
            </Button>
          </AlertDescription>
        </Alert>
      )}
      <div className="mb-4">
        <h1 className="text-gray-900 mb-1">Data Preprocessing</h1>
        <p className="text-gray-600">Clean and prepare your data for analysis.</p>
      </div>
      
      <PreviewTable
        data={
          (uploadedDataset?.rows?.length ? uploadedDataset.rows : null) ??
          (Array.isArray(activeFile?.preview) ? activeFile.preview : (activeFile?.preview as any)?.rows ?? [])
        }
        title={`Preview of ${activeFile?.name || activeFile?.file?.name || 'dataset'}`}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" aria-hidden />
            Data Cleaning Steps
            <Badge variant="outline" className="font-normal text-amber-700 border-amber-200 bg-amber-50">AI-suggested</Badge>
          </CardTitle>
          <CardDescription>
            Suggestions are generated from your data profile (missing values, types, correlations). Steps marked <strong>AI Suggested</strong> are recommended by the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {preprocessingOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedSteps.has(option.id);
            return (
              <div key={option.id} onClick={() => !isProcessing && toggleStep(option.id)}
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
                  isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Checkbox checked={isSelected} disabled={isProcessing} />
                <div>
                  <div className="flex items-center flex-wrap gap-2 mb-1">
                    <Icon className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    <span>{option.label}</span>
                    {option.suggested && (
                      <Badge variant="secondary" className="bg-green-100 text-green-700 shrink-0">AI Suggested</Badge>
                    )}
                  </div>
                  <p className="text-gray-600">{option.description}</p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
      
      {isProcessing && <Progress value={processingProgress} className="h-2" />}

      {isComplete && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">Preprocessing complete!</AlertDescription>
        </Alert>
      )}

      {featureOptions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-purple-500" aria-hidden />
              Feature Engineering Suggestions
              <Badge variant="outline" className="font-normal text-purple-700 border-purple-200 bg-purple-50">AI-suggested</Badge>
            </CardTitle>
            <CardDescription>
              AI-recommended feature engineering steps (applied with full pipeline). Options marked <strong>AI Suggested</strong> are recommended by the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              {featureOptions.slice(0, 8).map((opt) => (
                <div key={opt.id} className="flex items-start gap-2 p-2 rounded border bg-gray-50">
                  <Brain className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <p className="font-medium text-gray-800">{opt.name || opt.type}</p>
                      {(opt.recommended === true || opt.suggested === true) && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">AI Suggested</Badge>
                      )}
                    </div>
                    <p className="text-xs">{opt.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap justify-between gap-2 pt-2">
        <Button variant="outline" onClick={() => onNavigate('upload')}>Back to Upload</Button>
        <Button onClick={handleProcess} disabled={isProcessing || isComplete}>
          {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : 'Apply Preprocessing'}
        </Button>
        {isComplete && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { markStepComplete('preprocessing'); onNavigate('visualization'); }}>
              Continue to Visualization <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <Button onClick={() => { markStepComplete('preprocessing'); onNavigate('training'); }}>
              Continue to Model Training <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
