import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Download, Maximize2 } from 'lucide-react';
import { ChartConfig, FieldItem } from '../Visualization';
import { FormatConfig } from './FormatPanel';

interface ChartCanvasProps {
  config: ChartConfig;
  chartType: string;
  data: any[];
  onExport: (format?: 'png' | 'pdf' | 'json') => void;
  formatConfig?: FormatConfig;
  chartDomId?: string;
  color?: string;
  size?: number;
}

const COLOR_SCHEME_MAP: Record<string, string[]> = {
  default: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#f43f5e'],
  cool: ['#06b6d4', '#3b82f6', '#8b5cf6', '#6366f1', '#0ea5e9', '#14b8a6'],
  warm: ['#f59e0b', '#f97316', '#ef4444', '#ec4899', '#fb7185', '#f43f5e'],
  earth: ['#78716c', '#a3a3a3', '#737373', '#525252', '#a8a29e', '#44403c'],
  ocean: ['#06b6d4', '#0891b2', '#0e7490', '#155e75', '#0284c7', '#0369a1'],
  forest: ['#10b981', '#059669', '#047857', '#065f46', '#22c55e', '#16a34a'],
};

export function ChartCanvas({ config, chartType, data, onExport, formatConfig, chartDomId, color, size = 5 }: ChartCanvasProps) {
  // Helper to get field names
  const getFieldName = (field: FieldItem | undefined) => field?.name || '';
  
  // Determine if we have enough data to render
  const hasRows = config.rows.length > 0;
  const hasColumns = config.columns.length > 0;

  // Get the primary fields for axes
  const xField = config.columns[0]?.name || '';
  const yField = config.rows[0]?.name || '';
  const colorField = config.color?.name;
  const sizeField = config.size?.name;

  // Filter and prepare data if needed
  const chartData = data.length > 0 ? data : [];
  const chartOpacity = (formatConfig?.chartOpacity ?? 100) / 100;
  const colors = COLOR_SCHEME_MAP[formatConfig?.colorScheme || 'default'] || COLOR_SCHEME_MAP.default;
  const primaryColor = color || colors[0];
  const resolvedSize = Math.max(1, Math.min(10, size));
  const axisTickStyle = { fontSize: formatConfig?.fontSize ?? 12 };

  // Empty state
  if (!hasRows && !hasColumns) {
    return (
      <Card className="flex-1 flex items-center justify-center min-h-[500px]">
        <CardContent className="text-center p-8">
          <div className="text-gray-400 mb-4">
            <svg
              className="w-24 h-24 mx-auto mb-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
              />
            </svg>
          </div>
          <h3 className="text-gray-900 mb-2">No Data to Display</h3>
          <p className="text-gray-500">
            Drag and drop fields from the Data panel to the Rows and Columns shelves to create a visualization
          </p>
        </CardContent>
      </Card>
    );
  }

  // Explicit height required for Recharts ResponsiveContainer (100% fails in flex layouts)
  const CHART_HEIGHT = 220 + resolvedSize * 28;

  // Render the appropriate chart based on type
  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center" style={{ height: CHART_HEIGHT }}>
          <p className="text-gray-500">No data available for visualization</p>
        </div>
      );
    }

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart data={chartData}>
              {formatConfig?.showGridLines !== false && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
              <XAxis dataKey={xField} stroke="#6b7280" tick={axisTickStyle} />
              <YAxis stroke="#6b7280" tick={axisTickStyle} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px' 
                }} 
              />
              {formatConfig?.showLegend !== false && <Legend />}
              {config.rows.map((row, idx) => (
                <Bar
                  key={row.name}
                  dataKey={row.name}
                  fill={idx === 0 ? primaryColor : colors[idx % colors.length]}
                  fillOpacity={chartOpacity}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <LineChart data={chartData}>
              {formatConfig?.showGridLines !== false && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
              <XAxis dataKey={xField} stroke="#6b7280" tick={axisTickStyle} />
              <YAxis stroke="#6b7280" tick={axisTickStyle} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px' 
                }} 
              />
              {formatConfig?.showLegend !== false && <Legend />}
              {config.rows.map((row, idx) => (
                <Line
                  key={row.name}
                  type="monotone"
                  dataKey={row.name}
                  stroke={idx === 0 ? primaryColor : colors[idx % colors.length]}
                  strokeOpacity={chartOpacity}
                  strokeWidth={2}
                  dot={{ fill: idx === 0 ? primaryColor : colors[idx % colors.length], r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <AreaChart data={chartData}>
              {formatConfig?.showGridLines !== false && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
              <XAxis dataKey={xField} stroke="#6b7280" tick={axisTickStyle} />
              <YAxis stroke="#6b7280" tick={axisTickStyle} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px' 
                }} 
              />
              {formatConfig?.showLegend !== false && <Legend />}
              {config.rows.map((row, idx) => (
                <Area
                  key={row.name}
                  type="monotone"
                  dataKey={row.name}
                  fill={idx === 0 ? primaryColor : colors[idx % colors.length]}
                  stroke={idx === 0 ? primaryColor : colors[idx % colors.length]}
                  fillOpacity={Math.max(0.1, chartOpacity * 0.6)}
                  strokeOpacity={chartOpacity}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <ScatterChart>
              {formatConfig?.showGridLines !== false && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
              <XAxis dataKey={xField} name={xField} stroke="#6b7280" tick={axisTickStyle} />
              <YAxis dataKey={yField} name={yField} stroke="#6b7280" tick={axisTickStyle} />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px' 
                }} 
              />
              {formatConfig?.showLegend !== false && <Legend />}
              <Scatter
                name={`${xField} vs ${yField}`}
                data={chartData}
                fill={primaryColor}
                fillOpacity={chartOpacity}
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'pie':
        // For pie chart, use the first measure or 'value' (from getProcessedData count aggregation)
        const pieDataKey = config.rows[0]?.name || yField || 'value';
        return (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <PieChart>
              <Pie
                data={chartData}
                dataKey={pieDataKey}
                nameKey={xField}
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={formatConfig?.showLabels !== false ? (entry) => entry[xField] : false}
                labelLine={formatConfig?.showLabels !== false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={color || colors[index % colors.length]} fillOpacity={chartOpacity} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px' 
                }} 
              />
              {formatConfig?.showLegend !== false && <Legend />}
            </PieChart>
          </ResponsiveContainer>
        );

      case 'histogram':
        // Histogram uses 'count' when rows is empty (frequency distribution)
        const histDataKey = yField || 'count';
        return (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart data={chartData}>
              {formatConfig?.showGridLines !== false && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
              <XAxis dataKey={xField} stroke="#6b7280" tick={axisTickStyle} />
              <YAxis stroke="#6b7280" tick={axisTickStyle} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px' 
                }} 
              />
              {formatConfig?.showLegend !== false && <Legend />}
              <Bar
                dataKey={histDataKey}
                fill={primaryColor}
                fillOpacity={chartOpacity}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
            <BarChart data={chartData}>
              {formatConfig?.showGridLines !== false && <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />}
              <XAxis dataKey={xField} stroke="#6b7280" tick={axisTickStyle} />
              <YAxis stroke="#6b7280" tick={axisTickStyle} />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px' 
                }} 
              />
              {formatConfig?.showLegend !== false && <Legend />}
              {config.rows.map((row, idx) => (
                <Bar
                  key={row.name}
                  dataKey={row.name}
                  fill={idx === 0 ? primaryColor : colors[idx % colors.length]}
                  fillOpacity={chartOpacity}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card className="flex-1 flex flex-col min-h-[500px]" id={chartDomId}>
      <div className="p-4 border-b flex items-center justify-between bg-white">
        <div>
          <h3 className="text-gray-900">
            {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart
          </h3>
          <p className="text-gray-500">
            {xField && (yField || chartType === 'histogram') ? `${xField} vs ${yField || 'count'}` : 'Configure axes to see visualization'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Maximize2 className="w-4 h-4 mr-2" />
            Fullscreen
          </Button>
          <Button variant="outline" size="sm" onClick={() => onExport('png')}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      <CardContent className="flex-1 p-6 min-h-[280px] flex flex-col">
        <div className="flex-1 min-h-[240px] w-full">
          {renderChart()}
        </div>
      </CardContent>
    </Card>
  );
}
