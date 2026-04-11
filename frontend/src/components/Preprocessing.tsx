import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Trash2, Droplets, Code, ArrowRight, Loader2, CheckCircle, Brain, BarChart3, Download } from 'lucide-react';
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
  const [featureProcessingId, setFeatureProcessingId] = useState<string | null>(null);
  const [appliedFeatures, setAppliedFeatures] = useState<Set<string>>(new Set());
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

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

  /**
   * Resolve which dataset ID to use for API calls.
   * Root fix: `projectData.fileId` can be stale (e.g. old session) while `listDatasets` / upload
   * context hold the real uploaded id. Naive `a ?? b ?? c` lets stale `projectData.fileId` win.
   * Prefer current upload + backend-resolved id; keep `projectData.fileId` when it is the
   * active processed dataset (not in upload list, and not an older id than the latest upload).
   */
  const effectiveFileId = useMemo(() => {
    const completed = files.filter(
      (f) => (f.status === 'completed' || f.status === 'success') && f.fileId != null && f.fileId !== ''
    );
    const uploadIdSet = new Set(
      completed.map((f) => String(f.fileId)).filter((id) => id !== '')
    );
    const latest =
      completed.length > 0
        ? completed.reduce((a, b) => (Number(a.fileId) > Number(b.fileId) ? a : b))
        : null;
    const fromUploadFlow = latest?.fileId ?? resolvedDatasetId;
    const projectId = projectData.fileId != null && projectData.fileId !== ''
      ? String(projectData.fileId)
      : null;

    if (!projectId && !fromUploadFlow) return null;
    if (!projectId) return String(fromUploadFlow);
    if (!fromUploadFlow) {
      return projectId;
    }

    if (uploadIdSet.has(projectId)) {
      return String(fromUploadFlow ?? projectId);
    }

    const nProj = Number(projectId);
    const nFrom = Number(fromUploadFlow);
    const bothNumeric = !Number.isNaN(nProj) && !Number.isNaN(nFrom);
    if (bothNumeric && nProj < nFrom) {
      return String(fromUploadFlow);
    }
    return projectId;
  }, [files, resolvedDatasetId, projectData.fileId]);

  const activeFile = effectiveFileId
    ? files.find(
      (f) => (f.status === 'completed' || f.status === 'success') && String(f.fileId) === String(effectiveFileId)
    ) ?? latestFromContext
    : latestFromContext ?? null;

  const datasetDisplayName =
    activeFile?.file?.name || activeFile?.name || projectData.fileName || 'dataset';

  // 2. Fetch uploaded dataset from backend — confirms retrieval and provides preview data.
  useEffect(() => {
    const fetchUploadedDataset = async () => {
      if (isLoading) return;
      if (!effectiveFileId) return;
      setPreviewLoading(true);
      setPreviewError(null);
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
        } else {
          setPreviewError(res.error || 'Could not load dataset preview.');
        }
      } catch (err) {
        if (process.env.NODE_ENV === 'development') {
          console.error('[Preprocessing] Dataset fetch error:', err);
        }
        setPreviewError('Could not load dataset preview.');
      } finally {
        setPreviewLoading(false);
      }
    };
    fetchUploadedDataset();
  }, [effectiveFileId, isLoading]);

  // 3. Fetch suggestions only after we have a valid dataset ID.
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (isLoading) return;
      if (!effectiveFileId) {
        setIsLoading(false);
        return;
      }
      setSuggestionsLoading(true);
      setSuggestionsError(null);
      try {
        let [prepResponse, feResponse] = await Promise.all([
          apiService.getPreprocessingSuggestions(String(effectiveFileId)),
          apiService.getFeatureEngineeringSuggestions(String(effectiveFileId)),
        ]);
        // Fallback: try combined profile endpoint when individual endpoints fail or return empty arrays.
        if (!prepResponse.success || !feResponse.success || !prepResponse.data?.length || !feResponse.data?.length) {
          const fullRes = await apiService.getDatasetProfileFull(String(effectiveFileId));
          if (fullRes.success && fullRes.data) {
            const d = fullRes.data as any;
            if ((!prepResponse.success || !prepResponse.data?.length) && Array.isArray(d.suggested_cleaning)) {
              prepResponse = { success: true, data: d.suggested_cleaning };
            }
            if ((!feResponse.success || !feResponse.data?.length) && Array.isArray(d.feature_engineering)) {
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
        setSuggestionsError('Failed to load AI suggestions.');
        toast.error('Failed to load AI suggestions.');
      } finally {
        setSuggestionsLoading(false);
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [effectiveFileId, isLoading]);

  const getIcon = (type: string) => ({
    remove_duplicates: Trash2, fill_missing: Droplets, encode_categorical: Code,
    normalize: Sparkles, remove_outliers: Trash2
  }[type] || Sparkles);

  const buildFeatureEngineeringStep = (featureOpt: any) => {
    const cols = Array.isArray(featureOpt.columns) ? featureOpt.columns : [];
    const primaryColumn = featureOpt.column || cols[0];
    const featureName = featureOpt?.name || featureOpt?.params?.name;
    const existingParams = featureOpt?.params || {};

    // Keep existing backend-native step payloads untouched.
    if (
      featureOpt.type === 'create_interaction' ||
      featureOpt.type === 'polynomial_features' ||
      featureOpt.type === 'binning' ||
      featureOpt.type === 'datetime_features' ||
      featureOpt.type === 'log_transform' ||
      featureOpt.type === 'target_encoding' ||
      featureOpt.type === 'text_features' ||
      featureOpt.type === 'group_aggregate' ||
      featureOpt.type === 'calculate_age' ||
      featureOpt.type === 'create_ratio' ||
      featureOpt.type === 'create_addition'
    ) {
      return {
        type: featureOpt.type,
        column: featureOpt.column,
        params: {
          ...existingParams,
          ...(featureName ? { name: featureName } : {}),
        },
      };
    }

    // Compatibility adapter for mock/fallback suggestion schema.
    if (featureOpt.type === 'interaction') {
      return {
        type: 'create_interaction',
        column: `${cols[0] || ''}, ${cols[1] || ''}`,
        params: {
          col1: cols[0],
          col2: cols[1],
          operation: 'multiply',
          ...(featureName ? { name: featureName } : {}),
        },
      };
    }

    if (featureOpt.type === 'polynomial') {
      return {
        type: 'polynomial_features',
        column: primaryColumn,
        params: {
          column: primaryColumn,
          degree: 2,
          ...(featureName ? { name: featureName } : {}),
        },
      };
    }

    if (featureOpt.type === 'binning') {
      return {
        type: 'binning',
        column: primaryColumn,
        params: {
          bins: 5,
          strategy: 'quantile',
          ...(featureName ? { name: featureName } : {}),
        },
      };
    }

    // Safe fallback: preserve server-side behavior as much as possible.
    return {
      type: featureOpt.type,
      column: primaryColumn,
      params: {
        ...existingParams,
        ...(featureName ? { name: featureName } : {}),
      },
    };
  };

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
    setIsComplete(false);
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
          columns: uploadedDataset?.columns || [],
        });
        setResolvedDatasetId(String(processedFileId));
        try {
          const feRes = await apiService.getFeatureEngineeringSuggestions(String(processedFileId));
          if (feRes.success && Array.isArray(feRes.data)) {
            const feOpts = (feRes.data as any[]).map((s: any, idx: number) => ({
              id: `fe_${s.type || 'fe'}_${idx}`,
              ...s,
            }));
            setFeatureOptions(feOpts);
            setAppliedFeatures(new Set());
          }
        } catch (_) {
          // Keep preprocessing flow unchanged if FE refresh fails.
        }
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

  const handleApplyFeature = async (featureOpt: any) => {
    const idToUse = effectiveFileId;
    if (!idToUse) return;

    setFeatureProcessingId(featureOpt.id);
    try {
      const step = buildFeatureEngineeringStep(featureOpt);
      const response = await apiService.applyFeatureEngineering(String(idToUse), [step]);
      
      if (response.success && response.data) {
        const data = response.data as any;
        const processedFileId = data.processedFileId ?? data.dataset_id ?? data.id ?? idToUse;
        
        setResolvedDatasetId(String(processedFileId));
        updateProjectData({
          fileId: String(processedFileId),
          columns: data.preview?.columns || uploadedDataset?.columns || [],
        });
        
        if (data.preview) {
          setUploadedDataset({
            columns: data.preview.columns || [],
            rows: data.preview.rows || [],
            rowCount: data.rowCount
          });
        } else {
          try {
            const previewRes = await apiService.getDataPreview(String(processedFileId), 10);
            if (previewRes.success && previewRes.data) {
              const pd = previewRes.data as any;
              const rows = pd.rows ?? pd.data?.rows ?? [];
              setUploadedDataset({
                  columns: pd.columns ?? (rows.length > 0 ? Object.keys(rows[0]) : []),
                  rows: rows,
                  rowCount: pd.rowCount
              });
            }
          } catch (e) {
            console.error("Failed to fetch fresh preview");
          }
        }
        
        setAppliedFeatures(prev => new Set(prev).add(featureOpt.id));
        try {
          const feRes = await apiService.getFeatureEngineeringSuggestions(String(processedFileId));
          if (feRes.success && Array.isArray(feRes.data)) {
            const feOpts = (feRes.data as any[]).map((s: any, idx: number) => ({
              id: `fe_${s.type || 'fe'}_${idx}`,
              ...s,
            }));
            setFeatureOptions(feOpts);
          }
        } catch (_) {
          // Keep apply flow unchanged if FE refresh fails.
        }
        toast.success(`Applied feature: ${featureOpt.name || featureOpt.column || featureOpt.type}`);
      } else {
        toast.error(response.error || 'Failed to apply feature.');
      }
    } catch (error: any) {
      toast.error(error.message || 'An error occurred while applying feature.');
    } finally {
      setFeatureProcessingId(null);
    }
  };

  const handleDownload = async () => {
    const downloadId = effectiveFileId ?? resolvedDatasetId;
    if (!downloadId) return;
    try {
      const response = await apiService.downloadPreprocessedDataset(String(downloadId));
      if (response.success && response.data) {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', 'preprocessed_dataset.csv');
        document.body.appendChild(link);
        link.click();
        if (link.parentNode) link.parentNode.removeChild(link);
        window.URL.revokeObjectURL(url);
        toast.success("Dataset downloaded successfully");
      } else {
        toast.error(response.error || "Failed to download dataset");
      }
    } catch (error: any) {
      toast.error(error?.message || "An error occurred during download");
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
        {effectiveFileId && (
          <p className="text-sm text-gray-500 mt-2">
            Active dataset: <span className="font-medium text-gray-700">{datasetDisplayName}</span>
            {' · '}
            <span className="text-gray-500">ID {effectiveFileId}</span>
            {previewLoading && (
              <span className="inline-flex items-center gap-1 ml-2 text-blue-600">
                <Loader2 className="w-3 h-3 animate-spin" aria-hidden />
                Loading preview…
              </span>
            )}
            {!previewLoading && uploadedDataset?.rowCount != null && (
              <span className="ml-2 text-gray-500">· {uploadedDataset.rowCount} rows</span>
            )}
          </p>
        )}
      </div>

      {previewError && (
        <Alert variant="destructive" className="mb-2">
          <AlertDescription>{previewError}</AlertDescription>
        </Alert>
      )}

      <PreviewTable
        data={
          (uploadedDataset?.rows?.length ? uploadedDataset.rows : null) ??
          (Array.isArray(activeFile?.preview) ? activeFile.preview : (activeFile?.preview as any)?.rows ?? [])
        }
        title={`Preview of ${datasetDisplayName}`}
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
          {suggestionsLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-600 py-2">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Loading preprocessing suggestions…
            </div>
          )}
          {suggestionsError && !suggestionsLoading && (
            <Alert variant="destructive">
              <AlertDescription>{suggestionsError}</AlertDescription>
            </Alert>
          )}
          {!suggestionsLoading && preprocessingOptions.length === 0 && !suggestionsError && (
            <p className="text-sm text-gray-600 py-2">
              No AI cleaning steps were returned for this dataset. You can still run <strong>Apply Preprocessing</strong> for the full automated pipeline (missing values, duplicates, normalization, encoding).
            </p>
          )}
          {preprocessingOptions.map((option) => {
            const Icon = option.icon;
            const isSelected = selectedSteps.has(option.id);
            return (
              <div key={option.id} onClick={() => !isProcessing && toggleStep(option.id)}
                className={`flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" aria-hidden />
            Feature Engineering Suggestions
            <Badge variant="outline" className="font-normal text-purple-700 border-purple-200 bg-purple-50">AI-suggested</Badge>
          </CardTitle>
          <CardDescription>
            AI-recommended new engineered features that could improve the dataset. Apply these before or after cleaning steps as needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suggestionsLoading && (
            <div className="flex items-center gap-2 text-sm text-gray-600 py-4">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Loading feature engineering suggestions…
            </div>
          )}
          {!suggestionsLoading && featureOptions.length === 0 && (
            <p className="text-sm text-gray-600 py-4">
              No feature engineering suggestions are available yet for this dataset. Try again after the preview loads, or proceed with preprocessing and refresh.
            </p>
          )}
          {!suggestionsLoading && featureOptions.length > 0 && (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead>Feature Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Formula / Logic</TableHead>
                    <TableHead className="w-[100px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {featureOptions.map((opt) => {
                    const isApplied = appliedFeatures.has(opt.id);
                    const isApplying = featureProcessingId === opt.id;
                    
                    let formula = opt.logic || "Derived AI feature";
                    if (!opt.logic) {
                      if (opt.type === 'create_interaction') {
                         formula = `${opt.params?.col1 || opt.column || ''} ${opt.params?.operation === 'multiply' ? '*' : '+'} ${opt.params?.col2 || opt.column || ''}`;
                      } else if (opt.type === 'interaction') {
                         formula = `${opt.columns?.[0] || ''} * ${opt.columns?.[1] || ''}`;
                      } else if (opt.type === 'create_ratio') {
                         formula = `${opt.params?.col_num || opt.column} / ${opt.params?.col_denom || opt.column}`;
                      } else if (opt.type === 'create_addition') {
                         formula = `${opt.params?.col1 || opt.column} + ${opt.params?.col2 || opt.column}`;
                      } else if (opt.type === 'polynomial_features') {
                         formula = `${opt.column}² and ${opt.column}³`;
                      } else if (opt.type === 'polynomial') {
                         formula = `${opt.columns?.[0] || opt.column || ''}²`;
                      } else if (opt.type === 'log_transform') {
                         formula = `log(1 + ${opt.column})`;
                      } else if (opt.type === 'calculate_age') {
                         formula = `Current Year - Year(${opt.column})`;
                      } else if (opt.type === 'datetime_features') {
                         formula = `Extract time components from ${opt.column}`;
                      } else if (opt.type === 'target_encoding') {
                         formula = `Mean Target Value by ${opt.column}`;
                      } else if (opt.type === 'text_features') {
                         formula = `Length, Word Count of ${opt.column}`;
                      } else if (opt.type === 'group_aggregate') {
                         formula = `${opt.params?.agg_func || 'Mean'}(${opt.params?.agg_col || ''}) / ${opt.params?.group_col || ''}`;
                      } else if (opt.type === 'binning') {
                         formula = `Quantile binning(${opt.column})`;
                      }
                    }

                    return (
                      <TableRow key={opt.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {opt.name || opt.column || opt.type}
                            {(opt.recommended === true || opt.suggested === true) && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700 text-[10px] h-5 py-0 px-1">AI Suggested</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-gray-600 text-sm">
                           {opt.description}
                        </TableCell>
                        <TableCell className="text-sm">
                           <code className="text-xs bg-slate-50 border border-slate-200 text-slate-700 rounded px-1.5 py-0.5">{formula}</code>
                        </TableCell>
                        <TableCell>
                          <Button 
                             size="sm" 
                             variant={isApplied ? "outline" : "default"} 
                             className={isApplied ? "text-green-600 border-green-200 bg-green-50 font-medium cursor-default hover:bg-green-50 hover:text-green-600" : ""}
                             onClick={() => !isApplied && handleApplyFeature(opt)}
                             disabled={isApplied || isApplying}
                          >
                             {isApplying ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                             {isApplied ? "Applied" : "Apply"}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-between gap-2 pt-2">
        <Button variant="outline" onClick={() => onNavigate('upload')}>Back to Upload</Button>
        <Button onClick={handleProcess} disabled={isProcessing}>
          {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : 'Apply Preprocessing'}
        </Button>
        {isComplete && (
          <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
            <Button variant="secondary" onClick={handleDownload} className="flex items-center bg-blue-100 hover:bg-blue-200 text-blue-700">
              <Download className="w-4 h-4 mr-2" /> Download Preprocessed Dataset
            </Button>
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
