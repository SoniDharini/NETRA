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

          const cleaningGroups = new Set(['cleaning', 'encoding', 'scaling', 'feature_selection', 'anomaly_detection']);
          const featureGroups = new Set(['creation', 'transformation', 'discretization', 'datetime', 'text', 'semantic', 'feature_augmentation', 'clustering', 'polynomial', 'interaction', 'ml_driven', 'group_aggregate', 'target_encoding', 'log_transform', 'binning']);

          setCleaningSuggestions(allSuggestions.filter(s => cleaningGroups.has(s.group || 'cleaning')));
          setFeatureSuggestions(allSuggestions.filter(s => featureGroups.has(s.group || 'creation') || (!cleaningGroups.has(s.group || '') && !featureGroups.has(s.group || ''))));

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

  const handleAutoProcess = async () => {
    if (!activeFile?.fileId) return;

    console.log(`[Preprocessing] Starting IDPRA Auto-Processing for fileId: ${activeFile.fileId}`);

    setIsProcessing(true);
    setProcessingProgress(0);
    // Simulation of progress
    const progressInterval = setInterval(() => setProcessingProgress(p => Math.min(p + 2, 95)), 300);

    try {
      const response = await apiService.autoProcessDataset(activeFile.fileId);
      clearInterval(progressInterval);

      if (response.success && response.data) {
        setProcessingProgress(100);
        const { processedFileId, summary, preview, appliedSteps } = response.data;

        updateFile(activeFile.id, { fileId: processedFileId, data: preview });
        updateProjectData({
          preprocessingSteps: appliedSteps.map((s: any) => s.description),
          processedFileId: processedFileId,
        });

        setResults({ summary, preview, stepsApplied: appliedSteps });
        setIsComplete(true);
        markStepComplete('preprocessing');
        toast.success(summary || 'IDPRA Auto-Processing complete!');
      } else {
        throw new Error(response.error || 'Failed to auto-process data.');
      }
    } catch (error: any) {
      clearInterval(progressInterval);
      setProcessingProgress(0);
      toast.error(error.message || 'An error occurred during IDPRA processing.');
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-6">
            <SuggestionCard
              title="Data Cleaning"
              description="Missing values, outliers, encoding."
              suggestions={cleaningSuggestions}
              selectedSteps={selectedSteps}
              toggleStep={toggleStep}
              isProcessing={isProcessing}
              icon={Droplets}
            />
          </div>

          <div className="lg:col-span-4 space-y-6">
            <SuggestionCard
              title="Feature Engineering"
              description="New features, interactions, transformations."
              suggestions={featureSuggestions}
              selectedSteps={selectedSteps}
              toggleStep={toggleStep}
              isProcessing={isProcessing}
              icon={Brain}
            />
          </div>

          <div className="lg:col-span-4">
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

function SuggestionCard({ title, description, suggestions, selectedSteps, toggleStep, isProcessing, icon: HeaderIcon }: any) {
  return (
    <Card className="h-full border-t-4 border-t-blue-500 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          {HeaderIcon && <HeaderIcon className="w-5 h-5 mr-2" />}
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {suggestions.length === 0 ? (
          <p className="text-gray-500 text-sm italic">No suggestions available.</p>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            {suggestions.map((suggestion: any) => {
              const isSelected = selectedSteps.has(suggestion.id);
              return (
                <AccordionItem value={suggestion.id} key={suggestion.id} className="border-b last:border-0">
                  <div className="flex items-start w-full p-3 hover:bg-gray-50/50 transition-colors">
                    <div className="pt-0.5 mr-3">
                      <Checkbox
                        id={`chk-${suggestion.id}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleStep(suggestion.id)}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <AccordionTrigger className="py-0 hover:no-underline text-left">
                        <span className="text-sm font-medium text-gray-900 block truncate pr-4">
                          {suggestion.description}
                        </span>
                      </AccordionTrigger>
                      <div className="mt-1">
                        {suggestion.recommended && (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 hover:bg-green-100 border-none">
                            AI Recommended
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <AccordionContent className="px-3 pb-3 text-sm text-gray-600 bg-gray-50/30 rounded mx-2 mb-2">
                    {suggestion.rationale && (
                      <div className="flex gap-2 mb-2 pt-2">
                        <Brain className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-blue-900 block mb-0.5">AI Reasoning:</span>
                          {suggestion.rationale}
                        </div>
                      </div>
                    )}
                    {suggestion.newFeatures && suggestion.newFeatures.length > 0 && (
                      <div className="text-xs font-mono bg-white p-1 border rounded opacity-80 inline-block">
                        + Features: {suggestion.newFeatures.join(', ')}
                      </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
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