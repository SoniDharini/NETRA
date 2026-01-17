/**
 * API Configuration
 * 
 * Update the API_BASE_URL to point to your Flask/Django backend
 * Example: 'http://localhost:5000/api' for Flask or 'http://localhost:8000/api' for Django
 */

export const API_CONFIG = {
  // Development - Update this to point to your Flask/Django backend
  // For Flask (default): 'http://localhost:5000/api'
  // For Django (default): 'http://localhost:8000/api'
  BASE_URL: 'http://localhost:8000/api',
  
  // Production - Uncomment and update this when deploying
  // BASE_URL: 'https://your-backend-domain.com/api',
  
  // Timeout for API requests (in milliseconds)
  TIMEOUT: 30000,
  
  // Maximum file upload size (in bytes) - 50MB
  MAX_FILE_SIZE: 50 * 1024 * 1024,
};

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login/',
  REGISTER: '/auth/register/',
  REFRESH_TOKEN: '/auth/login/refresh/',

  // Data Upload
  UPLOAD_DATA: '/datasets/upload/',
  VALIDATE_DATA: '/data/validate',
  GET_DATA_PREVIEW: '/data/preview',
  
  // Preprocessing
  GET_PREPROCESSING_SUGGESTIONS: '/preprocessing/suggestions',
  APPLY_PREPROCESSING: '/preprocessing/apply',
  GET_FEATURE_ENGINEERING_SUGGESTIONS: '/preprocessing/feature-engineering',
  
  // Model Training
  GET_MODEL_RECOMMENDATIONS: '/models/recommendations',
  UPLOAD_CUSTOM_MODEL: '/models/upload',
  TRAIN_MODEL: '/models/train',
  GET_TRAINING_STATUS: '/models/training-status',
  GET_MODEL_METRICS: '/models/metrics',
  
  // Visualization
  GET_VISUALIZATION_SUGGESTIONS: '/visualizations/suggestions',
  GENERATE_VISUALIZATION: '/visualizations/generate',
  PROCESS_NLQ: '/visualizations/nlq',
  
  // Report Generation
  GENERATE_REPORT: '/reports/generate',
  DOWNLOAD_REPORT: '/reports/download',
  
  // Project Management
  SAVE_PROJECT: '/projects/save',
  GET_PROJECT: '/projects/:id',
  LIST_PROJECTS: '/projects/list',
};
