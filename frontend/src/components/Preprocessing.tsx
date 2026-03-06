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
  const activeFile = files.find(f => (f.status === 'completed' || f.status === 'success') && f.fileId);
  const fileId = projectData.fileId || activeFile?.fileId;

  const [selectedSteps, setSelectedSteps] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preprocessingOptions, setPreprocessingOptions] = useState<any[]>([]);
  const [featureOptions, setFeatureOptions] = useState<any[]>([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!fileId) {
        setIsLoading(false);
        return;
      }
      try {
        const [prepResponse, feResponse] = await Promise.all([
          apiService.getPreprocessingSuggestions(String(fileId)),
          apiService.getFeatureEngineeringSuggestions(String(fileId)),
        ]);
        if (prepResponse.success && prepResponse.data) {
          const options = (prepResponse.data as any[]).map((suggestion: any, idx: number) => {
            const uniqueId = `${suggestion.type}_${suggestion.column || idx}`;
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
  }, [fileId]);

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
    if (!fileId) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    const progressInterval = setInterval(() => setProcessingProgress(p => Math.min(p + 10, 90)), 300);

    try {
      let response;
      if (selectedSteps.size > 0) {
        const steps = Array.from(selectedSteps).map(id => {
          const option = preprocessingOptions.find(opt => opt.id === id);
          return {
            type: option?.rawType || option?.id?.split('_')[0] || id,
            column: option?.column,
            params: option?.params || {},
          } as PreprocessingSuggestion;
        });
        response = await apiService.applyPreprocessing(String(fileId), steps);
      } else {
        response = await apiService.preprocessDataset(String(fileId));
      }
      clearInterval(progressInterval);
      setProcessingProgress(100);

      if (response.success && response.data) {
        const data = response.data as any;
        const processedFileId = data.processedFileId ?? data.dataset_id ?? data.id ?? fileId;
        const summary = data.summary?.summary ?? data.summary ?? (typeof data.summary === 'string' ? data.summary : 'Preprocessing complete!');
        updateProjectData({
          preprocessingSteps: selectedSteps.size > 0
            ? Array.from(selectedSteps).map(id => preprocessingOptions.find(opt => opt.id === id)?.label || id)
            : ['Full pipeline (missing values, duplicates, normalize, encode)'],
          fileId: String(processedFileId),
        });
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

  if (!fileId) {
    return (
      <div className="max-w-6xl mx-auto">
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
      <div className="mb-4">
        <h1 className="text-gray-900 mb-1">Data Preprocessing</h1>
        <p className="text-gray-600">Clean and prepare your data for analysis.</p>
      </div>
      
      <PreviewTable
        data={Array.isArray(activeFile?.preview) ? activeFile.preview : (activeFile?.preview as any)?.rows ?? []}
        title={`Preview of ${activeFile?.name || activeFile?.file?.name || 'dataset'}`}
      />

      <Card>
        <CardHeader>
          <CardTitle>Data Cleaning Steps</CardTitle>
          <CardDescription>Select operations to apply.</CardDescription>
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
                  <div className="flex items-center space-x-2 mb-1">
                    <Icon className="w-4 h-4 text-gray-600" />
                    <span>{option.label}</span>
                    {option.suggested && <Badge variant="secondary" className="bg-green-100 text-green-700">AI Suggested</Badge>}
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
            <CardTitle>Feature Engineering Suggestions</CardTitle>
            <CardDescription>AI-recommended feature engineering steps (applied with full pipeline).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-gray-600">
              {featureOptions.slice(0, 8).map((opt) => (
                <div key={opt.id} className="flex items-start gap-2 p-2 rounded border bg-gray-50">
                  <Brain className="w-4 h-4 mt-0.5 flex-shrink-0 text-purple-500" />
                  <div>
                    <p className="font-medium text-gray-800">{opt.name || opt.type}</p>
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
