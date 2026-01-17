import { useState } from 'react';
import { MessageSquare, Sparkles, Send, Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from 'sonner@2.0.3';

interface NLQPanelProps {
  onQuerySubmit: (query: string) => void;
  isProcessing?: boolean;
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

export function NLQPanel({ onQuerySubmit, isProcessing = false }: NLQPanelProps) {
  const [query, setQuery] = useState('');
  const [queryHistory, setQueryHistory] = useState<string[]>([]);

  const handleSubmit = () => {
    if (!query.trim()) {
      toast.error('Please enter a query');
      return;
    }

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
          <CardTitle className="flex items-center space-x-2">
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
              onKeyPress={(e) => e.key === 'Enter' && !isProcessing && handleSubmit()}
              disabled={isProcessing}
              className="bg-white"
            />
            <Button
              onClick={handleSubmit}
              disabled={isProcessing || !query.trim()}
            >
              {isProcessing ? (
                <Sparkles className="w-4 h-4 animate-pulse" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          <div className="flex items-start space-x-2 text-blue-700 bg-blue-100/50 p-3 rounded-lg">
            <Lightbulb className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <p className="text-blue-800">
              Ask questions in natural language. Try questions like "Show me..." or "Compare..."
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Query Suggestions */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-4 h-4" />
            <span>Suggested Questions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {QUERY_SUGGESTIONS.map((suggestion, idx) => (
                <Badge
                  key={idx}
                  variant="outline"
                  className={`cursor-pointer w-full justify-start py-2 px-3 transition-colors ${getCategoryColor(
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
          <CardHeader className="pb-3">
            <CardTitle>Recent Queries</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {queryHistory.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => setQuery(q)}
                  >
                    <p className="text-gray-900 truncate">{q}</p>
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
