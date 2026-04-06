import { useState, useEffect, useMemo, useRef } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import { Layout, MessageSquare, Settings, Loader2, Plus, Trash2, Edit2, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Papa from 'papaparse';
import { ProjectData } from '../App';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
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
  analyticsConfig?: AnalyticsConfig;
  formatConfig?: FormatConfig;
  filterConfig?: FilterConfig;
  calculatedMetrics?: CalculatedMetric[];
}

interface CalculatedMetric {
  id: string;
  name: string;
  left: string;
  right: string;
  operation: 'divide' | 'add' | 'subtract' | 'multiply';
}

interface FilterConfig {
  column?: string;
  mode?: 'none' | 'category' | 'range' | 'contains';
  categoryValue?: string;
  containsValue?: string;
  minValue?: number;
  maxValue?: number;
}

interface VisualizationSnapshot {
  chartType: string;
  chartConfig: ChartConfig;
  analyticsConfig: AnalyticsConfig;
  formatConfig: FormatConfig;
  filterConfig: FilterConfig;
  calculatedMetrics: CalculatedMetric[];
}

interface PersistedCanvasState {
  chartType: string;
  chartConfig: ChartConfig;
  analyticsConfig: AnalyticsConfig;
  formatConfig: FormatConfig;
  filterConfig: FilterConfig;
  calculatedMetrics: CalculatedMetric[];
  canvasVisuals: any[];
  selectedColor: string;
  visualizationSize: number;
  datasetConfiguration: {
    fileId?: string;
  };
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
  const [latestNlqResult, setLatestNlqResult] = useState<{ query: string; output: string } | null>(null);
  const [chartData, setChartData] = useState<{ histogram: any; bar_chart: any; correlation: any } | null>(null);
  const [filterConfig, setFilterConfig] = useState<FilterConfig>({ mode: 'none' });
  const [calculatedMetrics, setCalculatedMetrics] = useState<CalculatedMetric[]>([]);
  const [selectedColor, setSelectedColor] = useState('#3B82F6');
  const [visualizationSize, setVisualizationSize] = useState(5);
  const [metricDraft, setMetricDraft] = useState<{ left: string; right: string; operation: CalculatedMetric['operation']; name: string }>({
    left: '',
    right: '',
    operation: 'divide',
    name: '',
  });
  const [undoStack, setUndoStack] = useState<VisualizationSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<VisualizationSnapshot[]>([]);
  const isHistoryApplying = useRef(false);
  const snapshotHashRef = useRef<string>('');
  const canvasContainerRef = useRef<HTMLDivElement | null>(null);
  const numericFields = useMemo(() => fields.filter((f) => f.type === 'measure'), [fields]);
  const allFieldNames = useMemo(() => fields.map((f) => f.name), [fields]);
  const colorPalette = useMemo(() => ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'], []);
  const storageKey = useMemo(() => `canvasState:${fileId || 'default'}`, [fileId]);
  const selectedFilterValues = useMemo(() => {
    if (!filterConfig.column || !fullDataset.length) return [];
    const vals = Array.from(new Set(fullDataset.map((row) => String(row[filterConfig.column!] ?? ''))));
    return vals.slice(0, 100);
  }, [filterConfig.column, fullDataset]);

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

  useEffect(() => {
    const savedState = localStorage.getItem(storageKey);
    if (!savedState) return;

    try {
      const parsed = JSON.parse(savedState) as PersistedCanvasState;
      if (parsed.datasetConfiguration?.fileId && String(parsed.datasetConfiguration.fileId) !== String(fileId || '')) {
        return;
      }
      if (parsed.chartType) setChartType(parsed.chartType);
      if (parsed.chartConfig) setChartConfig(parsed.chartConfig);
      if (parsed.analyticsConfig) setAnalyticsConfig(parsed.analyticsConfig);
      if (parsed.formatConfig) setFormatConfig(parsed.formatConfig);
      if (parsed.filterConfig) setFilterConfig(parsed.filterConfig);
      if (Array.isArray(parsed.calculatedMetrics)) setCalculatedMetrics(parsed.calculatedMetrics);
      if (Array.isArray(parsed.canvasVisuals)) setCanvasVisuals(parsed.canvasVisuals);
      if (parsed.selectedColor) setSelectedColor(parsed.selectedColor);
      if (typeof parsed.visualizationSize === 'number') {
        setVisualizationSize(Math.max(1, Math.min(10, parsed.visualizationSize)));
      }
      toast.success('Saved canvas restored');
    } catch (error) {
      console.error('Failed to restore canvas state', error);
    }
  }, [storageKey, fileId]);

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
          timestamp: new Date(v.created_at),
          analyticsConfig: v.config?.__meta?.analyticsConfig,
          formatConfig: v.config?.__meta?.formatConfig,
          filterConfig: v.config?.__meta?.filterConfig,
          calculatedMetrics: v.config?.__meta?.calculatedMetrics,
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

  const createSnapshot = (): VisualizationSnapshot => ({
    chartType,
    chartConfig,
    analyticsConfig,
    formatConfig,
    filterConfig,
    calculatedMetrics,
  });

  const applySnapshot = (snapshot: VisualizationSnapshot) => {
    isHistoryApplying.current = true;
    setChartType(snapshot.chartType);
    setChartConfig(snapshot.chartConfig);
    setAnalyticsConfig(snapshot.analyticsConfig);
    setFormatConfig(snapshot.formatConfig);
    setFilterConfig(snapshot.filterConfig);
    setCalculatedMetrics(snapshot.calculatedMetrics);
    snapshotHashRef.current = JSON.stringify(snapshot);
  };

  const getCalculatedDataset = (dataset: any[]) => {
    if (!dataset.length || !calculatedMetrics.length) return dataset;
    return dataset.map((row) => {
      const nextRow = { ...row };
      calculatedMetrics.forEach((metric) => {
        const left = Number(row[metric.left]);
        const right = Number(row[metric.right]);
        let value = 0;
        if (metric.operation === 'divide') value = right !== 0 ? left / right : 0;
        if (metric.operation === 'add') value = left + right;
        if (metric.operation === 'subtract') value = left - right;
        if (metric.operation === 'multiply') value = left * right;
        nextRow[metric.name] = Number.isFinite(value) ? value : 0;
      });
      return nextRow;
    });
  };

  const applyFilters = (dataset: any[]) => {
    if (!filterConfig.column || !filterConfig.mode || filterConfig.mode === 'none') return dataset;
    const col = filterConfig.column;

    if (filterConfig.mode === 'category') {
      if (!filterConfig.categoryValue) return dataset;
      return dataset.filter((row) => String(row[col]) === String(filterConfig.categoryValue));
    }

    if (filterConfig.mode === 'contains') {
      if (!filterConfig.containsValue) return dataset;
      const q = filterConfig.containsValue.toLowerCase();
      return dataset.filter((row) => String(row[col] ?? '').toLowerCase().includes(q));
    }

    if (filterConfig.mode === 'range') {
      const min = filterConfig.minValue;
      const max = filterConfig.maxValue;
      return dataset.filter((row) => {
        const v = Number(row[col]);
        if (Number.isNaN(v)) return false;
        if (min != null && v < min) return false;
        if (max != null && v > max) return false;
        return true;
      });
    }

    return dataset;
  };

  const mapAggregation = (agg: string) => {
    if (agg === 'average') return 'mean';
    return agg;
  };

  const getProcessedData = (dataset: any[], config: ChartConfig, type: string) => {
    if (!dataset || dataset.length === 0) return [];
    if (!config.columns.length && !config.rows.length) return [];
    let workingSet = applyFilters(getCalculatedDataset(dataset));
    if (!workingSet.length) return [];
    const xField = config.columns[0];
    const yFields = config.rows;

    // Histogram: group by x, count (no measure needed). Limit to top 20 bins for readability.
    if (type === 'histogram' && xField) {
      const groups: Record<string, number> = {};
      workingSet.forEach((row: any) => {
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
      return workingSet.filter(row => row[xField.name] != null && row[yFields[0].name] != null);
    }
    if (type === 'pie' && xField) {
      const groups: Record<string, number> = {};
      const measureField = yFields[0];
      workingSet.forEach(row => {
        const key = String(row[xField.name] || 'Unknown');
        groups[key] = (groups[key] || 0) + (measureField ? Number(row[measureField.name]) || 0 : 1);
      });
      return Object.entries(groups).map(([name, value]) => ({ name, value, [xField.name]: name }));
    }
    if (xField) {
      const groupedData: Record<string, any> = {};
      workingSet.forEach((row: any) => {
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
      let transformed = Object.values(groupedData).map((g: any) => {
        const result: any = { [xField.name]: g[xField.name] };
        yFields.forEach(yf => {
          const values: number[] = g._values[yf.name] || [];
          const agg = mapAggregation(yf.aggregation || analyticsConfig.aggregation || 'sum');
          if (agg === 'mean') {
            result[yf.name] = values.length ? values.reduce((a: number, b: number) => a + b, 0) / values.length : 0;
          } else if (agg === 'count') {
            result[yf.name] = values.length;
          } else if (agg === 'min') {
            result[yf.name] = values.length ? Math.min(...values) : 0;
          } else if (agg === 'max') {
            result[yf.name] = values.length ? Math.max(...values) : 0;
          } else {
            result[yf.name] = g._sums[yf.name] || 0;
          }
        });
        return result;
      }).sort((a: any, b: any) => String(a[xField.name]).localeCompare(String(b[xField.name])));

      if (analyticsConfig.filterType && analyticsConfig.filterCount && yFields[0]) {
        const metric = yFields[0].name;
        transformed = [...transformed].sort((a: any, b: any) => (b[metric] || 0) - (a[metric] || 0));
        if (analyticsConfig.filterType === 'top') {
          transformed = transformed.slice(0, analyticsConfig.filterCount);
        } else {
          transformed = transformed.slice(-analyticsConfig.filterCount);
        }
      }

      if ((analyticsConfig as any).runningTotal && yFields[0]) {
        const metric = yFields[0].name;
        let running = 0;
        transformed = transformed.map((row: any) => {
          running += Number(row[metric] || 0);
          return { ...row, [`${metric}_running_total`]: running };
        });
      }

      if ((analyticsConfig as any).movingAverage && yFields[0]) {
        const metric = yFields[0].name;
        const windowSize = Math.max(2, Number((analyticsConfig as any).movingAverageWindow || 3));
        transformed = transformed.map((row: any, idx: number, arr: any[]) => {
          const slice = arr.slice(Math.max(0, idx - windowSize + 1), idx + 1);
          const avg = slice.reduce((acc: number, curr: any) => acc + Number(curr[metric] || 0), 0) / slice.length;
          return { ...row, [`${metric}_moving_avg`]: avg };
        });
      }

      if ((analyticsConfig as any).trendAnalysis && yFields[0]) {
        const metric = yFields[0].name;
        const points = transformed.map((r: any, i: number) => ({ x: i + 1, y: Number(r[metric] || 0) }));
        const n = points.length;
        const sumX = points.reduce((a, b) => a + b.x, 0);
        const sumY = points.reduce((a, b) => a + b.y, 0);
        const sumXY = points.reduce((a, b) => a + b.x * b.y, 0);
        const sumXX = points.reduce((a, b) => a + b.x * b.x, 0);
        const denom = n * sumXX - sumX * sumX;
        const slope = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
        const intercept = n ? (sumY - slope * sumX) / n : 0;
        transformed = transformed.map((row: any, i: number) => ({
          ...row,
          [`${metric}_trend`]: slope * (i + 1) + intercept,
        }));
      }

      if ((analyticsConfig as any).distributionAnalysis && yFields[0]) {
        const metric = yFields[0].name;
        const values = transformed.map((r: any) => Number(r[metric] || 0)).filter((v) => !Number.isNaN(v));
        if (values.length) {
          const min = Math.min(...values);
          const max = Math.max(...values);
          const bins = 10;
          const width = (max - min || 1) / bins;
          const bucketed = new Array(bins).fill(0).map((_, i) => ({
            name: `${(min + i * width).toFixed(2)}-${(min + (i + 1) * width).toFixed(2)}`,
            count: 0,
          }));
          values.forEach((v) => {
            const idx = Math.min(bins - 1, Math.floor((v - min) / width));
            bucketed[idx].count += 1;
          });
          transformed = bucketed;
        }
      }

      return transformed;
    }
    return workingSet.slice(0, 100);
  };

  const handleEditVisual = (viz: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setChartConfig(viz.config);
    setChartType(viz.type || viz.chartType || 'bar');
    if (viz.config?.__meta?.analyticsConfig) setAnalyticsConfig(viz.config.__meta.analyticsConfig);
    if (viz.config?.__meta?.formatConfig) setFormatConfig(viz.config.__meta.formatConfig);
    if (viz.config?.__meta?.filterConfig) setFilterConfig(viz.config.__meta.filterConfig);
    if (Array.isArray(viz.config?.__meta?.calculatedMetrics)) setCalculatedMetrics(viz.config.__meta.calculatedMetrics);
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

  useEffect(() => {
    const snap = createSnapshot();
    const hash = JSON.stringify(snap);
    if (!snapshotHashRef.current) {
      snapshotHashRef.current = hash;
      return;
    }
    if (isHistoryApplying.current) {
      isHistoryApplying.current = false;
      snapshotHashRef.current = hash;
      return;
    }
    if (hash !== snapshotHashRef.current) {
      try {
        const previous = JSON.parse(snapshotHashRef.current) as VisualizationSnapshot;
        setUndoStack((prev) => [...prev.slice(-49), previous]);
      } catch (_) {
        // ignore invalid snapshot parse
      }
      setRedoStack([]);
      snapshotHashRef.current = hash;
    }
  }, [chartType, chartConfig, analyticsConfig, formatConfig, filterConfig, calculatedMetrics]);

  const handleUndo = () => {
    if (!undoStack.length) return;
    const previous = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setRedoStack((prev) => [...prev, createSnapshot()]);
    applySnapshot(previous);
    toast.success('Undid last visualization change');
  };

  const handleRedo = () => {
    if (!redoStack.length) return;
    const next = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setUndoStack((prev) => [...prev, createSnapshot()]);
    applySnapshot(next);
    toast.success('Redid visualization change');
  };

  const handleChartTypeChange = (type: string) => {
    setChartType(type);
  };

  const handleUpdateConfig = (updates: Partial<ChartConfig>) => {
    setChartConfig(prev => ({ ...prev, ...updates }));
  };

  const addCalculatedMetric = () => {
    if (!metricDraft.left || !metricDraft.right || !metricDraft.name.trim()) {
      toast.error('Select left/right fields and provide a metric name');
      return;
    }
    if (fields.some((f) => f.name === metricDraft.name.trim())) {
      toast.error('Metric name already exists. Choose a different name.');
      return;
    }
    const newMetric: CalculatedMetric = {
      id: `calc-${Date.now()}`,
      left: metricDraft.left,
      right: metricDraft.right,
      operation: metricDraft.operation,
      name: metricDraft.name.trim(),
    };
    setCalculatedMetrics((prev) => [...prev, newMetric]);
    setFields((prev) => [...prev, { name: newMetric.name, type: 'measure', dataType: 'number' }]);
    setMetricDraft({ left: '', right: '', operation: 'divide', name: '' });
    toast.success(`Calculated metric "${newMetric.name}" added`);
  };

  const removeCalculatedMetric = (metricId: string) => {
    const metric = calculatedMetrics.find((m) => m.id === metricId);
    setCalculatedMetrics((prev) => prev.filter((m) => m.id !== metricId));
    if (metric) {
      setFields((prev) => prev.filter((f) => f.name !== metric.name));
      setChartConfig((prev) => ({
        ...prev,
        rows: prev.rows.filter((r) => r.name !== metric.name),
        columns: prev.columns.filter((c) => c.name !== metric.name),
        color: prev.color?.name === metric.name ? undefined : prev.color,
        size: prev.size?.name === metric.name ? undefined : prev.size,
      }));
    }
    toast.success('Calculated metric removed');
  };

  const applyQuickTemplate = (template: 'distribution' | 'trend' | 'summary') => {
    const firstDimension = fields.find((f) => f.type === 'dimension');
    const dateDimension = fields.find((f) => f.dataType === 'date');
    const firstMeasure = fields.find((f) => f.type === 'measure');
    if (!firstDimension || !firstMeasure) {
      toast.error('Need at least one dimension and one measure for templates');
      return;
    }

    if (template === 'distribution') {
      setChartType('histogram');
      setChartConfig({ columns: [firstDimension], rows: [] });
    } else if (template === 'trend') {
      setChartType('line');
      setChartConfig({ columns: [dateDimension || firstDimension], rows: [{ ...firstMeasure, aggregation: 'sum' }] });
      setAnalyticsConfig((prev: any) => ({ ...prev, trendAnalysis: true, movingAverage: true }));
    } else {
      setChartType('bar');
      setChartConfig({ columns: [firstDimension], rows: [{ ...firstMeasure, aggregation: 'sum' }] });
      setAnalyticsConfig((prev: any) => ({ ...prev, filterType: undefined, filterCount: undefined }));
    }
    toast.success(`${template[0].toUpperCase() + template.slice(1)} template applied`);
  };

  const captureCanvasElement = async () => {
    if (!canvasContainerRef.current) {
      throw new Error('No canvas content found to export');
    }
    return html2canvas(canvasContainerRef.current, {
      backgroundColor: '#f9fafb',
      scale: 2,
      useCORS: true,
    });
  };

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportChart = async (format: 'png' | 'pdf' | 'json' = 'png') => {
    try {
      if (format === 'json') {
        const exportPayload = {
          chartType,
          measure: chartConfig.rows.map((r) => r.name),
          dimension: chartConfig.columns.map((c) => c.name),
          aggregation: analyticsConfig.aggregation,
          filters: filterConfig,
          analytics: analyticsConfig,
          opacity: formatConfig.chartOpacity,
          calculatedMetrics,
          savedAt: new Date().toISOString(),
        };
        downloadBlob(new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' }), `visualization-config-${Date.now()}.json`);
        toast.success('Visualization JSON exported');
        return;
      }

      const canvas = await captureCanvasElement();
      const pngDataUrl = canvas.toDataURL('image/png');
      if (format === 'png') {
        const link = document.createElement('a');
        link.download = `visualization-${Date.now()}.png`;
        link.href = pngDataUrl;
        link.click();
        toast.success('Visualization PNG exported');
        return;
      }

      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();
      const imageRatio = canvas.width / canvas.height;
      const pageRatio = (width - 40) / (height - 56);
      const exportWidth = imageRatio > pageRatio ? width - 40 : (height - 56) * imageRatio;
      const exportHeight = imageRatio > pageRatio ? (width - 40) / imageRatio : height - 56;
      const offsetX = (width - exportWidth) / 2;
      pdf.setFontSize(12);
      pdf.text(`Visualization Export - ${new Date().toLocaleString()}`, 20, 20);
      pdf.addImage(pngDataUrl, 'PNG', offsetX, 36, exportWidth, exportHeight);
      pdf.save(`visualization-${Date.now()}.pdf`);
      toast.success('Visualization PDF exported');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to export visualization');
    }
  };

  const handleSaveProgress = () => {
    const payload: PersistedCanvasState = {
      chartType,
      chartConfig,
      analyticsConfig,
      formatConfig,
      filterConfig,
      calculatedMetrics,
      canvasVisuals,
      selectedColor,
      visualizationSize,
      datasetConfiguration: {
        fileId: fileId ? String(fileId) : undefined,
      },
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
    toast.success('Canvas progress saved');
  };

  const handleNewCanvas = () => {
    localStorage.removeItem(storageKey);
    setChartType('bar');
    setChartConfig({ columns: [], rows: [] });
    setCanvasVisuals([]);
    setSelectedColor('#3B82F6');
    setVisualizationSize(5);
    toast.success('Started a fresh canvas');
  };

  const handleSaveVisualization = async () => {
    if (chartConfig.columns.length === 0 && chartConfig.rows.length === 0) {
      toast.error('Please add fields to the chart before saving');
      return;
    }
    if (fileId) {
      try {
        const configToSave = {
          ...chartConfig,
          __meta: {
            analyticsConfig,
            formatConfig,
            filterConfig,
            calculatedMetrics,
          }
        };
        await apiService.saveVisualization(
          String(fileId),
          `${chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart ${savedVisualizations.length + 1}`,
          chartType,
          configToSave,
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
        config: {
          ...chartConfig,
          __meta: {
            analyticsConfig,
            formatConfig,
            filterConfig,
            calculatedMetrics,
          }
        } as any,
        chartType,
        timestamp: new Date(),
        analyticsConfig,
        formatConfig,
        filterConfig,
        calculatedMetrics,
      };
      setSavedVisualizations(prev => [...prev, newViz]);
      toast.success('Visualization saved!');
    }
  };

  const handleNLQSubmit = async (query: string) => {
    setIsLoading(true);
    
    try {
      let resolvedChartType = chartType;
      let interpretation = `Generated visualization for: "${query}".`;
      let backendConfig = null;

      const effectiveFileId = fileId || (projectData as any).fileId;

      if (effectiveFileId) {
        const response = await apiService.processNLQ(String(effectiveFileId), query);
        if (response.success && response.data) {
          const resData = response.data as any;
          // Backend via process_nlq_view returns: { interpretation, visualization: { chartType, config } }
          // But also handle direct { chartType, chartConfig, interpretation } format
          resolvedChartType =
            resData.visualization?.chartType ||
            resData.chartType ||
            chartType;
          backendConfig =
            resData.visualization?.config ||
            resData.chartConfig ||
            null;
          if (resData.interpretation) {
            interpretation = resData.interpretation;
          }
        } else {
          throw new Error(response.error || 'Failed to process NLQ via AI');
        }
      } else {
        toast.warning('No active dataset to query.');
        setIsLoading(false);
        return;
      }

      setChartType(resolvedChartType);

      if (backendConfig) {
        const resolveField = (name: string, asMeasure = false): any => {
          const found = fields.find(f => f.name === name);
          if (found) return found;
          return { name, type: asMeasure ? 'measure' : 'dimension', dataType: 'string' };
        };

        const colNames = backendConfig.columns || [];
        const rowNames = backendConfig.rows || [];
        const getColumnName = (col: any) => typeof col === 'string' ? col : col?.name;

        const columnsFields = colNames
          .map((col: any) => getColumnName(col))
          .filter(Boolean)
          .map((name: string) => resolveField(name, false));

        const rowsFields = rowNames
          .map((row: any) => {
            const name = getColumnName(row);
            if (!name) return null;
            let f = resolveField(name, true);
            if (typeof row === 'object' && row.aggregation) {
              f = { ...f, aggregation: row.aggregation } as any;
            }
            return f;
          })
          .filter(Boolean);

        setChartConfig((prev: any) => ({
          ...prev,
          columns: columnsFields,
          rows: rowsFields,
        }));
      }

      // Store result & stay in NLQ mode so the user can READ the interpretation
      setLatestNlqResult({ query, output: interpretation });
      toast.success('Chart configured! Click "View Chart" to see it.');
      // Do NOT switch to worksheet — let users read the interpretation first
    } catch (e: any) {
      toast.error('Failed to generate visualization: ' + e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormatChange = (format: FormatConfig) => {
    setFormatConfig(format);
  };

  const handleAnalyticsChange = (analytics: AnalyticsConfig) => {
    setAnalyticsConfig(analytics);
    toast.success('Analytics updated');
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

  const handleColorChange = (color: string) => {
    setSelectedColor(color);
  };

  const handleSizeChange = (value: number) => {
    setVisualizationSize(Math.max(1, Math.min(10, value)));
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
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={undoStack.length > 0}
          canRedo={redoStack.length > 0}
          onExport={handleExportChart}
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
                  latestResult={latestNlqResult}
                  onViewChart={() => setActiveMode('worksheet')}
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
                    onSelectType={handleChartTypeChange}
                    showAiRecommendedBadge={!!lastAppliedSuggestion}
                    aiRecommendedType={lastAppliedSuggestion?.type}
                  />
                </div>

                <div className="bg-white border-b px-3 py-2 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => applyQuickTemplate('distribution')}>Distribution Template</Button>
                  <Button variant="outline" size="sm" onClick={() => applyQuickTemplate('trend')}>Trend Template</Button>
                  <Button variant="outline" size="sm" onClick={() => applyQuickTemplate('summary')}>Summary Template</Button>
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
              <div className="mb-6 bg-white border rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Visualization Controls</h3>
                <div className="space-y-2">
                  <Label className="text-sm font-medium text-gray-700">Color Palette</Label>
                  <div className="flex flex-wrap items-center gap-2">
                    {colorPalette.map((paletteColor) => (
                      <button
                        key={paletteColor}
                        type="button"
                        className={`h-8 w-8 rounded-full border-2 ${selectedColor === paletteColor ? 'border-gray-900' : 'border-gray-200'}`}
                        style={{ backgroundColor: paletteColor }}
                        onClick={() => handleColorChange(paletteColor)}
                        aria-label={`Select color ${paletteColor}`}
                        title={paletteColor}
                      />
                    ))}
                    <div className="flex items-center gap-2 pl-1">
                      <Label htmlFor="custom-color" className="text-xs text-gray-600">Custom</Label>
                      <input
                        id="custom-color"
                        type="color"
                        value={selectedColor}
                        onChange={(e) => handleColorChange(e.target.value)}
                        className="h-8 w-10 cursor-pointer rounded border border-gray-300 bg-white p-1"
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="visualization-size" className="text-sm font-medium text-gray-700">Size</Label>
                  <div className="flex items-center gap-3">
                    <input
                      id="visualization-size"
                      type="range"
                      min="1"
                      max="10"
                      value={visualizationSize}
                      onChange={(e) => handleSizeChange(Number(e.target.value))}
                      className="w-full"
                    />
                    <span className="text-sm text-gray-600 w-8">{visualizationSize}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleSizeChange(3)}>Small</Button>
                    <Button variant="outline" size="sm" onClick={() => handleSizeChange(6)}>Medium</Button>
                    <Button variant="outline" size="sm" onClick={() => handleSizeChange(9)}>Large</Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleExportChart('png')}>Download PNG</Button>
                  <Button variant="outline" size="sm" onClick={() => handleExportChart('pdf')}>Download PDF</Button>
                  <Button size="sm" onClick={handleSaveProgress}>Save Progress</Button>
                  <Button variant="ghost" size="sm" onClick={handleNewCanvas}>New Canvas</Button>
                </div>
              </div>

              <div ref={canvasContainerRef}>
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
                      onExport={handleExportChart}
                      formatConfig={formatConfig}
                      chartDomId="active-worksheet-chart"
                      color={selectedColor}
                      size={visualizationSize}
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
                          onExport={handleExportChart}
                          formatConfig={viz.formatConfig || formatConfig}
                          color={selectedColor}
                          size={visualizationSize}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              </div>
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
                          if (viz.analyticsConfig) setAnalyticsConfig(viz.analyticsConfig);
                          if (viz.formatConfig) setFormatConfig(viz.formatConfig);
                          if (viz.filterConfig) setFilterConfig(viz.filterConfig);
                          if (viz.calculatedMetrics) setCalculatedMetrics(viz.calculatedMetrics);
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
                <div className="mt-4 space-y-3 p-3 border rounded-lg bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-700">Calculation Layer</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={metricDraft.left} onValueChange={(v) => setMetricDraft((p) => ({ ...p, left: v }))}>
                      <SelectTrigger><SelectValue placeholder="Left measure" /></SelectTrigger>
                      <SelectContent>
                        {numericFields.map((f) => <SelectItem key={`left-${f.name}`} value={f.name}>{f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={metricDraft.right} onValueChange={(v) => setMetricDraft((p) => ({ ...p, right: v }))}>
                      <SelectTrigger><SelectValue placeholder="Right measure" /></SelectTrigger>
                      <SelectContent>
                        {numericFields.map((f) => <SelectItem key={`right-${f.name}`} value={f.name}>{f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={metricDraft.operation} onValueChange={(v: any) => setMetricDraft((p) => ({ ...p, operation: v }))}>
                      <SelectTrigger><SelectValue placeholder="Operation" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="divide">Divide (/)</SelectItem>
                        <SelectItem value="add">Add (+)</SelectItem>
                        <SelectItem value="subtract">Subtract (-)</SelectItem>
                        <SelectItem value="multiply">Multiply (*)</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={metricDraft.name}
                      onChange={(e) => setMetricDraft((p) => ({ ...p, name: e.target.value }))}
                      placeholder="Metric name"
                    />
                  </div>
                  <Button size="sm" className="w-full" onClick={addCalculatedMetric}>Add Calculated Metric</Button>
                  {calculatedMetrics.length > 0 && (
                    <div className="space-y-1">
                      {calculatedMetrics.map((m) => (
                        <div key={m.id} className="flex items-center justify-between text-xs bg-white border rounded px-2 py-1">
                          <span>{m.name} = {m.left} {m.operation === 'divide' ? '/' : m.operation === 'add' ? '+' : m.operation === 'subtract' ? '-' : '*'} {m.right}</span>
                          <Button variant="ghost" size="sm" onClick={() => removeCalculatedMetric(m.id)}>Remove</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-3 p-3 border rounded-lg bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-700">Filters</h3>
                  <Select value={filterConfig.column || ''} onValueChange={(v) => setFilterConfig((p) => ({ ...p, column: v, mode: p.mode || 'category' }))}>
                    <SelectTrigger><SelectValue placeholder="Filter column" /></SelectTrigger>
                    <SelectContent>
                      {allFieldNames.map((name) => <SelectItem key={`fc-${name}`} value={name}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterConfig.mode || 'none'} onValueChange={(v: any) => setFilterConfig((p) => ({ ...p, mode: v }))}>
                    <SelectTrigger><SelectValue placeholder="Filter mode" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Filter</SelectItem>
                      <SelectItem value="category">Category</SelectItem>
                      <SelectItem value="range">Range</SelectItem>
                      <SelectItem value="contains">Contains Text</SelectItem>
                    </SelectContent>
                  </Select>
                  {filterConfig.mode === 'category' && (
                    <Select value={filterConfig.categoryValue || ''} onValueChange={(v) => setFilterConfig((p) => ({ ...p, categoryValue: v }))}>
                      <SelectTrigger><SelectValue placeholder="Select value" /></SelectTrigger>
                      <SelectContent>
                        {selectedFilterValues.map((v) => <SelectItem key={`fv-${v}`} value={v}>{v}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  {filterConfig.mode === 'contains' && (
                    <Input
                      value={filterConfig.containsValue || ''}
                      onChange={(e) => setFilterConfig((p) => ({ ...p, containsValue: e.target.value }))}
                      placeholder="Contains value"
                    />
                  )}
                  {filterConfig.mode === 'range' && (
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        type="number"
                        value={filterConfig.minValue ?? ''}
                        onChange={(e) => setFilterConfig((p) => ({ ...p, minValue: e.target.value === '' ? undefined : Number(e.target.value) }))}
                        placeholder="Min"
                      />
                      <Input
                        type="number"
                        value={filterConfig.maxValue ?? ''}
                        onChange={(e) => setFilterConfig((p) => ({ ...p, maxValue: e.target.value === '' ? undefined : Number(e.target.value) }))}
                        placeholder="Max"
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </DndProvider>
  );
}