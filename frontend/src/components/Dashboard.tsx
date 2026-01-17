import { Upload, Settings, Brain, BarChart3, CheckCircle2, Circle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { ProjectData } from '../App';

interface DashboardProps {
  onNavigate: (section: any) => void;
  projectData: ProjectData;
}

export function Dashboard({ onNavigate, projectData }: DashboardProps) {
  const steps = [
    { id: 'upload', label: 'Upload Data', icon: Upload },
    { id: 'preprocessing', label: 'Preprocess Data', icon: Settings },
    { id: 'training', label: 'Train Model', icon: Brain },
    { id: 'visualization', label: 'Visualize Results', icon: BarChart3 },
  ];

  const completedCount = steps.filter(step => projectData.completedSteps.has(step.id)).length;
  const progressPercentage = (completedCount / steps.length) * 100;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="mb-2">Welcome to Netra</h1>
        <p className="text-muted-foreground">
          Follow the step-by-step workflow to analyze your data and build machine learning models.
        </p>
      </div>

      {/* Progress Tracker */}
      <Card>
        <CardHeader>
          <CardTitle>Project Progress</CardTitle>
          <CardDescription>Track your analysis workflow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Overall Progress</span>
              <span>{completedCount} of {steps.length} steps completed</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>

          <div className="grid gap-4">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = projectData.completedSteps.has(step.id);

              return (
                <div
                  key={step.id}
                  className="flex items-center space-x-4 p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4 text-gray-600" />
                      <span className="text-gray-900">Step {index + 1}: {step.label}</span>
                    </div>
                    {isCompleted && (
                      <p className="text-gray-500 mt-1">Completed</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="border-blue-200 bg-blue-50/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="w-5 h-5 text-blue-600" />
              <span>Start New Analysis</span>
            </CardTitle>
            <CardDescription>Upload your dataset to begin</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => onNavigate('upload')} className="w-full">
              Upload Data
            </Button>
          </CardContent>
        </Card>

        {projectData.fileName && (
          <Card className="border-purple-200 bg-purple-50/50">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Your latest work</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Dataset:</span>
                <span className="text-gray-900">{projectData.fileName}</span>
              </div>
              {projectData.selectedModel && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Model:</span>
                  <span className="text-gray-900">{projectData.selectedModel}</span>
                </div>
              )}
              {projectData.modelMetrics?.accuracy && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Accuracy:</span>
                  <span className="text-gray-900">{(projectData.modelMetrics.accuracy * 100).toFixed(1)}%</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}