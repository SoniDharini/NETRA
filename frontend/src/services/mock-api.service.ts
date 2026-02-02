/**
 * Mock API Service
 * 
 * This provides mock responses for frontend development when the backend is not available.
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

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const originalData = {
  columns: ['ID', 'Name', 'Category', 'Price', 'Stock', 'Sales', 'OrderDate'],
  rows: [
    { ID: 1, Name: 'Laptop', Category: 'Electronics', Price: 1200, Stock: 50, Sales: 150, OrderDate: '2023-01-15' },
    { ID: 2, Name: 'Mouse', Category: 'Electronics', Price: 25, Stock: 200, Sales: 500, OrderDate: '2023-01-16' },
    { ID: 3, Name: 'Keyboard', Category: 'Electronics', Price: 75, Stock: 150, Sales: 300, OrderDate: '2023-01-17' },
    { ID: 4, Name: 'T-Shirt', Category: 'Apparel', Price: 20, Stock: 300, Sales: 800, OrderDate: '2023-01-18' },
    { ID: 5, Name: 'Jeans', Category: 'Apparel', Price: 60, Stock: 100, Sales: 250, OrderDate: '2023-01-19' },
    { ID: 1, Name: 'Laptop', Category: 'Electronics', Price: 1200, Stock: 50, Sales: 150, OrderDate: '2023-01-15' }, // Duplicate
    { ID: 6, Name: 'Coffee Maker', Category: 'Home Goods', Price: null, Stock: 80, Sales: 120, OrderDate: '2023-01-20' },
    { ID: 7, Name: 'Drill', Category: 'Tools', Price: 150, Stock: 40, Sales: 9999, OrderDate: '2023-01-21' }, // Outlier
  ],
};

class MockApiService {
  refreshToken(): ApiResponse<{ access: string; }> | PromiseLike<ApiResponse<{ access: string; }>> {
    throw new Error('Method not implemented.');
  }
  uploadJsonData(fileName: string, data: any[], onUploadProgress: (progressEvent: any) => void): ApiResponse<any> | PromiseLike<ApiResponse<any>> {
    throw new Error('Method not implemented.');
  }
  private processedDataStore: Map<string, { columns: string[], rows: any[] }> = new Map();

  async register(userData: any): Promise<ApiResponse<any>> {
    await delay(500);
    console.log('[Mock API] Register:', userData);
    return { success: true, data: { message: 'User registered successfully' } };
  }

  async login(credentials: any): Promise<ApiResponse<any>> {
    await delay(500);
    console.log('[Mock API] Login:', credentials);
    if (credentials.email === 'test@example.com' && credentials.password === 'password') {
      return { success: true, data: { accessToken: 'mock-access-token', refreshToken: 'mock-refresh-token' } };
    }
    return { success: false, error: 'Invalid credentials' };
  }
  
  async uploadDataset(file: File, onUploadProgress: (progressEvent: any) => void): Promise<ApiResponse<any>> {
    console.log('[Mock API] Uploading:', file.name);
    let progress = 0;
    const interval = setInterval(() => {
      progress += 25;
      onUploadProgress({ loaded: progress, total: 100 });
      if (progress >= 100) clearInterval(interval);
    }, 300);

    await delay(1300);
    return {
      success: true,
      data: {
        fileId: `mock_file_${Date.now()}`,
        message: 'File uploaded successfully',
        preview: {
          rows: originalData.rows.slice(0, 5),
          columns: originalData.columns,
        }
      }
    };
  }

  async getPreprocessingSuggestions(fileId: string): Promise<ApiResponse<PreprocessingSuggestion[]>> {
    await delay(1200);
    console.log(`[Mock API] Fetching preprocessing suggestions for: ${fileId}`);
    return {
      success: true,
      data: [
        { type: 'remove_duplicates', description: 'Remove 1 duplicate row', recommended: true, details: { count: 1 } },
        { type: 'fill_missing', description: 'Fill missing "Price" values with median', recommended: true, column: 'Price', details: { method: 'median', value: 75 } },
        { type: 'remove_outliers', description: 'Remove 1 outlier in "Sales" using IQR', recommended: true, column: 'Sales', details: { method: 'IQR', count: 1 } },
        { type: 'encode_categorical', description: 'One-hot encode "Category" column', recommended: true, column: 'Category', details: { strategy: 'one-hot' } },
        { type: 'normalize', description: 'Normalize numeric columns with StandardScaler', recommended: false, column: 'Price, Stock, Sales', details: { strategy: 'StandardScaler' } },
      ],
    };
  }

  async getFeatureEngineeringSuggestions(fileId: string): Promise<ApiResponse<FeatureEngineeringSuggestion[]>> {
    await delay(800);
    console.log(`[Mock API] Fetching feature engineering suggestions for: ${fileId}`);
    return {
      success: true,
      data: [
        { name: 'date_features', type: 'datetime_features', description: 'Extract Year, Month, Day from "OrderDate"', recommended: true, columns: ['OrderDate'], details: {} },
        { name: 'price_stock_ratio', type: 'interaction', description: 'Create "Price_x_Stock" interaction feature', recommended: true, columns: ['Price', 'Stock'], details: {} },
        { name: 'sales_per_day', type: 'polynomial', description: 'Generate polynomial features for "Sales"', recommended: false, columns: ['Sales'], details: { degree: 2 } },
      ],
    };
  }

  async applyPreprocessing(fileId: string, steps: (PreprocessingSuggestion | FeatureEngineeringSuggestion)[]): Promise<ApiResponse<{ processedFileId: string; summary: string; preview: DataPreview }>> {
    await delay(2000);
    
    // CRITICAL: This mock function simulates processing on the FULL `originalData` dataset.
    // It intentionally does not use any preview data.
    console.log(`[Mock API] Applying ${steps.length} steps to the full dataset of ${originalData.rows.length} rows for fileId: ${fileId}`);

    // Simulate full data transformation
    let processedRows = [...originalData.rows];
    // This is a simplified simulation. A real implementation would be more complex.
    if (steps.some(s => s.type === 'remove_duplicates')) {
        processedRows = processedRows.filter((row, index, self) =>
            index === self.findIndex((r) => (
                r.ID === row.ID
            ))
        );
    }
    if (steps.some(s => s.type === 'fill_missing' && s.column === 'Price')) {
        processedRows.forEach(r => { if (r.Price === null) r.Price = 75; });
    }
    if (steps.some(s => s.type === 'remove_outliers')) {
        processedRows.filter(r => r.Sales < 9000);
    }
    
    const processedColumns = ['ID', 'Name', 'Category', 'Price', 'Stock', 'Sales', 'OrderDate'];
    const processedFileId = `processed_${fileId}`;

    // Store the FULL processed dataset in memory for the download function to use.
    this.processedDataStore.set(processedFileId, { columns: processedColumns, rows: processedRows });
    console.log(`[Mock API] Stored ${processedRows.length} fully processed rows for fileId: ${processedFileId}`);

    return {
      success: true,
      data: {
        processedFileId: processedFileId,
        summary: `Applied ${steps.length} steps. Dataset now has ${processedRows.length} rows.`,
        // The preview is a separate, small slice of the full processed data.
        preview: {
          rows: processedRows.slice(0, 5),
          columns: processedColumns,
          rowCount: processedRows.length,
          columnTypes: {}
        },
      },
    };
  }
  
  async downloadFile(fileId: string): Promise<Blob | null> {
    await delay(700);
    
    // CRITICAL: This mock function retrieves the FULL processed dataset from the in-memory store.
    // It does not use a preview or a partial dataset.
    const data = this.processedDataStore.get(fileId);
    
    if (!data) {
      console.error(`[Mock API] No processed data found for fileId: ${fileId}`);
      return null;
    }

    console.log(`[Mock API] Downloading full dataset with ${data.rows.length} rows for fileId: ${fileId}`);

    const header = data.columns.join(',') + '\n';
    const body = data.rows.map(row => 
      data.columns.map(col => {
        const value = row[col];
        // Handle values that might contain commas
        if (typeof value === 'string' && value.includes(',')) {
          return `"${value}"`;
        }
        return value;
      }).join(',')
    ).join('\n');
    
    const csvContent = header + body;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return blob;
  }

  // Other mock methods can be added here as needed...
  async getDataPreview(fileId: string, limit: number = 5): Promise<ApiResponse<DataPreview>> {
    await delay(500);
    return { success: true, data: { ...originalData, rows: originalData.rows.slice(0, limit), rowCount: originalData.rows.length, columnTypes: {} }};
  }
  
  async getModelRecommendations(fileId: string): Promise<ApiResponse<ModelRecommendation[]>> {
      return {} as any;
  }
  
  async trainModel(fileId: string, modelName: string, targetColumn: string, params: Record<string, any>): Promise<ApiResponse<{ trainingId: string; }>> {
      return {} as any;
  }
  
  async getModelMetrics(trainingId: string): Promise<ApiResponse<ModelMetrics>> {
      return {} as any;
  }
  
  async getVisualizationSuggestions(fileId: string): Promise<ApiResponse<VisualizationSuggestion[]>> {
      return {} as any;
  }

  async generateVisualization(fileId: string, vizType: string, config: any): Promise<ApiResponse<{ chartData: any; imageUrl?: string; }>> {
      return {} as any;
  }
}

export const mockApiService = new MockApiService();
