import { Save, Download, Home, Undo, Redo, Share2, HelpCircle, Sparkles } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';

interface VisualizationToolbarProps {
  onNavigate: (section: any) => void;
  onSave: () => void;
  savedCount: number;
  onShowHelp?: () => void;
  onShowSuggestions?: () => void;
  suggestionsCount?: number;
}

export function VisualizationToolbar({ 
  onNavigate, 
  onSave, 
  savedCount, 
  onShowHelp,
  onShowSuggestions,
  suggestionsCount = 0 
}: VisualizationToolbarProps) {
  return (
    <div className="bg-white border-b px-4 py-2 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onNavigate('dashboard')}
        >
          <Home className="w-4 h-4 mr-2" />
          Dashboard
        </Button>
        
        <Separator orientation="vertical" className="h-6" />

        <Button variant="ghost" size="sm">
          <Undo className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <Redo className="w-4 h-4" />
        </Button>

        <Separator orientation="vertical" className="h-6" />

        {onShowSuggestions && suggestionsCount > 0 && (
          <Button 
            variant="outline" 
            size="sm"
            onClick={onShowSuggestions}
            className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-300 hover:from-blue-100 hover:to-purple-100"
          >
            <Sparkles className="w-4 h-4 mr-2 text-blue-600" />
            AI Suggestions ({suggestionsCount})
          </Button>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {savedCount > 0 && (
          <Badge variant="secondary" className="mr-2">
            {savedCount} saved
          </Badge>
        )}

        {onShowHelp && (
          <Button variant="ghost" size="sm" onClick={onShowHelp}>
            <HelpCircle className="w-4 h-4 mr-2" />
            Help
          </Button>
        )}
        
        <Button variant="outline" size="sm">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
        
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
        
        <Button size="sm" onClick={onSave}>
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>
      </div>
    </div>
  );
}
