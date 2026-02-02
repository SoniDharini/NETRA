import { useState, useEffect, useMemo } from 'react';
import { Sparkles, Trash2, Droplets, Code, ArrowRight, Loader2, CheckCircle, Brain, BarChart3, Download, LineChart, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Progress } from './ui/progress';
import { toast } from 'sonner';
import { apiService, PreprocessingSuggestion, FeatureEngineeringSuggestion, DatasetProfile } from '../services/api.service';
import { useData, UploadedFile } from '../contexts/DataContext';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';


interface PreprocessingProps {
  onNavigate: (section: 'upload' | 'preprocessing' | 'visualization' | 'training') => void;
  projectData: any;
  updateProjectData: (data: Partial<any>) => void;
  markStepComplete: (step: string) => void;
}

const ICONS: { [key: string]: React.ElementType } = {
  remove_duplicates: Trash2,
  fill_missing: Droplets,
  encode_categorical: Code,
  normalize: Sparkles,
  remove_outliers: Trash2,
  create_interaction: Brain,
  polynomial_features: Brain,
  date_part: Brain,
  default: Sparkles,
};

const getIcon = (type: string) => ICONS[type] || ICONS.default;

interface Suggestion extends PreprocessingSuggestion, FeatureEngineeringSuggestion {
  id: string;
}


