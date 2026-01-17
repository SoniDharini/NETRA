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
  // Get shared data from context
  const { files } = useData();
  const activeFile = files.find(f => f.status === 'success' && f.fileId);

  const [selectedSteps, setSelectedSteps] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [preprocessingOptions, setPreprocessingOptions] = useState<any[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<FeatureEngineeringSuggestion[]>([]);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!activeFile?.fileId) {
        setIsLoading(false);
        return;
      }
      try {
        const prepResponse = await apiService.getPreprocessingSuggestions(activeFile.fileId);
        if (prepResponse.success && prepResponse.data) {
          const options = prepResponse.data.map((suggestion: PreprocessingSuggestion) => ({
            id: suggestion.type,
            label: suggestion.description.split(':')[0],
            description: suggestion.description.split(': ')[1] || suggestion.description,
            icon: getIcon(suggestion.type),
            suggested: suggestion.recommended,
            column: suggestion.column,
          }));
          setPreprocessingOptions(options);
        }
        // ... fetch other suggestions if needed
      } catch (error) {
        toast.error('Failed to load AI suggestions.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSuggestions();
  }, [activeFile]);

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
    if (selectedSteps.size === 0 || !activeFile?.fileId) return;

    setIsProcessing(true);
    setProcessingProgress(0);
    const progressInterval = setInterval(() => setProcessingProgress(p => Math.min(p + 10, 90)), 300);

    try {
      const steps = Array.from(selectedSteps).map(id => {
        const option = preprocessingOptions.find(opt => opt.id === id);
        return { type: id, ...option } as PreprocessingSuggestion;
      });

      const response = await apiService.applyPreprocessing(activeFile.fileId, steps);
      clearInterval(progressInterval);
      setProcessingProgress(100);

      if (response.success && response.data) {
        const { processedFileId, summary } = response.data;
        updateProjectData({
          preprocessingSteps: Array.from(selectedSteps).map(id => preprocessingOptions.find(opt => opt.id === id)?.label || id),
          // preprocessedData should be the new preview from the backend
          fileId: processedFileId,
        });
        setIsComplete(true);
        toast.success(summary || 'Preprocessing complete!');
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

  if (!activeFile) {
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
      
      <PreviewTable data={activeFile.preview?.rows ?? []} title={`Preview of ${activeFile.file.name}`} />

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

      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => onNavigate('upload')}>Back to Upload</Button>
        <Button onClick={handleProcess} disabled={isProcessing || selectedSteps.size === 0 || isComplete}>
          {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</> : 'Apply Preprocessing'}
        </Button>
        {isComplete && (
          <Button onClick={() => { markStepComplete('preprocessing'); onNavigate('training'); }}>
            Continue to Model Training <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
