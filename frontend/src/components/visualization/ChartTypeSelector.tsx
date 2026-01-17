import { BarChart3, LineChart, ScatterChart, PieChart, AreaChart, Grid3x3, BarChart2, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { Badge } from '../ui/badge';

interface ChartTypeSelectorProps {
  selectedType: string;
  onSelectType: (type: string) => void;
  showAiRecommendedBadge?: boolean;
  aiRecommendedType?: string;
}

const chartTypes = [
  { id: 'bar', label: 'Bar Chart', icon: BarChart3 },
  { id: 'line', label: 'Line Chart', icon: LineChart },
  { id: 'scatter', label: 'Scatter Plot', icon: ScatterChart },
  { id: 'pie', label: 'Pie Chart', icon: PieChart },
  { id: 'area', label: 'Area Chart', icon: AreaChart },
  { id: 'histogram', label: 'Histogram', icon: BarChart2 },
  { id: 'heatmap', label: 'Heatmap', icon: Grid3x3 },
];

export function ChartTypeSelector({ 
  selectedType, 
  onSelectType,
  showAiRecommendedBadge = false,
  aiRecommendedType
}: ChartTypeSelectorProps) {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-gray-700 mr-2">Chart Type:</span>
      <TooltipProvider>
        <div className="flex space-x-1">
          {chartTypes.map((type) => {
            const Icon = type.icon;
            const isSelected = selectedType === type.id;
            const isAiRecommended = showAiRecommendedBadge && aiRecommendedType === type.id;

            return (
              <Tooltip key={type.id}>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <Button
                      variant={isSelected ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onSelectType(type.id)}
                      className={`${isSelected ? '' : 'hover:bg-gray-100'} ${
                        isAiRecommended ? 'ring-2 ring-blue-400 ring-offset-1' : ''
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </Button>
                    {isAiRecommended && (
                      <Badge 
                        variant="secondary" 
                        className="absolute -top-2 -right-2 h-4 px-1 bg-blue-500 text-white border-0"
                      >
                        <Sparkles className="w-3 h-3" />
                      </Badge>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{type.label}</p>
                  {isAiRecommended && (
                    <p className="text-blue-400 mt-1">✨ AI Recommended</p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>
    </div>
  );
}
