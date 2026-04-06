import { useState } from 'react';
import { MessageSquare, Sparkles, Send, Lightbulb, ArrowRight, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';

interface NLQPanelProps {
  onQuerySubmit: (query: string) => void;
  isProcessing?: boolean;
  latestResult?: { query: string; output: string } | null;
  onViewChart?: () => void;
}

interface QuerySuggestion {
  text: string;
  category: 'comparison' | 'trend' | 'distribution' | 'correlation';
}

const QUERY_SUGGESTIONS: QuerySuggestion[] = [
  { text: 'Show sales by category', category: 'comparison' },
  { text: 'Compare profit across regions', category: 'comparison' },
  { text: 'Sales trend over time', category: 'trend' },
  { text: 'Distribution of quantities', category: 'distribution' },
  { text: 'Correlation between sales and profit', category: 'correlation' },
  { text: 'Top 10 products by revenue', category: 'comparison' },
  { text: 'Average discount by region', category: 'comparison' },
  { text: 'Monthly sales growth', category: 'trend' },
];

export function NLQPanel({ onQuerySubmit, isProcessing = false, latestResult = null, onViewChart }: NLQPanelProps) {
  const [query, setQuery] = useState('');
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!query.trim()) return;
    setQueryHistory(prev => [query, ...prev].slice(0, 10));
    onQuerySubmit(query);
    setQuery('');
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'comparison':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
      case 'trend':
        return 'bg-purple-100 text-purple-700 hover:bg-purple-200';
      case 'distribution':
        return 'bg-green-100 text-green-700 hover:bg-green-200';
      case 'correlation':
        return 'bg-orange-100 text-orange-700 hover:bg-orange-200';
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Query Input */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <MessageSquare className="w-4 h-4 text-blue-600" />
            <span>Ask Your Data</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex space-x-2">
            <Input
              placeholder="e.g., 'Show sales by region for Q1'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !isProcessing && handleSubmit()}
              disabled={isProcessing}
              className="bg-white text-sm"
            />
            <Button
              onClick={handleSubmit}
              disabled={isProcessing || !query.trim()}
              size="sm"
            >
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="flex items-start space-x-2 text-blue-700 bg-blue-100/50 p-2 rounded-lg">
            <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-800">
              Ask in natural language. The chart will be configured automatically.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Latest Result - shown prominently */}
      {latestResult && (
        <Card className="border-emerald-300 bg-emerald-50/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2 text-emerald-700">
              <Sparkles className="w-4 h-4" />
              AI Interpretation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-xs text-emerald-600 uppercase tracking-wide font-medium mb-1">Your query</p>
              <p className="text-sm text-gray-700 italic">"{latestResult.query}"</p>
            </div>
            <div>
              <p className="text-xs text-emerald-600 uppercase tracking-wide font-medium mb-1">AI says</p>
              <p className="text-sm text-gray-800 leading-relaxed">{latestResult.output}</p>
            </div>
            {onViewChart && (
              <Button
                size="sm"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={onViewChart}
              >
                View Generated Chart
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Query Suggestions */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center space-x-2 text-sm">
            <Sparkles className="w-4 h-4" />
            <span>Suggested Questions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-1.5">
              {QUERY_SUGGESTIONS.map((suggestion, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className={`cursor-pointer w-full justify-start py-1.5 px-2 transition-colors text-xs ${getCategoryColor(
                    suggestion.category
                  )}`}
                  onClick={() => handleSuggestionClick(suggestion.text)}
                >
                  {suggestion.text}
                </Badge>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Query History */}
      {queryHistory.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-24">
              <div className="space-y-1.5">
                {queryHistory.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-1.5 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setQuery(q)}
                  >
                    <p className="text-xs text-gray-700 truncate">{q}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
