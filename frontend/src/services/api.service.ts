/**
 * API Service Layer
 * 
 * This service handles all communication with the Flask/Django backend.
 * Each method corresponds to an API endpoint that should be implemented on the backend.
 */
import axios from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { mockApiService } from './mock-api.service';

// Toggle this to switch between mock and real API
const USE_MOCK_API = false; // Set to false when backend is ready

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    console.log('Interceptor called, token:', token);
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    console.log('Config headers:', config.headers);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface DataPreview {
  columns: string[];
  rows: any[];
  rowCount: number;
  columnTypes: Record<string, string>;
}

export interface PreprocessingSuggestion {
  type: 'remove_duplicates' | 'fill_missing' | 'encode_categorical' | 'normalize' | 'remove_outliers';
  column?: string;
  description: string;
  recommended: boolean;
}

export interface FeatureEngineeringSuggestion {
  name: string;
  description: string;
  type: 'polynomial' | 'interaction' | 'binning' | 'datetime_features';
  columns: string[];
}

export interface ModelRecommendation {
  name: string;
  type: 'classification' | 'regression' | 'clustering';
  description: string;
  recommended: boolean;
  defaultParams: Record<string, any>;
}

export interface ModelMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  loss?: number;
  confusionMatrix?: number[][];
  featureImportance?: { feature: string; importance: number }[];
}

export interface VisualizationSuggestion {
  type: 'scatter' | 'line' | 'bar' | 'histogram' | 'heatmap' | 'box' | 'pie' | 'area';
  title: string;
  description: string;
  columns: string[];
  rows?: string[];
  color?: string;
  size?: string;
  recommended: boolean;
  reason?: string;
}


