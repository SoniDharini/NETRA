/**
 * Mock API Service
 * 
 * This provides mock responses when the backend is not available.
 * Used for development and testing purposes.
 * Switch to real API service when backend is ready.
 */

import {
  ApiResponse,
  DataPreview,
  PreprocessingSuggestion,
  FeatureEngineeringSuggestion,
  ModelRecommendation,
  ModelMetrics,
  VisualizationSuggestion,
} from './api.service';

export class MockApiService {
  private delay(ms: number = 1000) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== MOCK CHUNKED UPLOAD ====================
  // In-memory store to simulate backend chunk storage for resuming
  private mockChunkStorage: Record<string, { uploadedChunks: number[], fileId: string | null }> = {};

  async getUploadStatus(uploadId: string): Promise<ApiResponse<any>> {
    await this.delay(200);
    if (this.mockChunkStorage[uploadId]) {
      return { success: true, data: this.mockChunkStorage[uploadId] };
    }
    return { success: false, error: 'Upload session not found.' };
  }

  async uploadChunk(uploadId: string, chunk: Blob, chunkIndex: number): Promise<ApiResponse> {
    await this.delay(100 + Math.random() * 200); // Simulate network variance
    if (!this.mockChunkStorage[uploadId]) {
      this.mockChunkStorage[uploadId] = { uploadedChunks: [], fileId: null };
    }
    
    // Simulate a random failure for testing retries
    if (Math.random() < 0.05) { // 5% chance of failure
      return { success: false, error: `Network error on chunk ${chunkIndex}` };
    }
    
    this.mockChunkStorage[uploadId].uploadedChunks.push(chunkIndex);
    return { success: true };
  }

  async uploadComplete(
    uploadId: string,
    fileName: string,
    fileHash: string,
    chunkCount: number
  ): Promise<ApiResponse<{ fileId: string; preview: DataPreview }>> {
    await this.delay(1000);
    
    const session = this.mockChunkStorage[uploadId];
    if (!session || session.uploadedChunks.length !== chunkCount) {
      return { success: false, error: 'File assembly failed: Missing chunks.' };
    }
    
    const fileId = `file_${Date.now()}`;
    session.fileId = fileId;
    session.status = 'completed';

    // Return the same preview as the old uploadData for consistency
    return {
      success: true,
      data: {
        fileId,
        preview: {
          columns: ['id', 'age', 'income', 'category', 'value'],
          rows: [
            { id: 1, age: 25, income: 45000, category: 'A', value: 120.5 },
            { id: 2, age: 34, income: 62000, category: 'B', value: 98.3 },
          ],
          rowCount: 1000,
          columnTypes: {
            id: 'integer',
            age: 'integer',
            income: 'float',
            category: 'string',
            value: 'float',
          },
        },
      },
    };
  }

  async uploadData(file: File): Promise<ApiResponse<{ fileId: string; preview: DataPreview }>> {
    await this.delay(1500);

    return {
      success: true,
      data: {
        fileId: `file_${Date.now()}`,
        preview: {
          columns: ['id', 'age', 'income', 'category', 'value'],
          rows: [
            { id: 1, age: 25, income: 45000, category: 'A', value: 120.5 },
            { id: 2, age: 34, income: 62000, category: 'B', value: 98.3 },
            { id: 3, age: 45, income: 78000, category: 'A', value: 156.7 },
            { id: 4, age: 28, income: 51000, category: 'C', value: 87.2 },
            { id: 5, age: 52, income: 95000, category: 'B', value: 203.4 },
          ],
          rowCount: 1000,
          columnTypes: {
            id: 'integer',
            age: 'integer',
            income: 'float',
            category: 'string',
            value: 'float',
          },
        },
      },
    };
  }

  async validateData(fileId: string): Promise<ApiResponse<{ valid: boolean; issues: string[] }>> {
    await this.delay(800);

    return {
      success: true,
      data: {
        valid: true,
        issues: [],
      },
    };
  }

  async getDataPreview(fileId: string, limit: number = 5): Promise<ApiResponse<DataPreview>> {
    await this.delay(500);

    return {
      success: true,
      data: {
        columns: ['id', 'age', 'income', 'category', 'value'],
        rows: [
          { id: 1, age: 25, income: 45000, category: 'A', value: 120.5 },
          { id: 2, age: 34, income: 62000, category: 'B', value: 98.3 },
          { id: 3, age: 45, income: 78000, category: 'A', value: 156.7 },
          { id: 4, age: 28, income: 51000, category: 'C', value: 87.2 },
          { id: 5, age: 52, income: 95000, category: 'B', value: 203.4 },
        ],
        rowCount: 1000,
        columnTypes: {
          id: 'integer',
          age: 'integer',
          income: 'float',
          category: 'string',
          value: 'float',
        },
      },
    };
  }

