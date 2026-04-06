import { useState } from 'react';
import { Sparkles, Send, Loader2 } from 'lucide-react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { toast } from 'sonner@2.0.3';

import { apiService } from '../services/api.service';

interface NLQBarProps {
  onQuery?: (query: string, response: string) => void;
  placeholder?: string;
  suggestions?: string[];
  context?: string; // 'preprocessing', 'training', 'visualization', 'report'
  fileId?: string;
}

export function NLQBar({ 
  onQuery, 
  placeholder = 'Ask anything about your data...',
  suggestions = [],
  context = 'general',
  fileId
}: NLQBarProps) {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const defaultSuggestions = {
    preprocessing: [
      'Show me columns with missing values',
      'What are the outliers in this dataset?',
      'How many duplicates are there?',
    ],
    training: [
      'What model is best for my data?',
      'Explain the accuracy metric',
      'How can I improve model performance?',
    ],
    visualization: [
      'Show correlation between sales and profit',
      'Create a trend line for revenue',
      'Compare categories by region',
    ],
    report: [
      'Summarize key findings',
      'What are the main insights?',
      'Generate executive summary',
    ],
    general: [
      'What patterns do you see in my data?',
      'Explain this analysis',
      'What should I do next?',
    ]
  };

  const currentSuggestions = suggestions.length > 0 
    ? suggestions 
    : defaultSuggestions[context as keyof typeof defaultSuggestions] || defaultSuggestions.general;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsProcessing(true);

    try {
      let responseText = '';
      if (fileId) {
        const res = await apiService.processNLQ(fileId, query);
        if (res.success && res.data) {
          responseText = res.data.interpretation || 'No response generated.';
          toast.success('Query processed successfully');
        } else {
          responseText = res.error || 'Failed to process query on the server.';
          toast.error('Query processing failed');
        }
      } else {
        responseText = "No dataset file selected to query against.";
        toast.error('No dataset selected');
      }

      if (onQuery) {
        onQuery(query, responseText);
      }
    } catch (error: any) {
      toast.error('Query processing failed.');
    } finally {
      setIsProcessing(false);
      setQuery('');
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion);
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-r from-purple-50/50 to-blue-50/50">
      <CardContent className="pt-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-gray-900">AI Assistant</h3>
              <p className="text-gray-600">Ask questions in natural language</p>
            </div>
          </div>

          {/* Query Input */}
          <form onSubmit={handleSubmit} className="flex space-x-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              className="flex-1"
              disabled={isProcessing}
            />
            <Button type="submit" disabled={isProcessing || !query.trim()}>
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </form>

          {/* Suggestions */}
          {currentSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {currentSuggestions.map((suggestion, idx) => (
                <Badge
                  key={idx}
                  variant="secondary"
                  className="cursor-pointer hover:bg-purple-100 transition-colors"
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  {suggestion}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
