import { useState } from 'react';
import { TrendingUp, Calculator, Filter, Sigma } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Separator } from '../ui/separator';
import { Slider } from '../ui/slider';

interface AnalyticsPanelProps {
  onApplyAnalytics: (analytics: AnalyticsConfig) => void;
}

export interface AnalyticsConfig {
  showTrendLine: boolean;
  showAverage: boolean;
  showMedian: boolean;
  aggregation: 'sum' | 'average' | 'count' | 'min' | 'max';
  filterType?: 'top' | 'bottom';
  filterCount?: number;
}

export function AnalyticsPanel({ onApplyAnalytics }: AnalyticsPanelProps) {
  const [config, setConfig] = useState<AnalyticsConfig>({
    showTrendLine: false,
    showAverage: false,
    showMedian: false,
    aggregation: 'sum',
  });

  const updateConfig = (updates: Partial<AnalyticsConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onApplyAnalytics(newConfig);
  };

  return (
    <div className="space-y-4">
      {/* Aggregation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <Sigma className="w-4 h-4" />
            <span>Aggregation</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Measure Calculation</Label>
            <Select
              value={config.aggregation}
              onValueChange={(value: any) => updateConfig({ aggregation: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sum">Sum</SelectItem>
                <SelectItem value="average">Average</SelectItem>
                <SelectItem value="count">Count</SelectItem>
                <SelectItem value="min">Minimum</SelectItem>
                <SelectItem value="max">Maximum</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Analytics */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4" />
            <span>Analytics</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="trend-line"
              checked={config.showTrendLine}
              onCheckedChange={(checked) =>
                updateConfig({ showTrendLine: checked as boolean })
              }
            />
            <Label htmlFor="trend-line" className="cursor-pointer">
              Show Trend Line
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="average-line"
              checked={config.showAverage}
              onCheckedChange={(checked) =>
                updateConfig({ showAverage: checked as boolean })
              }
            />
            <Label htmlFor="average-line" className="cursor-pointer">
              Show Average Line
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="median-line"
              checked={config.showMedian}
              onCheckedChange={(checked) =>
                updateConfig({ showMedian: checked as boolean })
              }
            />
            <Label htmlFor="median-line" className="cursor-pointer">
              Show Median Line
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Show Top/Bottom</Label>
            <Select
              value={config.filterType || 'none'}
              onValueChange={(value: any) =>
                updateConfig({ filterType: value === 'none' ? undefined : value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="No filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No filter</SelectItem>
                <SelectItem value="top">Top N</SelectItem>
                <SelectItem value="bottom">Bottom N</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {config.filterType && (
            <div>
              <Label>Number of Items: {config.filterCount || 10}</Label>
              <Slider
                value={[config.filterCount || 10]}
                onValueChange={([value]) => updateConfig({ filterCount: value })}
                min={1}
                max={50}
                step={1}
                className="mt-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="w-4 h-4" />
            <span>Quick Stats</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Records:</span>
              <span className="text-gray-900">-</span>
            </div>
            <Separator />
            <div className="flex justify-between">
              <span className="text-gray-600">Fields Used:</span>
              <span className="text-gray-900">-</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
