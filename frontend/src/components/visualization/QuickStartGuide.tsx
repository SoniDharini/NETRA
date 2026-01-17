import { X, MousePointer2, Layout, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';

interface QuickStartGuideProps {
  onClose: () => void;
}

export function QuickStartGuide({ onClose }: QuickStartGuideProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[80vh] overflow-auto">
        <CardHeader className="border-b">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>Welcome to the Visualization Workspace</span>
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6 p-6">
          {/* Introduction */}
          <div>
            <p className="text-gray-600">
              Create powerful visualizations using our Tableau-like interface. Here's how to get started:
            </p>
          </div>

          {/* Step 1 */}
          <div className="flex space-x-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
              1
            </div>
            <div className="flex-1">
              <h3 className="text-gray-900 mb-2">Drag Fields to Build Charts</h3>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <MousePointer2 className="w-4 h-4 text-blue-600" />
                  <p className="text-blue-900">Drag & Drop</p>
                </div>
                <p className="text-blue-700">
                  From the <strong>Data panel</strong> (left), drag fields to the <strong>Columns</strong> and <strong>Rows</strong> shelves.
                  The chart updates automatically!
                </p>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-1.5"></div>
                  <p className="text-gray-600">
                    <span className="text-green-700">Green fields</span> are <strong>Dimensions</strong> (categories like "Region", "Product")
                  </p>
                </div>
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-1.5"></div>
                  <p className="text-gray-600">
                    <span className="text-blue-700">Blue fields</span> are <strong>Measures</strong> (numbers like "Sales", "Profit")
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="flex space-x-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center">
              2
            </div>
            <div className="flex-1">
              <h3 className="text-gray-900 mb-2">Choose Your Chart Type</h3>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Layout className="w-4 h-4 text-purple-600" />
                  <p className="text-purple-900">Chart Types</p>
                </div>
                <p className="text-purple-700">
                  Select from <strong>Bar</strong>, <strong>Line</strong>, <strong>Scatter</strong>, <strong>Pie</strong>, and more using the toolbar above the chart.
                </p>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="flex space-x-4">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
              3
            </div>
            <div className="flex-1">
              <h3 className="text-gray-900 mb-2">Try Natural Language Queries</h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <Sparkles className="w-4 h-4 text-green-600" />
                  <p className="text-green-900">Ask Data</p>
                </div>
                <p className="text-green-700 mb-3">
                  Click the <strong>"Ask Data"</strong> tab and type questions like:
                </p>
                <div className="space-y-1 text-green-800">
                  <div className="bg-white/50 px-3 py-2 rounded">
                    "Show sales by category"
                  </div>
                  <div className="bg-white/50 px-3 py-2 rounded">
                    "Compare profit across regions"
                  </div>
                  <div className="bg-white/50 px-3 py-2 rounded">
                    "Sales trend over time"
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h3 className="text-gray-900 mb-3">💡 Quick Tips</h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start space-x-2">
                <span className="text-blue-500">•</span>
                <span>Use <strong>Color</strong> and <strong>Size</strong> shelves to add more dimensions to your charts</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500">•</span>
                <span>Customize colors and formatting in the <strong>Format</strong> tab (right panel)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500">•</span>
                <span>Save your visualizations to include them in your final report</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-blue-500">•</span>
                <span>Remove fields from shelves by clicking the <strong>X</strong> icon</span>
              </li>
            </ul>
          </div>

          {/* Action Button */}
          <div className="flex justify-end">
            <Button onClick={onClose} size="lg">
              Got it, let's start!
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
