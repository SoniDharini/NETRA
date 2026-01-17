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

interface ChartCanvasProps {
  config: ChartConfig;
  chartType: string;
  data: any[];
  onExport: () => void;
}

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#6366f1', '#f43f5e'];

export function ChartCanvas({ config, chartType, data, onExport }: ChartCanvasProps) {
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

  // Render the appropriate chart based on type
  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">No data available for visualization</p>
        </div>
      );
    }

    switch (chartType) {
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={xField} stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px' 
                }} 
              />
              <Legend />
              {config.rows.map((row, idx) => (
                <Bar
                  key={row.name}
                  dataKey={row.name}
                  fill={COLORS[idx % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={xField} stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px' 
                }} 
              />
              <Legend />
              {config.rows.map((row, idx) => (
                <Line
                  key={row.name}
                  type="monotone"
                  dataKey={row.name}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: COLORS[idx % COLORS.length], r: 4 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'area':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={xField} stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px' 
                }} 
              />
              <Legend />
              {config.rows.map((row, idx) => (
                <Area
                  key={row.name}
                  type="monotone"
                  dataKey={row.name}
                  fill={COLORS[idx % COLORS.length]}
                  stroke={COLORS[idx % COLORS.length]}
                  fillOpacity={0.6}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );

      case 'scatter':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={xField} name={xField} stroke="#6b7280" />
              <YAxis dataKey={yField} name={yField} stroke="#6b7280" />
              <Tooltip 
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px' 
                }} 
              />
              <Legend />
              <Scatter
                name={`${xField} vs ${yField}`}
                data={chartData}
                fill="#3b82f6"
              />
            </ScatterChart>
          </ResponsiveContainer>
        );

      case 'pie':
        // For pie chart, use the first measure
        const pieDataKey = config.rows[0]?.name || yField;
        return (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey={pieDataKey}
                nameKey={xField}
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={(entry) => entry[xField]}
                labelLine={true}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px' 
                }} 
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'histogram':
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={xField} stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px' 
                }} 
              />
              <Legend />
              <Bar
                dataKey={yField}
                fill="#3b82f6"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      default:
        return (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={xField} stroke="#6b7280" />
              <YAxis stroke="#6b7280" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'white', 
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px' 
                }} 
              />
              <Legend />
              {config.rows.map((row, idx) => (
                <Bar
                  key={row.name}
                  dataKey={row.name}
                  fill={COLORS[idx % COLORS.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );
    }
  };

  return (
    <Card className="flex-1 flex flex-col min-h-[500px]">
      <div className="p-4 border-b flex items-center justify-between bg-white">
        <div>
          <h3 className="text-gray-900">
            {chartType.charAt(0).toUpperCase() + chartType.slice(1)} Chart
          </h3>
          <p className="text-gray-500">
            {xField && yField ? `${xField} vs ${yField}` : 'Configure axes to see visualization'}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Maximize2 className="w-4 h-4 mr-2" />
            Fullscreen
          </Button>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      <CardContent className="flex-1 p-6">
        {renderChart()}
      </CardContent>
    </Card>
  );
}
