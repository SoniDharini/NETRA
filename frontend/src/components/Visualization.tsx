import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toast } from 'sonner@2.0.3';
import { Layout, MessageSquare, Settings } from 'lucide-react';
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
  // State
  const [fields, setFields] = useState<FieldItem[]>([]);
  const [chartConfig, setChartConfig] = useState<ChartConfig>({
    columns: [],
    rows: [],
  });
  const [chartType, setChartType] = useState<string>('bar');
  const [chartData, setChartData] = useState<any[]>([]);
  const [savedVisualizations, setSavedVisualizations] = useState<SavedVisualization[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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

  // Initialize fields from the dataset
  useEffect(() => {
    if (projectData.dataPreview && projectData.dataPreview.length > 0) {
      const sampleRow = projectData.dataPreview[0];
      const detectedFields: FieldItem[] = Object.keys(sampleRow).map((key) => {
        const value = sampleRow[key];
        const isNumber = typeof value === 'number' || !isNaN(Number(value));
        const isDate = !isNumber && !isNaN(Date.parse(value));
        
        return {
          name: key,
          type: isNumber ? 'measure' : 'dimension',
          dataType: isDate ? 'date' : isNumber ? 'number' : 'string',
        };
      });
      
      setFields(detectedFields);
      
      // Fetch AI suggestions
      fetchAiSuggestions();
    } else {
      // Mock data for demonstration
      generateMockFields();
      // Also fetch suggestions for mock data
      fetchAiSuggestions();
    }
  }, [projectData.dataPreview]);

  const fetchAiSuggestions = async () => {
    setIsLoadingSuggestions(true);
    try {
      const response = await apiService.getVisualizationSuggestions(
        projectData.fileId || 'mock-file-id'
      );
      
      if (response.success && response.data) {
        // Transform suggestions to include IDs and full config
        const transformedSuggestions = response.data.map((s, idx) => ({
          id: `suggestion-${idx}`,
          ...s,
          config: {
            columns: s.columns || [],
            rows: s.rows || [],
            color: s.color,
            size: s.size,
          },
        }));
        setAiSuggestions(transformedSuggestions as any);
      }
    } catch (error) {
      console.error('Failed to fetch AI suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  // Generate chart data when config changes
  useEffect(() => {
    if (chartConfig.columns.length > 0 || chartConfig.rows.length > 0) {
      generateChartData();
    }
  }, [chartConfig, projectData.dataPreview]);

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
      
      // Also set the sample data as preview data
      updateProjectData({ dataPreview: sampleData.rows });
    }
  };

  const generateChartData = () => {
    // Use project data if available
    if (projectData.dataPreview && projectData.dataPreview.length > 0) {
      // Filter and format data based on config
      const relevantFields = [
        ...chartConfig.columns.map(f => f.name),
        ...chartConfig.rows.map(f => f.name),
        chartConfig.color?.name,
        chartConfig.size?.name,
      ].filter(Boolean);

      const formattedData = projectData.dataPreview.map(row => {
        const newRow: any = {};
        relevantFields.forEach(field => {
          if (field && row[field] !== undefined) {
            newRow[field] = row[field];
          }
        });
        return newRow;
      });

      setChartData(formattedData);
    } else {
      // Generate mock data for demonstration
      generateMockChartData();
    }
  };

  const generateMockChartData = () => {
    // Use sample data from the service
    const sampleData = sampleDataService.getSampleDataset('sales', 50);
    if (sampleData) {
      setChartData(sampleData.rows);
    }
  };

  const handleUpdateConfig = (updates: Partial<ChartConfig>) => {
    setChartConfig(prev => ({ ...prev, ...updates }));
  };

  const handleSaveVisualization = () => {
    if (chartConfig.columns.length === 0 && chartConfig.rows.length === 0) {
      toast.error('Please add fields to the chart before saving');
      return;
    }

    const newViz: SavedVisualization = {
      id: `viz-${Date.now()}`,
      name: `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart ${savedVisualizations.length + 1}`,
      config: { ...chartConfig },
      chartType,
      timestamp: new Date(),
    };

    setSavedVisualizations(prev => [...prev, newViz]);
    toast.success('Visualization saved!');
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
    // Find fields and configure chart based on suggestion
    const columnsFields = suggestion.config.columns
      .map((colName: string) => fields.find(f => f.name === colName))
      .filter(Boolean) as FieldItem[];
    
    const rowsFields = suggestion.config.rows
      .map((rowName: string) => fields.find(f => f.name === rowName))
      .filter(Boolean) as FieldItem[];

    const colorField = suggestion.config.color
      ? fields.find(f => f.name === suggestion.config.color)
      : undefined;

    const sizeField = suggestion.config.size
      ? fields.find(f => f.name === suggestion.config.size)
      : undefined;

    // Update configuration
    setChartConfig({
      columns: columnsFields,
      rows: rowsFields,
      color: colorField,
      size: sizeField,
    });

    // Set chart type
    setChartType(suggestion.type);

    // Store the applied suggestion
    setLastAppliedSuggestion(suggestion);

    // Switch to worksheet mode to show the result
    setActiveMode('worksheet');

    // Show success message
    toast.success(`Applied: ${suggestion.title}`, {
      description: 'You can change the chart type or modify the configuration',
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

  // Check prerequisites
  if (!projectData.modelMetrics && !projectData.dataPreview) {
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
            <div className="flex-1 p-4 overflow-auto bg-gray-50 min-h-0">
              <ChartCanvas
                config={chartConfig}
                chartType={chartType}
                data={chartData}
                onExport={handleExportChart}
              />
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