  async getPreprocessingSuggestions(fileId: string): Promise<ApiResponse<PreprocessingSuggestion[]>> {
    await this.delay(1000);

    return {
      success: true,
      data: [
        {
          type: 'remove_duplicates',
          description: 'Eliminate duplicate rows from the dataset',
          recommended: true,
        },
        {
          type: 'fill_missing',
          column: 'income',
          description: 'Fill missing values in income column with median',
          recommended: true,
        },
        {
          type: 'encode_categorical',
          column: 'category',
          description: 'Convert categorical data to numerical format',
          recommended: true,
        },
        {
          type: 'normalize',
          description: 'Scale numerical features to standard range (0-1)',
          recommended: false,
        },
        {
          type: 'remove_outliers',
          column: 'value',
          description: 'Remove statistical outliers from value column',
          recommended: false,
        },
      ],
    };
  }

  async applyPreprocessing(
    fileId: string,
    steps: PreprocessingSuggestion[]
  ): Promise<ApiResponse<{ processedFileId: string; summary: string }>> {
    await this.delay(2000);

    return {
      success: true,
      data: {
        processedFileId: `processed_${Date.now()}`,
        summary: `Successfully applied ${steps.length} preprocessing step(s). Dataset is now ready for model training.`,
      },
    };
  }

  async getFeatureEngineeringSuggestions(
    fileId: string
  ): Promise<ApiResponse<FeatureEngineeringSuggestion[]>> {
    await this.delay(1200);

    return {
      success: true,
      data: [
        {
          name: 'age_group',
          description: 'Create age groups (18-30, 31-45, 46-60, 60+) from age column',
          type: 'binning',
          columns: ['age'],
        },
        {
          name: 'income_category',
          description: 'Categorize income into Low, Medium, High brackets',
          type: 'binning',
          columns: ['income'],
        },
        {
          name: 'value_squared',
          description: 'Add polynomial feature (value²) for better model fit',
          type: 'polynomial',
          columns: ['value'],
        },
        {
          name: 'age_income_interaction',
          description: 'Create interaction feature between age and income',
          type: 'interaction',
          columns: ['age', 'income'],
        },
      ],
    };
  }

  async getModelRecommendations(fileId: string): Promise<ApiResponse<ModelRecommendation[]>> {
    await this.delay(1000);

    return {
      success: true,
      data: [
        {
          name: 'Random Forest',
          type: 'classification',
          description: 'Ensemble method that works well for classification tasks with high accuracy',
          recommended: true,
          defaultParams: {
            n_estimators: 100,
            max_depth: 10,
            min_samples_split: 2,
          },
        },
        {
          name: 'Logistic Regression',
          type: 'classification',
          description: 'Simple and interpretable model for binary/multiclass classification',
          recommended: true,
          defaultParams: {
            C: 1.0,
            max_iter: 100,
          },
        },
        {
          name: 'Gradient Boosting',
          type: 'classification',
          description: 'Powerful boosting algorithm that often achieves high performance',
          recommended: false,
          defaultParams: {
            n_estimators: 100,
            learning_rate: 0.1,
            max_depth: 3,
          },
        },
        {
          name: 'Support Vector Machine',
          type: 'classification',
          description: 'Effective for high-dimensional spaces and classification tasks',
          recommended: false,
          defaultParams: {
            C: 1.0,
            kernel: 'rbf',
          },
        },
      ],
    };
  }

  async uploadCustomModel(file: File): Promise<ApiResponse<{ modelId: string }>> {
    await this.delay(1500);

    return {
      success: true,
      data: {
        modelId: `model_${Date.now()}`,
      },
    };
  }

  async trainModel(
    fileId: string,
    modelName: string,
    targetColumn: string,
    params: Record<string, any> = {}
  ): Promise<ApiResponse<{ trainingId: string }>> {
    await this.delay(1000);

    return {
      success: true,
      data: {
        trainingId: `training_${Date.now()}`,
      },
    };
  }

  async getTrainingStatus(
    trainingId: string
  ): Promise<ApiResponse<{ status: 'pending' | 'training' | 'completed' | 'failed'; progress: number }>> {
    await this.delay(500);

    return {
      success: true,
      data: {
        status: 'completed',
        progress: 100,
      },
    };
  }

  async getModelMetrics(trainingId: string): Promise<ApiResponse<ModelMetrics>> {
    await this.delay(800);

    return {
      success: true,
      data: {
        accuracy: 0.92,
        precision: 0.89,
        recall: 0.91,
        f1Score: 0.90,
        loss: 0.15,
        confusionMatrix: [
          [150, 10],
          [8, 132],
        ],
        featureImportance: [
          { feature: 'income', importance: 0.35 },
          { feature: 'age', importance: 0.28 },
          { feature: 'value', importance: 0.22 },
          { feature: 'category', importance: 0.15 },
        ],
      },
    };
  }

