/**
 * API Service Layer
 * 
 * This service handles all communication with the Flask/Django backend.
 * Each method corresponds to an API endpoint that should be implemented on the backend.
 */
import axios, { AxiosError } from 'axios';
import { API_CONFIG, API_ENDPOINTS } from '../config/api';
import { mockApiService } from './mock-api.service';

// Toggle this to switch between mock and real API
const USE_MOCK_API = false; // Set to false when backend is ready

const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  timeout: API_CONFIG.TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
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
  type: string;
  column?: string;
  description: string;
  recommended: boolean;
  rationale?: string;
  params?: Record<string, any>;
  group?: 'cleaning' | 'encoding' | 'scaling' | 'feature_engineering' | 'other';
}

export interface DatasetProfile {
  rowCount: number;
  columnCount: number;
  columns: string[];
  columnTypes?: Record<string, string>;
  missingValues?: Record<string, { count: number; percent: number }>;
  duplicateRows?: number;
  outliers?: Record<string, { count: number; percent?: number; method?: string }>;
  numericStats?: Record<string, {
    mean?: number;
    std?: number;
    min?: number;
    max?: number;
    median?: number;
  }>;
  target?: {
    column: string;
    task?: 'classification' | 'regression' | 'unknown';
    distribution?: Array<{ label: string; count: number; percent?: number }>;
    classImbalance?: { isImbalanced: boolean; ratio?: number; note?: string };
  };
  featureImportance?: Array<{ feature: string; importance: number }>;
}

export interface FeatureEngineeringSuggestion {
  name: string;
  description: string;
  type: 'polynomial' | 'interaction' | 'binning' | 'datetime_features';
  columns: string[];
  details?: Record<string, any>;
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

    const token = localStorage.getItem('accessToken');
    const headers = {
      ...options.headers,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    };

