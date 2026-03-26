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
    if (token) {
      if (config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        config.headers = { Authorization: `Bearer ${token}` } as any;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Refresh token on 401 and retry
let isRefreshing = false;
let failedQueue: Array<{ resolve: (value?: unknown) => void; reject: (reason?: any) => void }> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return api(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        isRefreshing = false;
        processQueue(error, null);
        localStorage.removeItem('accessToken');
        window.location.reload();
        return Promise.reject(error);
      }

      try {
        const response = await api.post(API_ENDPOINTS.REFRESH_TOKEN, { refresh: refreshToken });
        const { access } = response.data;
        localStorage.setItem('accessToken', access);
        processQueue(null, access);
        originalRequest.headers.Authorization = `Bearer ${access}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        window.location.reload();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  /** HTTP status when success is false (e.g. 401 Unauthorized) */
  status?: number;
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
    const authTimeout = (API_CONFIG as any).AUTH_TIMEOUT || 60000;
    try {
      const response = await api.post(API_ENDPOINTS.REGISTER, userData, { timeout: authTimeout });
      return { success: true, data: response.data };
    } catch (error: any) {
      const data = error.response?.data;
      let msg = data?.error || error.message;
      if (!msg && data && typeof data === 'object') {
        const parts = Object.entries(data).map(([k, v]) =>
          Array.isArray(v) ? `${k}: ${v.join(', ')}` : `${k}: ${v}`
        );
        msg = parts.join('; ') || error.message;
      }
      const isTimeout = error.code === 'ECONNABORTED' || msg?.toLowerCase?.().includes('timeout');
      return {
        success: false,
        error: isTimeout ? 'Connection timed out. Ensure the backend is running at http://localhost:8000' : msg,
      };
    }
  }

  /**
   * Log in a user
   * @param credentials - User login credentials (username, password)
   */
  async login(credentials: any): Promise<ApiResponse<any>> {
    const authTimeout = (API_CONFIG as any).AUTH_TIMEOUT || 60000;
    try {
      const response = await api.post(API_ENDPOINTS.LOGIN, credentials, { timeout: authTimeout });
      return { success: true, data: response.data };
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message;
      const isTimeout = error.code === 'ECONNABORTED' || msg?.toLowerCase?.().includes('timeout');
      return {
        success: false,
        error: isTimeout ? 'Connection timed out. Ensure the backend is running at http://localhost:8000' : msg,
      };
    }
  }

  // ==================== DATA UPLOAD ENDPOINTS ====================
  async uploadDataset(file: File, onUploadProgress: (progressEvent: any) => void): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);

    const uploadTimeout = (API_CONFIG as any).UPLOAD_TIMEOUT || 300000;

    try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
            return { success: false, error: 'Please log in to upload files.' };
        }
        const response = await api.post(API_ENDPOINTS.UPLOAD_DATA, formData, {
            onUploadProgress,
            timeout: uploadTimeout,
        });
        return { success: true, data: response.data };
    } catch (error: any) {
        const status = error.response?.status;
        const msg = error.response?.data?.error || error.response?.data?.detail || error.message;
        if (status === 401) {
            return { success: false, error: 'Session expired. Please log in again to upload.' };
        }
        return { success: false, error: msg };
    }
  }

  /**
   * List all datasets for the current user
   */
  async listDatasets(): Promise<ApiResponse<any[]>> {
    try {
      const response = await api.get(API_ENDPOINTS.LIST_DATASETS || 'datasets/uploads/');
      const data = response.data;
      return { success: true, data: Array.isArray(data) ? data : (data?.results ?? data?.data ?? []) };
    } catch (error: any) {
      const status = error.response?.status;
      return {
        success: false,
        error: error.response?.data?.error || error.response?.data?.detail || error.message || 'Failed to list datasets',
        status,
      };
    }
  }

  /**
   * Validate uploaded data
   * @param fileId - ID of the uploaded file
   */
  async validateData(fileId: string): Promise<ApiResponse<{ valid: boolean; issues: string[] }>> {
    try {
      const token = localStorage.getItem('accessToken');
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.VALIDATE_DATA}`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
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
   * Download the preprocessed dataset (usually returns a CSV blob)
   */
  async downloadPreprocessedDataset(fileId: string): Promise<ApiResponse<Blob>> {
    try {
      const response = await api.get(`datasets/dataset/${fileId}/download/`, { responseType: 'blob' });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Network error during download',
      };
    }
  }

  /**
   * Get data preview (uses axios for consistent auth and baseURL)
   * @param fileId - ID of the uploaded file
   * @param limit - Number of rows to preview (default: 5)
   */
  async getDataPreview(fileId: string, limit: number = 5): Promise<ApiResponse<DataPreview>> {
    try {
      const response = await api.get(
        `${API_ENDPOINTS.GET_DATA_PREVIEW}?fileId=${fileId}&limit=${limit}`
      );
      const data = response.data?.data ?? response.data;
      return { success: true, data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get data preview',
      };
    }
  }

  // ==================== PREPROCESSING ENDPOINTS ====================

  /**
   * Get full dataset profile (missing_values, duplicates, suggested_cleaning, feature_engineering)
   */
  async getDatasetProfileFull(fileId: string): Promise<ApiResponse<{
    missing_values: Record<string, any>;
    duplicates: { count: number };
    suggested_cleaning: any[];
    feature_engineering: any[];
  }>> {
    try {
      const response = await api.post(
        (API_ENDPOINTS as any).GET_DATASET_PROFILE_FULL || 'datasets/get-dataset-profile-full/',
        { fileId }
      );
      const data = response.data?.data ?? response.data;
      return { success: true, data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get dataset profile',
      };
    }
  }

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
      const response = await api.post(API_ENDPOINTS.GET_PREPROCESSING_SUGGESTIONS, { fileId });
      const data = response.data?.data ?? response.data;
      return { success: true, data: Array.isArray(data) ? data : [] };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get preprocessing suggestions',
      };
    }
  }

  /**
   * Run full preprocessing pipeline (no steps - auto pipeline)
   * @param datasetId - ID of the dataset
   */
  async preprocessDataset(datasetId: string): Promise<ApiResponse<{ dataset_id: number; rows: number; columns: string[]; preprocessing_applied: boolean; summary: any }>> {
    try {
      const response = await api.post(
        `datasets/preprocess/${datasetId}/`
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Preprocessing failed',
      };
    }
  }

  /**
   * Get visualization chart data (histogram, bar, correlation)
   * @param datasetId - ID of the dataset
   */
  async getVisualizationData(datasetId: string): Promise<ApiResponse<{ histogram: any; bar_chart: any; correlation: any; numeric_summary: any }>> {
    try {
      const response = await api.get(
        `datasets/visualize/${datasetId}/`
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get visualization data',
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
      const response = await api.post(API_ENDPOINTS.APPLY_PREPROCESSING, { fileId, steps });
      const data = response.data?.data ?? response.data;
      return { success: true, data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to apply preprocessing',
      };
    }
  }

  /**
   * Apply feature engineering step
   * @param fileId - ID of the uploaded file
   * @param steps - Array of feature engineering steps to apply
   */
  async applyFeatureEngineering(
    fileId: string,
    steps: any[]
  ): Promise<ApiResponse<{ processedFileId: string; summary: string }>> {
    try {
      const response = await api.post('datasets/apply-feature-engineering/', { fileId, steps });
      const data = response.data?.data ?? response.data;
      return { success: true, data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to apply feature engineering',
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
      const response = await api.post(API_ENDPOINTS.GET_FEATURE_ENGINEERING_SUGGESTIONS, { fileId });
      const data = response.data?.data ?? response.data;
      return { success: true, data: Array.isArray(data) ? data : [] };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get feature engineering suggestions',
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
      const token = localStorage.getItem('accessToken');
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.GET_MODEL_RECOMMENDATIONS}`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
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
      const token = localStorage.getItem('accessToken');
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.UPLOAD_CUSTOM_MODEL}`,
        {
          method: 'POST',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
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
  ): Promise<ApiResponse<{ trainingId: string; metrics: any }>> {
    if (USE_MOCK_API) {
      return mockApiService.trainModel(fileId, modelName, targetColumn, params) as any;
    }

    try {
      // ML training can be slow — use a 5-minute timeout
      const trainTimeout = 300000;
      const response = await api.post(
        API_ENDPOINTS.TRAIN_MODEL,
        { datasetId: fileId, modelName, targetColumn, ...params },
        { timeout: trainTimeout }
      );
      // Backend returns { success, trainingId, metrics } directly (no wrapping 'data' key)
      const resData = response.data;
      return {
        success: true,
        data: resData,
      };
    } catch (error: any) {
      const msg = error.response?.data?.error || error.message || 'Failed to start model training';
      const isTimeout = error.code === 'ECONNABORTED' || msg?.toLowerCase?.().includes('timeout');
      return {
        success: false,
        error: isTimeout
          ? 'Training timed out. The model may be too complex for the data. Try a simpler model or reduce test size.'
          : msg,
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
      const token = localStorage.getItem('accessToken');
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.GET_TRAINING_STATUS}/${trainingId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
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
      const token = localStorage.getItem('accessToken');
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.GET_MODEL_METRICS}/${trainingId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
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
      const response = await api.post(API_ENDPOINTS.GET_VISUALIZATION_SUGGESTIONS, { fileId });
      const data = response.data?.data ?? response.data;
      return { success: true, data: Array.isArray(data) ? data : [] };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get visualization suggestions',
      };
    }
  }

  /**
   * Save visualization configuration
   */
  async saveVisualization(
    datasetId: string,
    title: string,
    chartType: string,
    config: any,
    isAiRecommended: boolean = false
  ): Promise<ApiResponse<any>> {
    try {
      const response = await api.post(API_ENDPOINTS.SAVE_VISUALIZATION, {
        dataset_id: datasetId,
        title,
        chart_type: chartType,
        config,
        is_ai_recommended: isAiRecommended
      });
      return { success: true, data: response.data?.data ?? response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to save visualization',
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
      const token = localStorage.getItem('accessToken');
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.PROCESS_NLQ}`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
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
      const token = localStorage.getItem('accessToken');
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.GENERATE_REPORT}`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
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
      const token = localStorage.getItem('accessToken');
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.DOWNLOAD_REPORT}/${reportId}?format=${format}`,
        {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
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
      const token = localStorage.getItem('accessToken');
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.SAVE_PROJECT}`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
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
      const token = localStorage.getItem('accessToken');
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.GET_PROJECT.replace(':id', projectId)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
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
      const token = localStorage.getItem('accessToken');
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.LIST_PROJECTS}`,
        {
          method: 'GET',
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
          },
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

  /**
   * Get saved visualizations
   */
  async getSavedVisualizations(
    datasetId: string
  ): Promise<ApiResponse<any[]>> {
    try {
      const response = await api.get(`${API_ENDPOINTS.GET_SAVED_VISUALIZATIONS}${datasetId}/`);
      const data = response.data?.data ?? response.data;
      return { success: true, data: Array.isArray(data) ? data : [] };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to get saved visualizations',
      };
    }
  }
}

export const apiService = new ApiService();