  async getVisualizationSuggestions(fileId: string): Promise<ApiResponse<VisualizationSuggestion[]>> {
    await this.delay(1500);

    return {
      success: true,
      data: [
        {
          type: 'bar',
          title: 'Sales by Category',
          description: 'Compare sales performance across product categories',
          columns: ['Category'],
          rows: ['Sales'],
          recommended: true,
          reason: 'Your data has 5 distinct categories with strong variation in sales values - perfect for bar chart comparison',
        },
        {
          type: 'line',
          title: 'Sales Trend Over Time',
          description: 'Visualize how sales have changed month by month',
          columns: ['Date'],
          rows: ['Sales'],
          recommended: true,
          reason: 'Date field detected with continuous sales data - ideal for showing trends and seasonality',
        },
        {
          type: 'scatter',
          title: 'Sales vs Profit Correlation',
          description: 'Explore the relationship between sales and profitability',
          columns: ['Sales'],
          rows: ['Profit'],
          color: 'Region',
          recommended: true,
          reason: 'Strong positive correlation (0.82) detected between Sales and Profit - scatter plot will reveal outliers',
        },
        {
          type: 'pie',
          title: 'Regional Market Share',
          description: 'Show proportion of sales by region',
          columns: ['Region'],
          rows: ['Sales'],
          recommended: false,
          reason: 'Good for showing market share distribution, but bar chart may be clearer for 5 regions',
        },
        {
          type: 'bar',
          title: 'Top 10 Products by Revenue',
          description: 'Identify your best-performing products',
          columns: ['Product'],
          rows: ['Sales'],
          recommended: false,
          reason: 'Ranked comparison helps identify top performers quickly',
        },
        {
          type: 'area',
          title: 'Cumulative Sales Growth',
          description: 'Track cumulative sales performance over time',
          columns: ['Month'],
          rows: ['Sales'],
          recommended: false,
          reason: 'Area chart emphasizes growth trajectory and total accumulation',
        },
      ],
    };
  }

  async generateVisualization(
    fileId: string,
    vizType: string,
    config: any
  ): Promise<ApiResponse<{ chartData: any; imageUrl?: string }>> {
    await this.delay(1200);

    // Mock chart data based on visualization type
    const mockChartData: Record<string, any> = {
      scatter: [
        { age: 25, income: 45000 },
        { age: 34, income: 62000 },
        { age: 45, income: 78000 },
        { age: 28, income: 51000 },
        { age: 52, income: 95000 },
        { age: 38, income: 68000 },
        { age: 42, income: 72000 },
      ],
      histogram: [
        { range: '0-50', count: 120 },
        { range: '50-100', count: 350 },
        { range: '100-150', count: 280 },
        { range: '150-200', count: 180 },
        { range: '200+', count: 70 },
      ],
      bar: [
        { category: 'A', count: 450 },
        { category: 'B', count: 380 },
        { category: 'C', count: 170 },
      ],
      heatmap: {
        correlations: [
          ['age', 'income', 0.75],
          ['age', 'value', 0.42],
          ['income', 'value', 0.58],
        ],
      },
    };

    return {
      success: true,
      data: {
        chartData: mockChartData[vizType] || [],
      },
    };
  }

  async processNLQ(
    fileId: string,
    query: string
  ): Promise<ApiResponse<{ visualization: any; interpretation: string }>> {
    await this.delay(1500);

    return {
      success: true,
      data: {
        visualization: {
          type: 'scatter',
          data: [
            { age: 25, income: 45000 },
            { age: 34, income: 62000 },
            { age: 45, income: 78000 },
          ],
          config: {
            xAxis: 'age',
            yAxis: 'income',
          },
        },
        interpretation: 'The visualization shows a positive correlation between age and income in your dataset. As age increases, income tends to increase as well, with a correlation coefficient of approximately 0.75.',
      },
    };
  }

  async generateReport(projectData: any): Promise<ApiResponse<{ reportId: string }>> {
    await this.delay(2000);

    return {
      success: true,
      data: {
        reportId: `report_${Date.now()}`,
      },
    };
  }

  async downloadReport(reportId: string, format: 'pdf' | 'docx'): Promise<Blob | null> {
    await this.delay(1500);

    // Create a mock blob for download
    const content = `Mock ${format.toUpperCase()} Report - ID: ${reportId}`;
    return new Blob([content], { type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }

  async saveProject(projectData: any): Promise<ApiResponse<{ projectId: string }>> {
    await this.delay(1000);

    return {
      success: true,
      data: {
        projectId: `project_${Date.now()}`,
      },
    };
  }

  async getProject(projectId: string): Promise<ApiResponse<any>> {
    await this.delay(800);

    return {
      success: true,
      data: {
        id: projectId,
        name: 'Sample ML Project',
        createdAt: new Date().toISOString(),
      },
    };
  }

  async listProjects(): Promise<ApiResponse<any[]>> {
    await this.delay(800);

    return {
      success: true,
      data: [
        {
          id: 'project_1',
          name: 'Customer Analysis',
          createdAt: '2025-10-01T10:00:00Z',
        },
        {
          id: 'project_2',
          name: 'Sales Prediction',
          createdAt: '2025-10-05T14:30:00Z',
        },
      ],
    };
  }
}

export const mockApiService = new MockApiService();