    try {
      const response = await fetch(url, {
        ...options,
        headers,
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
    if (USE_MOCK_API) return mockApiService.register(userData);
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
    if (USE_MOCK_API) return mockApiService.login(credentials);
    try {
      const response = await api.post(API_ENDPOINTS.LOGIN, credentials);
      return { success: true, data: response.data };
    } catch (error: any) {
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  async refreshToken(): Promise<ApiResponse<{ access: string }>> {
    if (USE_MOCK_API) return mockApiService.refreshToken();
    const refreshToken = localStorage.getItem('refreshToken');
    if (!refreshToken) {
      return { success: false, error: 'No refresh token available' };
    }
    try {
      const response = await api.post(API_ENDPOINTS.REFRESH_TOKEN, { refresh: refreshToken });
      const newAccessToken = response.data.access;
      localStorage.setItem('accessToken', newAccessToken);
      return { success: true, data: { access: newAccessToken } };
    } catch (error: any) {
      this.logout();
      return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  }
  
  // ==================== DATA UPLOAD ENDPOINTS ====================
  async uploadDataset(file: File, onUploadProgress: (progressEvent: any) => void): Promise<ApiResponse<any>> {
    if (USE_MOCK_API) return mockApiService.uploadDataset(file, onUploadProgress);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('name', file.name);

    try {
        const response = await api.post(API_ENDPOINTS.UPLOAD_DATA, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
            onUploadProgress,
            timeout: 0,
        });
        return { success: true, data: response.data };
    } catch (error: any) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  async uploadJsonData(fileName: string, data: any[], onUploadProgress: (progressEvent: any) => void): Promise<ApiResponse<any>> {
    if (USE_MOCK_API) return mockApiService.uploadJsonData(fileName, data, onUploadProgress);

    try {
        const response = await api.post(API_ENDPOINTS.UPLOAD_JSON_DATA, {
            name: fileName,
            data: data,
        }, {
            onUploadProgress,
            timeout: 0,
        });
        return { success: true, data: response.data };
    } catch (error: any) {
        return { success: false, error: error.response?.data?.error || error.message };
    }
  }

  /**
   * Get data preview (limited rows for UI display)
   * @param fileId - ID of the uploaded file
   * @param limit - Number of rows to preview (default: 5)
   */
  async getDataPreview(fileId: string, limit: number = 5): Promise<ApiResponse<DataPreview>> {
    if (USE_MOCK_API) return mockApiService.getDataPreview(fileId, limit);
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.GET_DATA_PREVIEW}?fileId=${fileId}&limit=${limit}`,
        { method: 'GET' }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get data preview',
      };
    }
  }

  /**
   * Get comprehensive dataset profile (operates on FULL dataset)
   * @param fileId - ID of the uploaded file
   */
  async getDataProfile(fileId: string): Promise<ApiResponse<DatasetProfile>> {
    if (USE_MOCK_API) return mockApiService.getDataPreview(fileId, 5) as any;
    
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.GET_DATA_PROFILE}`,
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
        error: error.message || 'Failed to get data profile',
      };
    }
  }

  // ==================== PREPROCESSING ENDPOINTS ====================


  async getProfileAndSuggestions(
    fileId: string
  ): Promise<ApiResponse<{ profile: DatasetProfile; suggestions: FeatureEngineeringSuggestion[] }>> {
    if (USE_MOCK_API) {
      return mockApiService.getProfileAndSuggestions(fileId);
    }

    try {
      const url = `${this.baseUrl}${API_ENDPOINTS.GET_PROFILE_AND_SUGGESTIONS}${fileId}/profile-and-suggest/`;
      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        }
      );

      return this.handleResponse(response);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to get profile and suggestions',
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
  ): Promise<ApiResponse<{ processedFileId: string; summary: string; preview: DataPreview }>> {
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
  
    /**
   * Download preprocessed dataset (FULL dataset, not preview)
   * @param fileId - ID of the file to download
   * @param format - File format (csv or xlsx)
   */
  async downloadPreprocessedDataset(
    fileId: string,
    format: 'csv' | 'xlsx' = 'csv'
  ): Promise<ApiResponse<Blob>> {
    if (USE_MOCK_API) {
      const blob = await mockApiService.downloadFile(fileId);
      return { success: !!blob, data: blob || undefined };
    }
    
    try {
      const response = await this.fetchWithTimeout(
        `${this.baseUrl}${API_ENDPOINTS.DOWNLOAD_PREPROCESSED_DATA}?fileId=${fileId}&format=${format}`,
        { method: 'GET' }
      );
      
      if (response.ok) {
        const blob = await response.blob();
        return { success: true, data: blob };
      }
      
      return { success: false, error: 'Failed to download file' };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to download file',
      };
    }
  }

  /**
   * Alias for downloadPreprocessedDataset for backwards compatibility
   */
  async downloadFile(fileId: string, format: 'csv' | 'xlsx' = 'csv'): Promise<Blob | null> {
    const response = await this.downloadPreprocessedDataset(fileId, format);
    return response.data || null;
  }

  // ... other methods remain unchanged
}

export const apiService = new ApiService();

// ==================== AXIOS INTERCEPTOR FOR TOKEN REFRESH ====================

let isRefreshing = false;
let failedQueue: { resolve: (value: unknown) => void; reject: (reason?: any) => void; }[] = [];

const processQueue = (error: any, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

api.interceptors.response.use(
  response => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then(token => {
            originalRequest.headers['Authorization'] = 'Bearer ' + token;
            return axios(originalRequest);
          })
          .catch(err => {
            return Promise.reject(err);
          });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const response = await axios.post(`${API_CONFIG.BASE_URL}${API_ENDPOINTS.REFRESH_TOKEN}`, { refresh: refreshToken });
          const newAccessToken = response.data.access;
          localStorage.setItem('accessToken', newAccessToken);
          originalRequest.headers['Authorization'] = `Bearer ${newAccessToken}`;
          processQueue(null, newAccessToken);
          return axios(originalRequest);
        } catch (refreshError: any) {
          processQueue(refreshError, null);
          apiService.logout();
          return Promise.reject(refreshError);
        } finally {
          isRefreshing = false;
        }
      } else {
        apiService.logout();
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);