export interface UploadStatus {
  status: 'pending' | 'uploading' | 'completed' | 'error';
  fileId: string | null;
  uploadedChunks: number[];
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_CONFIG.BASE_URL;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {}
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      return response;
    } catch (error) {
      clearTimeout(timeout);
      throw error;
    }
  }

  /**
   * Handle API response
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.error || data.message || 'An error occurred',
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse server response',
      };
    }
  }

  // ==================== AUTHENTICATION ENDPOINTS ====================

  /**
   * Register a new user
   * @param userData - User registration data (username, email, password)
   */
  async register(userData: any): Promise<ApiResponse<any>> {
    try {
      const response = await api.post(API_ENDPOINTS.REGISTER, userData);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  /**
   * Log in a user
   * @param credentials - User login credentials (email, password)
   */
  async login(credentials: any): Promise<ApiResponse<any>> {
    try {
      const response = await api.post(API_ENDPOINTS.LOGIN, credentials);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  // ==================== DATA UPLOAD ENDPOINTS ====================
  async uploadDataset(file: File, onUploadProgress: (progressEvent: any) => void): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);


    try {
        const response = await api.post(API_ENDPOINTS.UPLOAD_DATA, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress,
        });
        return { success: true, data: response.data };
    } catch (error: any) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  /**
   * Validate uploaded data
   * @param fileId - ID of the uploaded file
   */
  async validateData(fileId: string): Promise<ApiResponse<{ valid: boolean; issues: string[] }>> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.VALIDATE_DATA}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId }),
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to validate data',
      };
    }
  }

  /**
   * Get data preview
   * @param fileId - ID of the uploaded file
   * @param limit - Number of rows to preview (default: 5)
   */
  async getDataPreview(fileId: string, limit: number = 5): Promise<ApiResponse<DataPreview>> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.GET_DATA_PREVIEW}?fileId=${fileId}&limit=${limit}`,
        {
          method: 'GET',
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get data preview',
      };
    }
  }

  // ==================== PREPROCESSING ENDPOINTS ====================

  /**
   * Get AI-based preprocessing suggestions
   * @param fileId - ID of the uploaded file
   */
  async getPreprocessingSuggestions(
    fileId: string
  ): Promise<ApiResponse<PreprocessingSuggestion[]>> {
    if (USE_MOCK_API) {
      return mockApiService.getPreprocessingSuggestions(fileId);
    }

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.GET_PREPROCESSING_SUGGESTIONS}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId }),
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get preprocessing suggestions',
      };
    }
  }

  /**
   * Apply preprocessing steps
   * @param fileId - ID of the uploaded file
   * @param steps - Array of preprocessing steps to apply
   */
  async applyPreprocessing(
    fileId: string,
    steps: PreprocessingSuggestion[]
  ): Promise<ApiResponse<{ processedFileId: string; summary: string }>> {
    if (USE_MOCK_API) {
      return mockApiService.applyPreprocessing(fileId, steps);
    }

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.APPLY_PREPROCESSING}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId, steps }),
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to apply preprocessing',
      };
    }
  }

  /**
   * Get feature engineering suggestions
   * @param fileId - ID of the uploaded file
   */
  async getFeatureEngineeringSuggestions(
    fileId: string
  ): Promise<ApiResponse<FeatureEngineeringSuggestion[]>> {
    if (USE_MOCK_API) {
      return mockApiService.getFeatureEngineeringSuggestions(fileId);
    }

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.GET_FEATURE_ENGINEERING_SUGGESTIONS}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId }),
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get feature engineering suggestions',
      };
    }
  }

  // ==================== MODEL TRAINING ENDPOINTS ====================

  /**
   * Get model recommendations based on data
   * @param fileId - ID of the preprocessed file
   */
  async getModelRecommendations(
    fileId: string
  ): Promise<ApiResponse<ModelRecommendation[]>> {
    if (USE_MOCK_API) {
      return mockApiService.getModelRecommendations(fileId);
    }

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.GET_MODEL_RECOMMENDATIONS}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId }),
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get model recommendations',
      };
    }
  }

  /**
   * Upload a custom pre-trained model
   * @param file - Model file (e.g., .pkl, .h5, .pt)
   */
  async uploadCustomModel(file: File): Promise<ApiResponse<{ modelId: string }>> {
    const formData = new FormData();
    formData.append('model', file);

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.UPLOAD_CUSTOM_MODEL}`,
        {
          method: 'POST',
          body: formData,
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to upload model',
      };
    }
  }

  /**
   * Train a machine learning model
   * @param fileId - ID of the preprocessed file
   * @param modelName - Name of the model to train
   * @param targetColumn - Target column for training
   * @param params - Model parameters
   */
  async trainModel(
    fileId: string,
    modelName: string,
    targetColumn: string,
    params: Record<string, any> = {}
  ): Promise<ApiResponse<{ trainingId: string }>> {
    if (USE_MOCK_API) {
      return mockApiService.trainModel(fileId, modelName, targetColumn, params);
    }

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.TRAIN_MODEL}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId, modelName, targetColumn, params }),
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to start model training',
      };
    }
  }

  /**
   * Get training status
   * @param trainingId - ID of the training job
   */
  async getTrainingStatus(
    trainingId: string
  ): Promise<ApiResponse<{ status: 'pending' | 'training' | 'completed' | 'failed'; progress: number }>> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.GET_TRAINING_STATUS}/${trainingId}`,
        {
          method: 'GET',
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get training status',
      };
    }
  }

  /**
   * Get model performance metrics
   * @param trainingId - ID of the training job
   */
  async getModelMetrics(trainingId: string): Promise<ApiResponse<ModelMetrics>> {
    if (USE_MOCK_API) {
      return mockApiService.getModelMetrics(trainingId);
    }

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.GET_MODEL_METRICS}/${trainingId}`,
        {
          method: 'GET',
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get model metrics',
      };
    }
  }

  // ==================== VISUALIZATION ENDPOINTS ====================

  /**
   * Get visualization suggestions based on data
   * @param fileId - ID of the file
   */
  async getVisualizationSuggestions(
    fileId: string
  ): Promise<ApiResponse<VisualizationSuggestion[]>> {
    if (USE_MOCK_API) {
      return mockApiService.getVisualizationSuggestions(fileId);
    }

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.GET_VISUALIZATION_SUGGESTIONS}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId }),
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get visualization suggestions',
      };
    }
  }

  /**
   * Generate a visualization
   * @param fileId - ID of the file
   * @param vizType - Type of visualization
   * @param config - Visualization configuration
   */
  async generateVisualization(
    fileId: string,
    vizType: string,
    config: any
  ): Promise<ApiResponse<{ chartData: any; imageUrl?: string }>> {
    if (USE_MOCK_API) {
      return mockApiService.generateVisualization(fileId, vizType, config);
    }

    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.GENERATE_VISUALIZATION}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId, vizType, config }),
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate visualization',
      };
    }
  }

  /**
   * Process Natural Language Query for visualization
   * @param fileId - ID of the file
   * @param query - Natural language query (e.g., "Show correlation between age and income")
   */
  async processNLQ(
    fileId: string,
    query: string
  ): Promise<ApiResponse<{ visualization: any; interpretation: string }>> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.PROCESS_NLQ}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId, query }),
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to process natural language query',
      };
    }
  }

  // ==================== REPORT GENERATION ENDPOINTS ====================

  /**
   * Generate analysis report
   * @param projectData - Complete project data
   */
  async generateReport(projectData: any): Promise<ApiResponse<{ reportId: string }>> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.GENERATE_REPORT}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData),
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to generate report',
      };
    }
  }

  /**
   * Download report
   * @param reportId - ID of the generated report
   * @param format - Report format (pdf, docx)
   */
  async downloadReport(reportId: string, format: 'pdf' | 'docx'): Promise<Blob | null> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.DOWNLOAD_REPORT}/${reportId}?format=${format}`,
        {
          method: 'GET',
        }
      );

      if (response.ok) {
        return await response.blob();
      }

      return null;
    } catch (error) {
      console.error('Failed to download report:', error);
      return null;
    }
  }

  // ==================== PROJECT MANAGEMENT ENDPOINTS ====================

  /**
   * Save project data
   * @param projectData - Complete project data
   */
  async saveProject(projectData: any): Promise<ApiResponse<{ projectId: string }>> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.SAVE_PROJECT}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectData),
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to save project',
      };
    }
  }

  /**
   * Get project by ID
   * @param projectId - ID of the project
   */
  async getProject(projectId: string): Promise<ApiResponse<any>> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.GET_PROJECT.replace(':id', projectId)}`,
        {
          method: 'GET',
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get project',
      };
    }
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<ApiResponse<any[]>> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.LIST_PROJECTS}`,
        {
          method: 'GET',
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to list projects',
      };
    }
  }
}

export const apiService = new ApiService();