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
  BASE_URL: 'http://localhost:8000/api/',
  
  // Production - Uncomment and update this when deploying
  // BASE_URL: 'https://your-backend-domain.com/api',
  
  // Timeout for API requests (in milliseconds)
  TIMEOUT: 30000,
  // Timeout for auth (login/register) - longer for cold starts
  AUTH_TIMEOUT: 60000,
  // Timeout for file uploads (longer for large files) - 5 minutes
  UPLOAD_TIMEOUT: 300000,
  
  // Maximum file upload size (in bytes) - 50MB
  MAX_FILE_SIZE: 50 * 1024 * 1024,
};

export const API_ENDPOINTS = {
  // Auth
  LOGIN: 'auth/login/',
  REGISTER: 'auth/signup/',
  REFRESH_TOKEN: 'auth/login/refresh/',

  // Data Upload
  UPLOAD_DATA: 'datasets/upload/',
  LIST_DATASETS: 'datasets/uploads/',
  VALIDATE_DATA: 'datasets/get-data-profile/',
  GET_DATA_PREVIEW: 'datasets/get-data-preview/',
  GET_DATASET_PROFILE_FULL: 'datasets/get-dataset-profile-full/',
  
  // Preprocessing
  GET_PREPROCESSING_SUGGESTIONS: 'datasets/preprocessing-suggestions/',
  APPLY_PREPROCESSING: 'datasets/apply-preprocessing/',
  PREPROCESS_DATASET: 'datasets/preprocess/',  // + datasetId
  VISUALIZE_DATASET: 'datasets/visualize/',   // + datasetId
  GET_FEATURE_ENGINEERING_SUGGESTIONS: 'datasets/feature-engineering-suggestions/',
  
  // Model Training
  GET_MODEL_RECOMMENDATIONS: '/models/recommendations/',
  UPLOAD_CUSTOM_MODEL: '/models/upload/',
  TRAIN_MODEL: '/models/train/',
  GET_TRAINING_STATUS: '/models/training-status/',
  GET_MODEL_METRICS: '/models/metrics/',
  
  // Visualization
  GET_VISUALIZATION_SUGGESTIONS: 'datasets/visualization-suggestions/',
  SAVE_VISUALIZATION: 'datasets/save-visualization/',
  GET_SAVED_VISUALIZATIONS: 'datasets/saved-visualizations/',
  GENERATE_VISUALIZATION: 'visualizations/generate',
  PROCESS_NLQ: 'visualizations/nlq',
  
  // Report Generation
  GENERATE_REPORT: '/reports/generate',
  DOWNLOAD_REPORT: '/reports/download',
  
  // Project Management
  SAVE_PROJECT: '/projects/save',
  GET_PROJECT: '/projects/:id',
  LIST_PROJECTS: '/projects/list',
};
