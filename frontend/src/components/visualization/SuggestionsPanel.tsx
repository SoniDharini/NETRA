import { useState } from 'react';
import { Sparkles, TrendingUp, BarChart3, PieChart, LineChart, ScatterChart, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';

interface VisualizationSuggestion {
  id: string;
  type: 'bar' | 'line' | 'scatter' | 'pie' | 'area' | 'histogram' | 'heatmap';
  title: string;
  description: string;
  reason: string;
  recommended: boolean;
  config: {
    columns: string[];
    rows: string[];
    color?: string;
    size?: string;
  };
  previewUrl?: string;
}

interface SuggestionsPanelProps {
  suggestions: VisualizationSuggestion[];
  onSelectSuggestion: (suggestion: VisualizationSuggestion) => void;
  onDismiss: () => void;
  isLoading?: boolean;
}

const CHART_ICONS = {
  bar: BarChart3,
  line: LineChart,
  scatter: ScatterChart,
  pie: PieChart,
  area: LineChart,
  histogram: BarChart3,
  heatmap: BarChart3,
};

export function SuggestionsPanel({ suggestions, onSelectSuggestion, onDismiss, isLoading }: SuggestionsPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleSelect = (suggestion: VisualizationSuggestion) => {
    setSelectedId(suggestion.id);
    onSelectSuggestion(suggestion);
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-blue-600 animate-pulse" />
              <span>AI Analyzing Your Data...</span>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-20 w-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  const recommendedSuggestions = suggestions.filter(s => s.recommended);
  const otherSuggestions = suggestions.filter(s => !s.recommended);

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-purple-50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>AI-Suggested Visualizations</span>
            </CardTitle>
            <CardDescription className="mt-1">
              Based on your data characteristics, we recommend these visualizations
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onDismiss}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-3">
            {/* Recommended Suggestions */}
            {recommendedSuggestions.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <h3 className="text-gray-900">Recommended</h3>
                </div>
                <div className="space-y-2">
                  {recommendedSuggestions.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      isSelected={selectedId === suggestion.id}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Other Suggestions */}
            {otherSuggestions.length > 0 && (
              <div className="mt-4">
                <h3 className="text-gray-900 mb-3">More Options</h3>
                <div className="space-y-2">
                  {otherSuggestions.map((suggestion) => (
                    <SuggestionCard
                      key={suggestion.id}
                      suggestion={suggestion}
                      isSelected={selectedId === suggestion.id}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

interface SuggestionCardProps {
  suggestion: VisualizationSuggestion;
  isSelected: boolean;
  onSelect: (suggestion: VisualizationSuggestion) => void;
}

function SuggestionCard({ suggestion, isSelected, onSelect }: SuggestionCardProps) {
  const Icon = CHART_ICONS[suggestion.type] || BarChart3;

  return (
    <div
      className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-blue-300'
      } ${suggestion.recommended ? 'ring-2 ring-green-500/20' : ''}`}
      onClick={() => onSelect(suggestion)}
    >
      <div className="flex items-start space-x-3">
        <div className={`p-2 rounded-lg ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
          <Icon className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="text-gray-900">{suggestion.title}</h4>
            {suggestion.recommended && (
              <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-300">
                <Sparkles className="w-3 h-3 mr-1" />
                Best Match
              </Badge>
            )}
            <Badge variant="outline" className="capitalize">
              {suggestion.type}
            </Badge>
          </div>
          
          <p className="text-gray-600 mb-2">
            {suggestion.description}
          </p>
          
          <div className="flex items-start space-x-2 text-blue-700 bg-blue-50 p-2 rounded">
            <Sparkles className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <p className="text-blue-800">
              <strong>Why:</strong> {suggestion.reason}
            </p>
          </div>

          {/* Show fields that will be used */}
          <div className="mt-2 flex flex-wrap gap-1">
            {suggestion.config.columns.map((col, idx) => (
              <Badge key={`col-${idx}`} variant="secondary" className="text-green-700 bg-green-50">
                📊 {col}
              </Badge>
            ))}
            {suggestion.config.rows.map((row, idx) => (
              <Badge key={`row-${idx}`} variant="secondary" className="text-blue-700 bg-blue-50">
                📈 {row}
              </Badge>
            ))}
          </div>
        </div>

        <Button
          variant={isSelected ? 'default' : 'outline'}
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(suggestion);
          }}
        >
          {isSelected ? 'Applied' : 'Use This'}
        </Button>
      </div>
    </div>
  );
}
