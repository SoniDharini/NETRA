import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toast } from 'sonner';
import { Layout, MessageSquare, Settings, Loader2, Plus, Trash2, Edit2, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import { ProjectData } from '../App';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { VisualizationToolbar } from './visualization/VisualizationToolbar';
import { DataPanel } from './visualization/DataPanel';
import { ChartShelf } from './visualization/ChartShelf';
import { ChartTypeSelector } from './visualization/ChartTypeSelector';
import { ChartCanvas } from './visualization/ChartCanvas';
import { NLQPanel } from './visualization/NLQPanel';
import { FormatPanel, FormatConfig } from './visualization/FormatPanel';
import { AnalyticsPanel, AnalyticsConfig } from './visualization/AnalyticsPanel';
import { QuickStartGuide } from './visualization/QuickStartGuide';
import { SuggestionsPanel } from './visualization/SuggestionsPanel';
import { apiService, VisualizationSuggestion } from '../services/api.service';
import { sampleDataService } from '../services/sample-data.service';
import { useData } from '../contexts/DataContext';

interface VisualizationProps {
  onNavigate: (section: any) => void;
  projectData: ProjectData;
  updateProjectData: (data: Partial<ProjectData>) => void;
  markStepComplete: (step: string) => void;
}

// Type definitions for the visualization workspace
export interface FieldItem {
  name: string;
  type: 'dimension' | 'measure';
  dataType: 'string' | 'number' | 'date';
  aggregation?: 'sum' | 'mean' | 'count' | 'min' | 'max' | null;
}

export interface ChartConfig {
  columns: FieldItem[];
  rows: FieldItem[];
  color?: FieldItem;
  size?: FieldItem;
}

interface SavedVisualization {
  id: string;
  name: string;
  config: ChartConfig;
  chartType: string;
  timestamp: Date;
}

export function Visualization({ onNavigate, projectData, updateProjectData, markStepComplete }: VisualizationProps) {
  const { files } = useData();
  const activeFile = files.find(f => (f.status === 'completed' || f.status === 'success') && f.fileId);
  const fileId = projectData.fileId || activeFile?.fileId;

  // State
  const [fields, setFields] = useState<FieldItem[]>([]);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    columns: [],
    rows: [],
  });
  const [chartType, setChartType] = useState<string>('bar');
  const [canvasVisuals, setCanvasVisuals] = useState<any[]>([]);
  const [fullDataset, setFullDataset] = useState<any[]>([]);
  const [savedVisualizations, setSavedVisualizations] = useState<SavedVisualization[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [formatConfig, setFormatConfig] = useState<FormatConfig>({
    colorScheme: 'default',
    fontSize: 12,
    showGridLines: true,
    showLegend: true,
    showLabels: true,
    chartOpacity: 100,
  });
  const [analyticsConfig, setAnalyticsConfig] = useState<AnalyticsConfig>({
    showTrendLine: false,
    showAverage: false,
    showMedian: false,
    aggregation: 'sum',
  });
  const [activeMode, setActiveMode] = useState<'worksheet' | 'nlq'>('worksheet');
  const [showQuickStart, setShowQuickStart] = useState(true);
  const [aiSuggestions, setAiSuggestions] = useState<VisualizationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [lastAppliedSuggestion, setLastAppliedSuggestion] = useState<any>(null);
  const [chartData, setChartData] = useState<{ histogram: any; bar_chart: any; correlation: any } | null>(null);

  // Initialize: Load full dataset and fetch suggestions
  useEffect(() => {
    const initializeVisualization = async () => {
      if (fileId) {
        setIsDataLoading(true);
        try {
          // 1. Fetch Full Dataset via dedicated endpoint (returns blob)
          const blobResponse = await apiService.downloadPreprocessedDataset(String(fileId));

          if (blobResponse.success && blobResponse.data) {
            // Convert Blob to Text first ensures robust parsing
            const text = await blobResponse.data.text();

            // Parse CSV
            Papa.parse(text, {
              header: true,
              dynamicTyping: true,
              skipEmptyLines: true,
              complete: (results) => {
                const data = results.data;
                setFullDataset(data);

                // Detect fields from the FIRST row of full dataset
                if (data.length > 0) {
                  const sampleRow = data[0];
                  // Safe casting to avoid indexing errors
                  const rowObj = sampleRow as Record<string, any>;
                  const detectedFields: FieldItem[] = Object.keys(rowObj).map((key) => {
                    const value = rowObj[key];
                    const isNumber = typeof value === 'number' || (!isNaN(Number(value)) && value !== null && value !== undefined && value !== '');
                    const isDate = !isNumber && typeof value === 'string' && !isNaN(Date.parse(value));

                    return {
                      name: key,
                      type: isNumber ? 'measure' : 'dimension',
                      dataType: isDate ? 'date' : isNumber ? 'number' : 'string',
                    };
                  });
                  setFields(detectedFields);

                  // 2. Fetch AI Suggestions (after we have data/fields)
                  fetchAiSuggestions(detectedFields as FieldItem[]);
                }
                setIsDataLoading(false);
              },
              error: (error: any) => {
                console.error("CSV Parse Error", error);
                toast.error("Failed to parse dataset");
                setIsDataLoading(false);
              }
            });
          } else {
            // Fallback
            setIsDataLoading(false);
            generateMockFields();
          }

          // 3. Fetch Saved Visualizations
          fetchSavedVisualizations();

          // 4. Fetch chart data for histogram, bar, correlation
          const vizRes = await apiService.getVisualizationData(String(fileId));
          if (vizRes.success && vizRes.data) {
            setChartData(vizRes.data);
          }

        } catch (error) {
          console.error("Initialization error", error);
          setIsDataLoading(false);
          toast.error("Failed to initialize visualization workspace");
        }
      } else {
        // Mock data
        generateMockFields();
      }
    };

    initializeVisualization();
  }, [fileId]);

  const fetchSavedVisualizations = async () => {
    if (!fileId) return;
    try {
      const response = await apiService.getSavedVisualizations(String(fileId));
      if (response.success && response.data) {
        const saved = response.data.map((v: any) => ({
          id: v.id,
          name: v.title,
          config: v.config,
          chartType: v.chart_type,
          timestamp: new Date(v.created_at)
        }));
        setSavedVisualizations(saved);
      }
    } catch (error) {
      console.error("Failed to load saved visualizations", error);
    }
  };

  const fetchAiSuggestions = async (currentFields?: FieldItem[]) => {
    setIsLoadingSuggestions(true);
    try {
      const response = await apiService.getVisualizationSuggestions(
        fileId ? String(fileId) : 'mock-file-id'
      );
      
      if (response.success && response.data) {
        // Transform backend format (data_mapping, chart_type) to frontend format (config.columns/rows, type)
        const transformedSuggestions = response.data.map((s: any, idx: number) => {
          const dm = s.data_mapping || {};
          const columns = s.columns ?? (dm.x ? [dm.x] : []);
          const rows = s.rows ?? (dm.y && dm.y !== 'count' ? [dm.y] : dm.x ? [dm.x] : []);
          return {
            id: `suggestion-${idx}`,
            type: s.chart_type || s.type || 'bar',
            title: s.title || '',
            description: s.description || '',
            reason: s.reason || '',
            recommended: s.recommended ?? false,
            config: {
              columns: Array.isArray(columns) ? columns : [columns].filter(Boolean),
              rows: Array.isArray(rows) ? rows : [rows].filter(Boolean),
              color: s.color || dm.color,
              size: s.size || dm.size,
            },
          };
        });
        setAiSuggestions(transformedSuggestions as any);
      }
    } catch (error) {
      console.error('Failed to fetch AI suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const getProcessedData = (dataset: any[], config: ChartConfig, type: string) => {
    if (!dataset || dataset.length === 0) return [];
    if (!config.columns.length && !config.rows.length) return [];
    const xField = config.columns[0];
    const yFields = config.rows;

    // Histogram: group by x, count (no measure needed). Limit to top 20 bins for readability.
    if (type === 'histogram' && xField) {
      const groups: Record<string, number> = {};
      dataset.forEach((row: any) => {
        const key = String(row[xField.name] ?? 'Unknown');
        groups[key] = (groups[key] || 0) + 1;
      });
      const entries = Object.entries(groups)
        .map(([name, count]) => ({ [xField.name]: name, count, name }))
        .sort((a, b) => (b.count as number) - (a.count as number))
        .slice(0, 20);
      return entries;
    }

    if (type === 'scatter' && xField && yFields[0]) {
      return dataset.filter(row => row[xField.name] != null && row[yFields[0].name] != null);
    }
    if (type === 'pie' && xField) {
      const groups: Record<string, number> = {};
      const measureField = yFields[0];
      dataset.forEach(row => {
        const key = String(row[xField.name] || 'Unknown');
        groups[key] = (groups[key] || 0) + (measureField ? Number(row[measureField.name]) || 0 : 1);
      });
      return Object.entries(groups).map(([name, value]) => ({ name, value, [xField.name]: name }));
    }
    if (xField) {
      const groupedData: Record<string, any> = {};
      dataset.forEach((row: any) => {
        const groupKey = String(row[xField.name] ?? 'Unknown');
        if (!groupedData[groupKey]) {
          groupedData[groupKey] = { [xField.name]: row[xField.name], _count: 0, _sums: {} as any, _values: {} as any };
          yFields.forEach(yf => { groupedData[groupKey]._sums[yf.name] = 0; groupedData[groupKey]._values[yf.name] = []; });
        }
        groupedData[groupKey]._count++;
        yFields.forEach(yf => {
          const val = Number(row[yf.name]);
          if (!isNaN(val)) {
            groupedData[groupKey]._sums[yf.name] += val;
            groupedData[groupKey]._values[yf.name].push(val);
          }
        });
      });
      return Object.values(groupedData).map((g: any) => {
        const result: any = { [xField.name]: g[xField.name] };
        yFields.forEach(yf => {
          result[yf.name] = yf.aggregation === 'mean' && g._values[yf.name]?.length
            ? g._values[yf.name].reduce((a: number, b: number) => a + b, 0) / g._values[yf.name].length
            : g._sums[yf.name] || 0;
        });
        return result;
      });
    }
    return dataset.slice(0, 100);
  };

  const handleEditVisual = (viz: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setChartConfig(viz.config);
    setChartType(viz.type);
    setActiveMode('worksheet');
    toast.info(`Editing: ${viz.title}`);
  };

  const handleDeleteVisual = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCanvasVisuals(prev => prev.filter(v => v.id !== id));
  };

  const generateMockFields = () => {
    // Use sample data service to generate realistic data
    const sampleData = sampleDataService.getSampleDataset('sales', 100);
    
    if (sampleData && sampleData.rows.length > 0) {
      const sampleRow = sampleData.rows[0];
      const detectedFields: FieldItem[] = Object.keys(sampleRow).map((key) => {
        const value = sampleRow[key];
        const isNumber = typeof value === 'number';
        const isDate = !isNumber && typeof value === 'string' && !isNaN(Date.parse(value));
        
        return {
          name: key,
          type: isNumber ? 'measure' : 'dimension',
          dataType: isDate ? 'date' : isNumber ? 'number' : 'string',
        };
      });
      
      setFields(detectedFields);
      setFullDataset(sampleData.rows);
    }
  };

  const handleUpdateConfig = (updates: Partial<ChartConfig>) => {
    setChartConfig(prev => ({ ...prev, ...updates }));
  };

  const handleSaveVisualization = async () => {
    if (chartConfig.columns.length === 0 && chartConfig.rows.length === 0) {
      toast.error('Please add fields to the chart before saving');
      return;
    }
    if (fileId) {
      try {
        await apiService.saveVisualization(
          String(fileId),
          `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart ${savedVisualizations.length + 1}`,
          chartType,
          chartConfig,
          false
        );
        toast.success('Visualization saved!');
        fetchSavedVisualizations();
      } catch (e) {
        toast.error('Failed to save visualization');
      }
    } else {
      const newViz: SavedVisualization = {
        id: `viz-${Date.now()}`,
        name: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart ${savedVisualizations.length + 1}`,
        config: { ...chartConfig },
        chartType,
        timestamp: new Date(),
      };
      setSavedVisualizations(prev => [...prev, newViz]);
      toast.success('Visualization saved!');
    }
  };

  const handleExportChart = () => {
    toast.success('Exporting chart as PNG...');
    // In a real implementation, this would use a library like html2canvas
  };

  const handleNLQSubmit = async (query: string) => {
    setIsLoading(true);
    toast.info(`Processing: "${query}"`);
    
    // In a real implementation, this would call the NLQ API
    // const response = await apiService.processNLQ(projectData.fileId!, query);
    
    // Simulate processing
    setTimeout(() => {
      setIsLoading(false);
      toast.success('Visualization generated from your query!');
      
      // Auto-configure based on query keywords
      if (query.toLowerCase().includes('trend') || query.toLowerCase().includes('over time')) {
        setChartType('line');
      } else if (query.toLowerCase().includes('compare') || query.toLowerCase().includes('by')) {
        setChartType('bar');
      } else if (query.toLowerCase().includes('distribution')) {
        setChartType('histogram');
      } else if (query.toLowerCase().includes('correlation')) {
        setChartType('scatter');
      }
      
      // Switch to worksheet view to show the result
      setActiveMode('worksheet');
    }, 1500);
  };

  const handleFormatChange = (format: FormatConfig) => {
    setFormatConfig(format);
    toast.success('Format updated');
  };

  const handleAnalyticsChange = (analytics: AnalyticsConfig) => {
    setAnalyticsConfig(analytics);
  };

  const handleSelectSuggestion = (suggestion: any) => {
    // Helper: resolve field by name, or create synthetic FieldItem if not found (handles backend column name mismatches)
    const resolveField = (name: string, asMeasure = false): FieldItem => {
      const found = fields.find(f => f.name === name);
      if (found) return found;
      return { name, type: asMeasure ? 'measure' : 'dimension', dataType: 'string' };
    };

    const colNames = suggestion.config?.columns || [];
    const rowNames = suggestion.config?.rows || [];
    const columnsFields = colNames.map((colName: string) => resolveField(colName, false));
    const rowsFields = rowNames.map((rowName: string) => resolveField(rowName, true));

    const colorField = suggestion.config?.color
      ? (fields.find(f => f.name === suggestion.config.color) ?? resolveField(suggestion.config.color))
      : undefined;

    const sizeField = suggestion.config?.size
      ? (fields.find(f => f.name === suggestion.config.size) ?? resolveField(suggestion.config.size))
      : undefined;

    // Update configuration
    setChartConfig({
      columns: columnsFields,
      rows: rowsFields,
      color: colorField,
      size: sizeField,
    });

    // Set chart type
    setChartType(suggestion.type || 'bar');

    // Store the applied suggestion
    setLastAppliedSuggestion(suggestion);

    // Dismiss suggestions panel so user can see the chart
    setShowSuggestions(false);

    // Switch to worksheet mode to show the result
    setActiveMode('worksheet');

    toast.success(`Applied: ${suggestion.title}`, {
      description: 'Chart rendered in canvas. You can change the chart type or modify the configuration.',
    });
  };

  const handleNavigate = (section: string) => {
    if (section === 'report' && savedVisualizations.length > 0) {
      markStepComplete('visualization');
      updateProjectData({ 
        visualizations: savedVisualizations.map(v => v.name) 
      });
    }
    onNavigate(section);
  };

  // Check prerequisites - allow if we have fileId (from project or context) or dataPreview
  if (!fileId && !projectData.dataPreview) {
    return (
      <div className="max-w-6xl mx-auto">
        <Alert>
          <AlertDescription>
            Please upload data and complete preprocessing before creating visualizations.
            <Button
              variant="link"
              className="ml-2"
              onClick={() => onNavigate('upload')}
            >
              Go to Data Upload
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      {/* Quick Start Guide Modal */}
      {showQuickStart && (
        <QuickStartGuide onClose={() => setShowQuickStart(false)} />
      )}

      <div className="h-full max-h-screen flex flex-col overflow-hidden">
        {/* Toolbar */}
        <VisualizationToolbar
          onNavigate={handleNavigate}
          onSave={handleSaveVisualization}
          savedCount={savedVisualizations.length}
          onShowHelp={() => setShowQuickStart(true)}
          onShowSuggestions={() => setShowSuggestions(true)}
          suggestionsCount={aiSuggestions.length}
        />

        {/* Mode Tabs */}
        <div className="bg-white border-b px-4 flex-shrink-0">
          <Tabs value={activeMode} onValueChange={(v: any) => setActiveMode(v)}>
            <TabsList>
              <TabsTrigger value="worksheet">
                <Layout className="w-4 h-4 mr-2" />
                Worksheet
              </TabsTrigger>
              <TabsTrigger value="nlq">
                <MessageSquare className="w-4 h-4 mr-2" />
                Ask Data
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Main Workspace */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* AI Suggestions - Show at top when available */}
          {showSuggestions && aiSuggestions.length > 0 && (
            <div className="absolute top-20 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-3xl px-4">
              <SuggestionsPanel
                suggestions={aiSuggestions}
                onSelectSuggestion={handleSelectSuggestion}
                onDismiss={() => setShowSuggestions(false)}
                isLoading={isLoadingSuggestions}
              />
            </div>
          )}

          {/* Left Panel - Data Fields or NLQ */}
          <div className="w-64 border-r bg-white overflow-y-auto flex-shrink-0">
            {activeMode === 'worksheet' ? (
              <DataPanel fields={fields} />
            ) : (
              <div className="p-4">
                <NLQPanel 
                  onQuerySubmit={handleNLQSubmit}
                  isProcessing={isLoading}
                />
              </div>
            )}
          </div>

          {/* Center - Visualization Area */}
          <div className="flex-1 flex flex-col overflow-hidden min-w-0">
            {activeMode === 'worksheet' && (
              <>
                {/* Chart Type Selector */}
                <div className="bg-white border-b p-3 flex-shrink-0">
                  <ChartTypeSelector
                    selectedType={chartType}
                    onSelectType={setChartType}
                    showAiRecommendedBadge={!!lastAppliedSuggestion}
                    aiRecommendedType={lastAppliedSuggestion?.type}
                  />
                </div>

                {/* Chart Shelf */}
                <div className="bg-gray-50 border-b flex-shrink-0">
                  <ChartShelf
                    config={chartConfig}
                    onUpdateConfig={handleUpdateConfig}
                    fields={fields}
                  />
                </div>
              </>
            )}

            {/* Canvas Area */}
            <div className="flex-1 p-6 overflow-auto bg-gray-50 min-h-0">
              {/* 1. Render the 'Active' Worksheet visual being built/edited */}
              {/* Separated from the list for clarity, or added to list? 
                    User asked for "Canvas Loop". 
                    I will render the `canvasVisuals` list.
                */}

              {activeMode === 'worksheet' && (chartConfig.columns.length > 0 || chartConfig.rows.length > 0) && (
                <div className="mb-8 border-b-2 border-dashed border-gray-300 pb-8" data-testid="worksheet-scratchpad">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Worksheet Scratchpad</h3>
                  <div className="bg-white p-4 rounded-lg shadow-sm border h-96 flex flex-col">
                    <ChartCanvas
                      key={`canvas-${chartType}-${chartConfig.columns.length}-${chartConfig.rows.length}`}
                      config={chartConfig}
                      chartType={chartType}
                      data={(() => {
                        const d = getProcessedData(fullDataset, chartConfig, chartType);
                        if (process.env.NODE_ENV === 'development' && fullDataset?.length > 0 && d.length === 0) {
                          console.warn('[Visualization] getProcessedData returned empty. Dataset rows:', fullDataset.length, 'config:', { columns: chartConfig.columns.map(c => c.name), rows: chartConfig.rows.map(r => r.name), type: chartType });
                        }
                        return d;
                      })()}
                      onExport={() => { }}
                    />
                    <div className="mt-2 flex justify-end">
                      <Button size="sm" onClick={() => {
                        setCanvasVisuals(prev => [...prev, {
                          id: `canvas-manual-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                          type: chartType,
                          config: chartConfig,
                          title: "New Chart",
                          dataset_id: fileId
                        }]);
                        toast.success("Added to Canvas");
                      }}>
                        <Plus className="w-4 h-4 mr-1" /> Add to Canvas
                      </Button>
                    </div>
                  </div>
                </div>
              )}


              {chartData && (chartData.histogram?.column || chartData.bar_chart?.column || chartData.correlation?.columns?.length) > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" /> Quick Charts (from API)
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {chartData.histogram?.column && chartData.histogram.values?.length > 0 && (
                      <div className="bg-white p-4 rounded-lg border h-72">
                        <p className="text-sm font-medium text-gray-700 mb-2">Histogram: {chartData.histogram.column}</p>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={(chartData.histogram.labels || []).map((l: string, i: number) => ({ name: l, value: chartData.histogram.values[i] ?? 0 }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#3b82f6" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {chartData.bar_chart?.column && chartData.bar_chart.values?.length > 0 && (
                      <div className="bg-white p-4 rounded-lg border h-72">
                        <p className="text-sm font-medium text-gray-700 mb-2">Bar Chart: {chartData.bar_chart.column}</p>
                        <ResponsiveContainer width="100%" height={200}>
                          <BarChart data={(chartData.bar_chart.labels || []).map((l: string, i: number) => ({ name: String(l), value: chartData.bar_chart.values[i] ?? 0 }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis />
                            <Tooltip />
                            <Bar dataKey="value" fill="#10b981" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                    {chartData.correlation?.columns?.length > 0 && (
                      <div className="bg-white p-4 rounded-lg border h-72 overflow-auto">
                        <p className="text-sm font-medium text-gray-700 mb-2">Correlation Matrix</p>
                        <div className="overflow-x-auto text-xs">
                          <table className="min-w-full border-collapse">
                            <thead>
                              <tr>
                                <th className="border p-1 bg-gray-100"></th>
                                {chartData.correlation.columns.slice(0, 6).map((c: string) => (
                                  <th key={c} className="border p-1 bg-gray-100 truncate max-w-[60px]" title={c}>{c}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {chartData.correlation.matrix?.slice(0, 6).map((row: number[], i: number) => (
                                <tr key={i}>
                                  <td className="border p-1 bg-gray-50 font-medium truncate max-w-[60px]" title={chartData.correlation.columns[i]}>{chartData.correlation.columns[i]}</td>
                                  {row.slice(0, 6).map((v: number, j: number) => (
                                    <td key={j} className="border p-1 text-center" style={{ backgroundColor: v != null ? `rgba(59,130,246,${Math.abs(v)})` : 'transparent' }}>
                                      {v != null ? v.toFixed(2) : '-'}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Canvas ({canvasVisuals.length})</h3>

              {canvasVisuals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed rounded-lg">
                  <Layout className="w-12 h-12 mb-2 opacity-50" />
                  <p>Canvas is empty. Use AI suggestions or build a chart above.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {canvasVisuals.map((viz) => (
                    <div key={viz.id} className="bg-white p-4 rounded-lg shadow border h-96 hover:shadow-md transition-shadow relative group flex flex-col">
                      <div className="flex justify-between items-center mb-3">
                        <div className="font-medium truncate pr-4">{viz.title || 'Untitled Chart'}</div>
                        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e: React.MouseEvent) => handleEditVisual(viz, e)}>
                            <Edit2 className="w-3 h-3 text-blue-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e: React.MouseEvent) => handleDeleteVisual(viz.id, e)}>
                            <Trash2 className="w-3 h-3 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex-1 h-80 min-h-0">
                        <ChartCanvas
                          config={viz.config}
                          chartType={viz.type}
                          data={getProcessedData(fullDataset, viz.config, viz.type)}
                          onExport={() => { }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Context-sensitive */}
          <div className="w-72 border-l bg-white overflow-hidden flex flex-col flex-shrink-0">
            <Tabs defaultValue="saved" className="flex-1 flex flex-col overflow-hidden">
              <div className="border-b flex-shrink-0">
                <TabsList className="w-full justify-start rounded-none h-auto p-0">
                  <TabsTrigger value="saved" className="flex-1 rounded-none">
                    Saved ({savedVisualizations.length})
                  </TabsTrigger>
                  <TabsTrigger value="format" className="flex-1 rounded-none">
                    <Settings className="w-4 h-4 mr-1" />
                    Format
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="saved" className="flex-1 flex flex-col m-0 overflow-hidden">
                <div className="p-3 border-b flex-shrink-0">
                  <h2 className="text-gray-900">Saved Visualizations</h2>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-2">
                  {savedVisualizations.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">
                      No saved visualizations yet
                    </p>
                  ) : (
                    savedVisualizations.map((viz) => (
                      <div
                        key={viz.id}
                        className="p-3 bg-gray-50 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => {
                          setChartConfig(viz.config);
                          setChartType(viz.chartType);
                          setActiveMode('worksheet');
                          toast.success(`Loaded: ${viz.name}`);
                        }}
                      >
                        <p className="text-gray-900">{viz.name}</p>
                        <p className="text-gray-500">
                          {viz.timestamp.toLocaleDateString()}
                        </p>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-3 border-t flex-shrink-0">
                  <Button
                    className="w-full"
                    onClick={() => handleNavigate('report')}
                    disabled={savedVisualizations.length === 0}
                  >
                    Continue to Report
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="format" className="flex-1 overflow-y-auto m-0 p-3">
                <FormatPanel onFormatChange={handleFormatChange} />
                <div className="mt-4">
                  <AnalyticsPanel onApplyAnalytics={handleAnalyticsChange} />
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}