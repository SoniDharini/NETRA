import { useState, useEffect } from 'react';
import { ThemeProvider } from './contexts/ThemeContext';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { UploadPage } from './components/UploadPage';
import { PreprocessingPage } from './components/PreprocessingPage';
import { ModelTraining } from './components/ModelTraining';
import { Visualization } from './components/Visualization';
import { ReportGeneration } from './components/ReportGeneration';
import { Login } from './components/Login';
import { Register } from './components/Register';
import { DataProvider } from './contexts/DataContext';
import { Toaster } from './components/ui/sonner';

type Section = 'dashboard' | 'upload' | 'preprocessing' | 'training' | 'visualization' | 'report';
type AuthView = 'login' | 'register' | null;

export interface ProjectData {
  uploadedFile?: File;
  fileName?: string;
  fileId?: string;
  uploadId?: string;
  dataPreview?: any[];
  preprocessedData?: any[];
  preprocessingSteps?: string[];
  selectedModel?: string;
  trainingId?: string;
  modelMetrics?: {
    accuracy?: number;
    precision?: number;
    recall?: number;
    loss?: number;
  };
  visualizations?: string[];
  completedSteps: Set<string>;
}

export default function App() {
  const [currentSection, setCurrentSection] = useState<Section>('dashboard');
  const [authView, setAuthView] = useState<AuthView>('login');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string>('');
  const [projectData, setProjectData] = useState<ProjectData>({
    completedSteps: new Set(),
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsAuthenticated(true);
      setAuthView(null);
    }

    const savedProjectData = sessionStorage.getItem('projectData');
    if (savedProjectData) {
      const parsedData = JSON.parse(savedProjectData);
      parsedData.completedSteps = new Set(parsedData.completedSteps);
      setProjectData(parsedData);
    }
  }, []);

  useEffect(() => {
    // Save projectData to session storage whenever it changes
    const dataToSave = {
      ...projectData,
      completedSteps: Array.from(projectData.completedSteps),
    };
    sessionStorage.setItem('projectData', JSON.stringify(dataToSave));
  }, [projectData]);

  const updateProjectData = (updates: Partial<ProjectData>) => {
    setProjectData(prev => ({ ...prev, ...updates }));
  };

  const markStepComplete = (step: string) => {
    setProjectData(prev => ({
      ...prev,
      completedSteps: new Set([...prev.completedSteps, step]),
    }));
  };

  const handleLogin = (username: string) => {
    setUsername(username);
    setIsAuthenticated(true);
    setAuthView(null);
  };

  const handleRegister = () => {
    setAuthView('login');
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    setIsAuthenticated(false);
    setUsername('');
    setAuthView('login');
    setCurrentSection('dashboard');
    setProjectData({ completedSteps: new Set() });
  };

  // Show auth screens if not authenticated
  if (!isAuthenticated) {
    return (
      <ThemeProvider>
        <div className="min-h-screen bg-background">
          {authView === 'login' && (
            <Login
              onLogin={handleLogin}
              onNavigateToRegister={() => setAuthView('register')}
            />
          )}
          {authView === 'register' && (
            <Register
              onRegister={handleRegister}
              onNavigateToLogin={() => setAuthView('login')}
            />
          )}
          <Toaster />
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <DataProvider>
        <div className="h-screen bg-background flex flex-col overflow-hidden">
          <Navigation 
            currentSection={currentSection} 
            onNavigate={setCurrentSection}
            completedSteps={projectData.completedSteps}
            userEmail={username}
            onLogout={handleLogout}
          />
          
          <main className="flex-1 overflow-hidden">
            {currentSection === 'dashboard' && (
              <div className="h-full overflow-y-auto">
                <div className="container mx-auto px-4 py-6">
                  <Dashboard 
                    onNavigate={setCurrentSection}
                    projectData={projectData}
                  />
                </div>
              </div>
            )}
            {currentSection === 'upload' && (
              <div className="h-full overflow-y-auto">
                <div className="container mx-auto px-4 py-6">
                  <UploadPage 
                    onNavigate={setCurrentSection}
                    updateProjectData={updateProjectData}
                    markStepComplete={markStepComplete}
                  />
                </div>
              </div>
            )}
            {currentSection === 'preprocessing' && (
              <div className="h-full overflow-y-auto">
                <div className="container mx-auto px-4 py-6">
                  <PreprocessingPage 
                    onNavigate={setCurrentSection}
                    projectData={projectData}
                    updateProjectData={updateProjectData}
                    markStepComplete={markStepComplete}
                  />
                </div>
              </div>
            )}
            {currentSection === 'training' && (
              <div className="h-full overflow-y-auto">
                <div className="container mx-auto px-4 py-6">
                  <ModelTraining 
                    onNavigate={setCurrentSection}
                    projectData={projectData}
                    updateProjectData={updateProjectData}
                    markStepComplete={markStepComplete}
                  />
                </div>
              </div>
            )}
            {currentSection === 'visualization' && (
              <Visualization 
                onNavigate={setCurrentSection}
                projectData={projectData}
                updateProjectData={updateProjectData}
                markStepComplete={markStepComplete}
              />
            )}
            {currentSection === 'report' && (
              <div className="h-full overflow-y-auto">
                <div className="container mx-auto px-4 py-6">
                  <ReportGeneration 
                    projectData={projectData}
                  />
                </div>
              </div>
            )}
          </main>
          
          <Toaster />
        </div>
      </DataProvider>
    </ThemeProvider>
  );
}
