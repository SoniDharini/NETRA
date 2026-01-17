import { useState } from 'react';
import { Brain, Upload, ArrowRight, Loader2, CheckCircle, TrendingUp, FileUp, X } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { toast } from 'sonner@2.0.3';
import { ProjectData } from '../App';
import { NLQBar } from './NLQBar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface ModelTrainingProps {
  onNavigate: (section: any) => void;
  projectData: ProjectData;
  updateProjectData: (data: Partial<ProjectData>) => void;
  markStepComplete: (step: string) => void;
}

export function ModelTraining({ onNavigate, projectData, updateProjectData, markStepComplete }: ModelTrainingProps) {
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [testSize, setTestSize] = useState([20]);
  const [modelMetrics, setModelMetrics] = useState<any>(null);
  const [uploadedModelFile, setUploadedModelFile] = useState<File | null>(null);
  const [modelSource, setModelSource] = useState<'builtin' | 'upload'>('builtin');

  const models = [
    {
      id: 'logistic_regression',
      name: 'Logistic Regression',
      description: 'Fast and interpretable for binary classification',
      recommended: true,
      icon: Brain,
    },
    {
      id: 'random_forest',
      name: 'Random Forest',
      description: 'Robust ensemble method for various tasks',
      recommended: true,
      icon: Brain,
    },
    {
      id: 'svm',
      name: 'Support Vector Machine',
      description: 'Powerful for high-dimensional data',
      recommended: false,
      icon: Brain,
    },
    {
      id: 'neural_network',
      name: 'Neural Network',
      description: 'Deep learning for complex patterns',
      recommended: false,
      icon: Brain,
    },
  ];

  const handleTrain = async () => {
    if (!selectedModel) {
      toast.error('Please select a model to train');
      return;
    }

    if (!projectData.fileName) {
      toast.error('No data available for training');
      return;
    }

    setIsTraining(true);
    setTrainingProgress(0);

    // Simulate training progress
    const progressInterval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 400);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 4000));

      clearInterval(progressInterval);
      setTrainingProgress(100);

      // Mock metrics
      const metrics = {
        accuracy: 0.87 + Math.random() * 0.1,
        precision: 0.85 + Math.random() * 0.1,
        recall: 0.83 + Math.random() * 0.1,
        loss: 0.15 + Math.random() * 0.05,
      };

      setModelMetrics(metrics);
      updateProjectData({
        selectedModel,
        modelMetrics: metrics,
        trainingId: `training_${Date.now()}`,
      });

      setIsComplete(true);
      toast.success('Model training completed successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to train model');
    } finally {
      setIsTraining(false);
    }
  };

  const handleContinue = () => {
    markStepComplete('training');
    onNavigate('visualization');
  };

  const handleModelFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type (accept common model formats)
    const validExtensions = ['.pkl', '.h5', '.pt', '.pth', '.joblib', '.model', '.pkl.gz'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    
    if (!validExtensions.some(ext => file.name.toLowerCase().endsWith(ext))) {
      toast.error('Invalid file format. Please upload a valid model file (.pkl, .h5, .pt, .joblib)');
      return;
    }

    setUploadedModelFile(file);
    setModelSource('upload');
    setSelectedModel('custom_uploaded');
    toast.success(`Model file "${file.name}" uploaded successfully!`);
  };

  const handleRemoveUploadedModel = () => {
    setUploadedModelFile(null);
    setSelectedModel('');
    toast.info('Uploaded model removed');
  };

  const handleTrainWithUploadedModel = async () => {
    if (!uploadedModelFile) {
      toast.error('Please upload a model file');
      return;
    }

    if (!projectData.fileName) {
      toast.error('No data available for training');
      return;
    }

    setIsTraining(true);
    setTrainingProgress(0);

    // Simulate training progress
    const progressInterval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 400);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 4000));

      clearInterval(progressInterval);
      setTrainingProgress(100);

      // Mock metrics for uploaded model
      const metrics = {
        accuracy: 0.89 + Math.random() * 0.08,
        precision: 0.87 + Math.random() * 0.08,
        recall: 0.85 + Math.random() * 0.08,
        loss: 0.12 + Math.random() * 0.05,
      };

      setModelMetrics(metrics);
      updateProjectData({
        selectedModel: `custom_${uploadedModelFile.name}`,
        modelMetrics: metrics,
        trainingId: `training_${Date.now()}`,
      });

      setIsComplete(true);
      toast.success('Custom model training completed successfully!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to train model');
    } finally {
      setIsTraining(false);
    }
  };

  if (!projectData.fileName) {
    return (
      <div className="max-w-6xl mx-auto">
        <Alert>
          <AlertDescription>
            Please upload and preprocess a dataset first before training models.
            <Button
              variant="link"
              className="ml-2"
              onClick={() => onNavigate('upload')}
            >
              Go to Upload
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <div className="mb-4">
        <h1 className="text-gray-900 mb-1">Model Training</h1>
        <p className="text-gray-600">Select and train a machine learning model</p>
      </div>

      {/* Model Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Select a Model</CardTitle>
          <CardDescription>
            Choose a machine learning algorithm for your dataset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={modelSource} onValueChange={(v) => setModelSource(v as 'builtin' | 'upload')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="builtin">Built-in Models</TabsTrigger>
              <TabsTrigger value="upload">Upload Model</TabsTrigger>
            </TabsList>
            
            <TabsContent value="builtin" className="space-y-3 mt-4">
              <RadioGroup value={selectedModel} onValueChange={setSelectedModel}>
                <div className="space-y-3">
                  {models.map((model) => {
                    const Icon = model.icon;
                    return (
                      <div
                        key={model.id}
                        className={`flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer ${
                          selectedModel === model.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => !isTraining && setSelectedModel(model.id)}
                      >
                        <RadioGroupItem
                          value={model.id}
                          id={model.id}
                          disabled={isTraining}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <Icon className="w-4 h-4 text-gray-600" />
                            <Label htmlFor={model.id} className="cursor-pointer">
                              {model.name}
                            </Label>
                            {model.recommended && (
                              <Badge variant="secondary" className="bg-green-100 text-green-700">
                                Recommended
                              </Badge>
                            )}
                          </div>
                          <p className="text-gray-600">{model.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </RadioGroup>
            </TabsContent>

            <TabsContent value="upload" className="mt-4">
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                  {!uploadedModelFile ? (
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <FileUp className="w-6 h-6 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="model-upload" className="cursor-pointer">
                          <span className="text-blue-600 hover:text-blue-700">
                            Click to upload
                          </span>
                          {' '}or drag and drop
                        </Label>
                        <p className="text-gray-600 mt-1">
                          Supported formats: .pkl, .h5, .pt, .pth, .joblib
                        </p>
                      </div>
                      <input
                        id="model-upload"
                        type="file"
                        className="hidden"
                        accept=".pkl,.h5,.pt,.pth,.joblib,.model,.pkl.gz"
                        onChange={handleModelFileUpload}
                        disabled={isTraining}
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                      </div>
                      <div>
                        <p className="text-gray-900">{uploadedModelFile.name}</p>
                        <p className="text-gray-600">
                          {(uploadedModelFile.size / 1024).toFixed(2)} KB
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveUploadedModel}
                        disabled={isTraining}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove
                      </Button>
                    </div>
                  )}
                </div>
                <Alert>
                  <AlertDescription>
                    Upload your pre-trained model file. The model will be used with your dataset for predictions and analysis.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Training Configuration */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Training Configuration</CardTitle>
          <CardDescription>Adjust training parameters</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Test Set Size</Label>
              <span className="text-gray-900">{testSize[0]}%</span>
            </div>
            <Slider
              value={testSize}
              onValueChange={setTestSize}
              min={10}
              max={40}
              step={5}
              disabled={isTraining}
            />
            <p className="text-gray-600">
              Percentage of data reserved for testing
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Training Progress */}
      {isTraining && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-2">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                <span className="text-gray-900">Training model...</span>
              </div>
              <Progress value={trainingProgress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {isComplete && modelMetrics && (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span>Training Complete</span>
            </CardTitle>
            <CardDescription>Model performance metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-3 bg-white rounded-lg border border-green-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600">Accuracy</span>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-gray-900">
                  {(modelMetrics.accuracy * 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-green-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600">Precision</span>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-gray-900">
                  {(modelMetrics.precision * 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-green-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600">Recall</span>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-gray-900">
                  {(modelMetrics.recall * 100).toFixed(1)}%
                </p>
              </div>
              <div className="p-3 bg-white rounded-lg border border-green-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-600">Loss</span>
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
                <p className="text-gray-900">
                  {modelMetrics.loss.toFixed(3)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Natural Language Query - Show after training is complete */}
      {isComplete && (
        <NLQBar
          context="model_training"
          placeholder="Ask about your model's performance..."
          onQuery={(query, response) => {
            toast.info(response);
          }}
        />
      )}

      {/* Action Buttons */}
      <div className="flex justify-between pt-2">
        <Button variant="outline" onClick={() => onNavigate('preprocessing')}>
          Back to Preprocessing
        </Button>
        <div className="flex space-x-3">
          {!isComplete && (
            <Button
              onClick={modelSource === 'upload' ? handleTrainWithUploadedModel : handleTrain}
              disabled={isTraining || (!selectedModel && !uploadedModelFile)}
            >
              {isTraining ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Training...
                </>
              ) : (
                <>
                  <Brain className="w-4 h-4 mr-2" />
                  {modelSource === 'upload' ? 'Use Custom Model' : 'Train Model'}
                </>
              )}
            </Button>
          )}
          {isComplete && (
            <Button onClick={handleContinue}>
              Continue to Visualization
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}