export function PreprocessingPage({ onNavigate, projectData, updateProjectData, markStepComplete }: PreprocessingProps) {
  const context = useData();
  const { files, updateFile, activeFileId, setActiveFileId, addFiles } = context;

  useEffect(() => {
    console.log("[PreprocessingPage] Context loaded:", { filesCount: files.length, activeFileId, hasAddFiles: !!addFiles });
  }, [files.length, activeFileId, addFiles]);

  const activeFile = useMemo(() => files.find(f => f.id === activeFileId), [files, activeFileId]);

  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<DatasetProfile | null>(null);
  const [cleaningSuggestions, setCleaningSuggestions] = useState<Suggestion[]>([]);
  const [featureSuggestions, setFeatureSuggestions] = useState<Suggestion[]>([]);

  const [selectedSteps, setSelectedSteps] = useState<Set<string>>(new Set());

  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  const [isComplete, setIsComplete] = useState(false);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    const savedFileId = sessionStorage.getItem('activeFileId');
    if (savedFileId) {
      setActiveFileId(savedFileId);
    }
  }, [setActiveFileId]);

  useEffect(() => {
    if (activeFileId) {
      sessionStorage.setItem('activeFileId', activeFileId);
    }
  }, [activeFileId]);


  useEffect(() => {
    const rehydrateState = async () => {
      // If we have no active file in context, but we have a fileId in project data
      if (!files.find(f => f.id === activeFileId) && projectData?.fileId) {
        setIsLoading(true);
        try {
          // Fetch preview data to reconstruct state
          const res = await apiService.getDataPreview(projectData.fileId);

          if (res.success && res.data) {
            // Create a synthetic file object since we can't persist the original File
            const dummyFile = new File([], projectData.fileName || 'restored_dataset.csv', { type: 'text/csv' });

            const restoredFile: UploadedFile = {
              id: 'restored_' + projectData.fileId,
              file: dummyFile,
              status: 'completed',
              progress: 100,
              fileId: projectData.fileId,
              data: {
                columns: res.data.columns,
                rows: res.data.rows
              }
            };

            // Update context
            addFiles([restoredFile]);
            setActiveFileId(restoredFile.id);
          } else {
            toast.error("Failed to restore dataset session. Please upload again.");
          }
        } catch (e) {
          console.error("Failed to rehydrate:", e);
        } finally {
          setIsLoading(false);
        }
      }
    };

    rehydrateState();
  }, [files, activeFileId, projectData, addFiles, setActiveFileId]);


  useEffect(() => {
    const ensurePreviewData = async () => {
      if (activeFile && !activeFile.data && activeFile.fileId) {
        try {
          const res = await apiService.getDataPreview(activeFile.fileId);
          if (res.success && res.data) {
            updateFile(activeFile.id, { data: { columns: res.data.columns, rows: res.data.rows } });
          }
        } catch (error) {
          toast.error("Failed to load preview data.");
        }
      }
    };

    ensurePreviewData();
  }, [activeFile]);

  useEffect(() => {
    const fetchProfileAndSuggestions = async () => {
      if (!activeFile?.fileId) {
        if (!projectData?.fileId) {
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      try {
        const res = await apiService.getProfileAndSuggestions(activeFile.fileId);

        if (res.success && res.data) {
          setProfile(res.data.profile);

          const allSuggestions = res.data.suggestions.map((s, i) => ({ ...s, id: `sugg_${s.type}_${i}` }));

          setCleaningSuggestions(allSuggestions.filter(s => s.group === 'cleaning'));
          setFeatureSuggestions(allSuggestions.filter(s => s.group === 'creation'));

          if (selectedSteps.size === 0) {
            const recommended = new Set(allSuggestions.filter(o => o.recommended).map(o => o.id));
            setSelectedSteps(prev => new Set([...prev, ...recommended]));
          }
        }

      } catch (error) {
        toast.error('Failed to load AI suggestions.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfileAndSuggestions();
  }, [activeFile]);

  const allSuggestions = useMemo(() => [...cleaningSuggestions, ...featureSuggestions], [cleaningSuggestions, featureSuggestions]);

  const toggleStep = (id: string) => {
    setSelectedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleProcess = async () => {
    if (selectedSteps.size === 0 || !activeFile?.fileId) return;

    console.log(`[Preprocessing] Starting full-dataset processing for fileId: ${activeFile.fileId}`);

    setIsProcessing(true);
    setProcessingProgress(0);
    const progressInterval = setInterval(() => setProcessingProgress(p => Math.min(p + 5, 90)), 200);

    try {
      const stepsToApply = allSuggestions.filter(s => selectedSteps.has(s.id));

      const response = await apiService.applyPreprocessing(activeFile.fileId, stepsToApply as PreprocessingSuggestion[]);
      clearInterval(progressInterval);

      if (response.success && response.data) {
        setProcessingProgress(100);
        const { processedFileId, summary, preview } = response.data;

        updateFile(activeFile.id, { fileId: processedFileId, data: preview });
        updateProjectData({
          preprocessingSteps: stepsToApply.map(s => s.description),
          processedFileId: processedFileId,
        });

        setResults({ summary, preview, stepsApplied: stepsToApply });
        setIsComplete(true);
        markStepComplete('preprocessing');
        toast.success(summary || 'Preprocessing complete!');
      } else {
        throw new Error(response.error || 'Failed to preprocess data.');
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      setProcessingProgress(0);
      toast.error(error.message || 'An error occurred during processing.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = async () => {
    if (!projectData.processedFileId) return;

    const toastId = toast.loading("Preparing download...");
    try {
      const blob = await apiService.downloadFile(projectData.processedFileId);
      if (blob) {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `preprocessed_${activeFile?.file.name || 'data'}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        toast.success("Download started!", { id: toastId });
      } else {
        throw new Error("No file content received.");
      }
    } catch (error: any) {
      toast.error(error.message || "Download failed.", { id: toastId });
    }
  };


  if (isLoading) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin" /> Fetching AI Recommendations...</div>;
  }

  if (!activeFile) {
    return (
      <div className="max-w-4xl mx-auto text-center py-10">
        <Alert variant="destructive">
          <AlertTitle>No Dataset Found</AlertTitle>
          <AlertDescription>
            Please upload a dataset before proceeding to preprocessing.
            <Button variant="link" className="ml-2" onClick={() => onNavigate('upload')}>
              Go to Upload
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Data Preprocessing</h1>
        <p className="mt-1 text-md text-gray-600">Clean, transform, and engineer features for your dataset: <span className="font-semibold text-gray-800">{activeFile.file?.name || activeFile.fileName || 'Dataset'}</span></p>
      </header>

      <PreviewTable title="Raw Data Preview (First 5 Rows)" data={activeFile.data} />

      {profile && <ProfileDisplay profile={profile} />}

      {!isComplete ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="cleaning">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="cleaning">
                  <Droplets className="w-4 h-4 mr-2" />Data Cleaning
                </TabsTrigger>
                <TabsTrigger value="feature-engineering">
                  <Brain className="w-4 h-4 mr-2" />Feature Engineering
                </TabsTrigger>
              </TabsList>
              <TabsContent value="cleaning">
                <SuggestionCard
                  title="Data Cleaning Suggestions"
                  description="Recommended steps to clean and prepare your data."
                  suggestions={cleaningSuggestions}
                  selectedSteps={selectedSteps}
                  toggleStep={toggleStep}
                  isProcessing={isProcessing}
                />
              </TabsContent>
              <TabsContent value="feature-engineering">
                <SuggestionCard
                  title="Feature Engineering Suggestions"
                  description="Create new features to potentially improve model performance."
                  suggestions={featureSuggestions}
                  selectedSteps={selectedSteps}
                  toggleStep={toggleStep}
                  isProcessing={isProcessing}
                />
              </TabsContent>
            </Tabs>
          </div>
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Processing Summary</CardTitle>
                <CardDescription>Review the steps you've selected.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {allSuggestions.filter(s => selectedSteps.has(s.id)).map(s => (
                    <div key={s.id} className="text-sm flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      <span>{s.description}</span>
                    </div>
                  ))}
                  {selectedSteps.size === 0 && <p className="text-sm text-gray-500">No steps selected yet.</p>}
                </div>
                {isProcessing && <Progress value={processingProgress} className="w-full mt-4 h-2" />}
              </CardContent>
              <div className="p-6 pt-0">
                <Button onClick={handleProcess} disabled={isProcessing || selectedSteps.size === 0} className="w-full">
                  {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Applying Steps...</> : `Apply ${selectedSteps.size} Step(s)`}
                </Button>
              </div>
            </Card>
          </div>
        </div>
      ) : (
        <ResultsDisplay results={results} onNavigate={onNavigate} onDownload={handleDownload} />
      )}
    </div>
  );
}

function ProfileDisplay({ profile }: { profile: DatasetProfile }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Dataset Profile</CardTitle>
        <CardDescription>
          A summary of the dataset's characteristics.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="font-semibold">Overview</h3>
            <p>Rows: {profile.rowCount}</p>
            <p>Columns: {profile.columnCount}</p>
            <p>Duplicate Rows: {profile.duplicateRows}</p>
          </div>
          {profile.target && (
            <div>
              <h3 className="font-semibold">Target Variable</h3>
              <p>Column: {profile.target.column}</p>
              <p>Task: {profile.target.task}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Sub-components for better organization

function SuggestionCard({ title, description, suggestions, selectedSteps, toggleStep, isProcessing }: any) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <p className="text-gray-500 text-sm">No suggestions available for this category.</p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {suggestions.map((suggestion: Suggestion) => {
              const Icon = getIcon(suggestion.type);
              const isSelected = selectedSteps.has(suggestion.id);
              return (
                <AccordionItem value={suggestion.id} key={suggestion.id}>
                  <AccordionTrigger disabled={isProcessing} onClick={() => toggleStep(suggestion.id)} className="hover:no-underline">
                    <div className="flex items-center w-full pr-4">
                      <Checkbox checked={isSelected} className="mr-4" />
                      <Icon className="w-5 h-5 mr-3 text-gray-600" />
                      <span className="flex-grow text-left">{suggestion.description}</span>
                      {suggestion.recommended && <Badge variant="secondary" className="ml-2 bg-green-100 text-green-800">Recommended</Badge>}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pl-12 text-sm text-gray-600 space-y-2">
                    {suggestion.rationale && (
                      <div className="bg-blue-50 p-2 rounded border border-blue-100">
                        <span className="font-semibold text-blue-900">Why: </span>
                        {suggestion.rationale}
                      </div>
                    )}
                    {(suggestion as any).impact && (
                      <div className="bg-purple-50 p-2 rounded border border-purple-100">
                        <span className="font-semibold text-purple-900">Impact: </span>
                        {(suggestion as any).impact}
                      </div>
                    )}
                    {(suggestion as any).newFeatures && (suggestion as any).newFeatures.length > 0 && (
                      <div className="bg-gray-50 p-2 rounded border border-gray-100">
                        <span className="font-semibold text-gray-900">Creates Features: </span>
                        <span className="font-mono text-xs">{(suggestion as any).newFeatures.join(', ')}</span>
                      </div>
                    )}
                    {!suggestion.rationale && !suggestion.details && (
                      <p>This action will be applied to the column: {suggestion.column || 'N/A'}</p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  )
}

function ResultsDisplay({ results, onNavigate, onDownload }: any) {
  return (
    <Card className="bg-green-50/50">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <CheckCircle className="w-10 h-10 text-green-600" />
          <div>
            <CardTitle className="text-2xl text-green-900">Preprocessing Complete</CardTitle>
            <CardDescription className="text-green-700">{results.summary}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="font-semibold mb-2">Applied Steps</h3>
          <ul className="list-disc list-inside space-y-1 text-sm">
            {results.stepsApplied.map((step: any) => <li key={step.id}>{step.description}</li>)}
          </ul>
        </div>

        {results.preview && (
          <div>
            <h3 className="font-semibold mb-2">Processed Data Preview</h3>
            <div className="rounded-lg border overflow-auto max-h-60">
              <Table>
                <TableHeader>
                  <TableRow>{results.preview.columns.map((h: string) => <TableHead key={h}>{h}</TableHead>)}</TableRow>
                </TableHeader>
                <TableBody>
                  {results.preview.rows.map((row: any, i: number) => (
                    <TableRow key={i}>{results.preview.columns.map((h: string) => <TableCell key={h}>{String(row[h])}</TableCell>)}</TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <Button onClick={onDownload} variant="outline"><Download className="w-4 h-4 mr-2" /> Download Processed Data</Button>
          <Button onClick={() => onNavigate('visualization')}><LineChart className="w-4 h-4 mr-2" /> Proceed to Visualization</Button>
          <Button onClick={() => onNavigate('training')}><Target className="w-4 h-4 mr-2" /> Proceed to Model Training</Button>
        </div>
      </CardContent>
    </Card>
  )
}

function PreviewTable({ title, data }: { title: string, data: any }) {
  if (!data || !data.rows || data.rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No preview data available.</p>
        </CardContent>
      </Card>
    );
  }

  const headers = data.columns.slice(0, 5);
  const rows = data.rows.slice(0, 5);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {headers.map((h: string) => <TableHead key={h}>{h}</TableHead>)}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row: any, i: number) => (
                <TableRow key={i}>
                  {headers.map((h: string) => <TableCell key={h}>{String(row[h])}</TableCell>)}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}