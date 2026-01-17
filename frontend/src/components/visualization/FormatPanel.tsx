import { useState } from 'react';
import { Palette, Type, Grid3x3, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Separator } from '../ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface FormatPanelProps {
  onFormatChange: (format: FormatConfig) => void;
}

export interface FormatConfig {
  colorScheme: string;
  fontSize: number;
  showGridLines: boolean;
  showLegend: boolean;
  showLabels: boolean;
  chartOpacity: number;
}

const COLOR_SCHEMES = [
  { value: 'default', label: 'Default', colors: ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'] },
  { value: 'cool', label: 'Cool', colors: ['#06b6d4', '#3b82f6', '#8b5cf6', '#6366f1'] },
  { value: 'warm', label: 'Warm', colors: ['#f59e0b', '#f97316', '#ef4444', '#ec4899'] },
  { value: 'earth', label: 'Earth', colors: ['#78716c', '#a3a3a3', '#737373', '#525252'] },
  { value: 'ocean', label: 'Ocean', colors: ['#06b6d4', '#0891b2', '#0e7490', '#155e75'] },
  { value: 'forest', label: 'Forest', colors: ['#10b981', '#059669', '#047857', '#065f46'] },
];

export function FormatPanel({ onFormatChange }: FormatPanelProps) {
  const [config, setConfig] = useState<FormatConfig>({
    colorScheme: 'default',
    fontSize: 12,
    showGridLines: true,
    showLegend: true,
    showLabels: true,
    chartOpacity: 100,
  });

  const updateConfig = (updates: Partial<FormatConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onFormatChange(newConfig);
  };

  return (
    <Tabs defaultValue="colors" className="w-full">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="colors">
          <Palette className="w-4 h-4 mr-1" />
          Colors
        </TabsTrigger>
        <TabsTrigger value="text">
          <Type className="w-4 h-4 mr-1" />
          Text
        </TabsTrigger>
        <TabsTrigger value="display">
          <Eye className="w-4 h-4 mr-1" />
          Display
        </TabsTrigger>
      </TabsList>

      <TabsContent value="colors" className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Color Scheme</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select
              value={config.colorScheme}
              onValueChange={(value) => updateConfig({ colorScheme: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COLOR_SCHEMES.map((scheme) => (
                  <SelectItem key={scheme.value} value={scheme.value}>
                    <div className="flex items-center space-x-2">
                      <div className="flex space-x-1">
                        {scheme.colors.map((color, idx) => (
                          <div
                            key={idx}
                            className="w-4 h-4 rounded"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <span>{scheme.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Opacity</CardTitle>
          </CardHeader>
          <CardContent>
            <Label className="mb-2 block">
              Chart Opacity: {config.chartOpacity}%
            </Label>
            <Slider
              value={[config.chartOpacity]}
              onValueChange={([value]) => updateConfig({ chartOpacity: value })}
              min={0}
              max={100}
              step={5}
            />
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="text" className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Font Size</CardTitle>
          </CardHeader>
          <CardContent>
            <Label className="mb-2 block">
              Size: {config.fontSize}px
            </Label>
            <Slider
              value={[config.fontSize]}
              onValueChange={([value]) => updateConfig({ fontSize: value })}
              min={8}
              max={24}
              step={1}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Labels</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-labels">Show Data Labels</Label>
              <Switch
                id="show-labels"
                checked={config.showLabels}
                onCheckedChange={(checked) => updateConfig({ showLabels: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="display" className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Chart Elements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-grid">Show Grid Lines</Label>
              <Switch
                id="show-grid"
                checked={config.showGridLines}
                onCheckedChange={(checked) => updateConfig({ showGridLines: checked })}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <Label htmlFor="show-legend">Show Legend</Label>
              <Switch
                id="show-legend"
                checked={config.showLegend}
                onCheckedChange={(checked) => updateConfig({ showLegend: checked })}
              />
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
