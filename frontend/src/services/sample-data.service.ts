/**
 * Sample Data Service
 * 
 * Generates realistic sample datasets for testing the visualization workspace
 * without requiring actual data uploads.
 */

export interface SampleDataset {
  name: string;
  description: string;
  rows: any[];
  rowCount: number;
}

const CATEGORIES = ['Electronics', 'Furniture', 'Office Supplies', 'Technology', 'Clothing'];
const REGIONS = ['East', 'West', 'North', 'South', 'Central'];
const PRODUCTS = [
  'Laptop', 'Desk', 'Notebook', 'Router', 'T-Shirt',
  'Monitor', 'Chair', 'Printer', 'Switch', 'Jacket',
  'Keyboard', 'Table', 'Pen', 'Cable', 'Shoes'
];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

class SampleDataService {
  /**
   * Generate sales dataset
   */
  generateSalesData(rowCount: number = 100): SampleDataset {
    const rows = [];
    const startDate = new Date('2024-01-01');

    for (let i = 0; i < rowCount; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + Math.floor(i / 5));

      const sales = Math.floor(Math.random() * 50000) + 10000;
      const discount = Math.random() * 0.3;
      const quantity = Math.floor(Math.random() * 100) + 10;
      const profit = sales * (0.15 + Math.random() * 0.25) - (sales * discount);

      rows.push({
        Date: date.toISOString().split('T')[0],
        Month: MONTHS[date.getMonth()],
        Year: date.getFullYear(),
        Category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
        Region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
        Product: PRODUCTS[Math.floor(Math.random() * PRODUCTS.length)],
        Sales: Math.round(sales),
        Profit: Math.round(profit),
        Quantity: quantity,
        Discount: Math.round(discount * 100) / 100,
        CustomerID: `CUST-${1000 + i}`,
        OrderID: `ORD-${10000 + i}`,
      });
    }

    return {
      name: 'Sales Data',
      description: 'Sample sales data with products, regions, and performance metrics',
      rows,
      rowCount: rows.length,
    };
  }

  /**
   * Generate customer dataset
   */
  generateCustomerData(rowCount: number = 50): SampleDataset {
    const rows = [];
    const segments = ['Consumer', 'Corporate', 'Home Office'];
    const sources = ['Website', 'Retail', 'Partner', 'Direct'];

    for (let i = 0; i < rowCount; i++) {
      const age = Math.floor(Math.random() * 40) + 25;
      const income = Math.floor(Math.random() * 80000) + 30000;
      const ltv = Math.floor(Math.random() * 50000) + 5000;

      rows.push({
        CustomerID: `CUST-${1000 + i}`,
        Age: age,
        Income: income,
        LifetimeValue: ltv,
        Segment: segments[Math.floor(Math.random() * segments.length)],
        Region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
        Source: sources[Math.floor(Math.random() * sources.length)],
        JoinDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), 1)
          .toISOString()
          .split('T')[0],
        OrderCount: Math.floor(Math.random() * 50) + 1,
        Active: Math.random() > 0.3,
      });
    }

    return {
      name: 'Customer Data',
      description: 'Customer demographics and behavior data',
      rows,
      rowCount: rows.length,
    };
  }

  /**
   * Generate product performance dataset
   */
  generateProductData(rowCount: number = 40): SampleDataset {
    const rows = [];

    for (let i = 0; i < rowCount; i++) {
      const revenue = Math.floor(Math.random() * 1000000) + 100000;
      const units = Math.floor(Math.random() * 5000) + 500;
      const rating = (Math.random() * 2 + 3).toFixed(1); // 3.0 - 5.0

      rows.push({
        ProductID: `PROD-${100 + i}`,
        ProductName: PRODUCTS[i % PRODUCTS.length] + ` ${Math.floor(i / PRODUCTS.length) + 1}`,
        Category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
        Revenue: revenue,
        UnitsSold: units,
        AveragePrice: Math.round(revenue / units),
        Rating: parseFloat(rating),
        ReviewCount: Math.floor(Math.random() * 1000) + 50,
        InStock: Math.random() > 0.2,
        LaunchDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), 1)
          .toISOString()
          .split('T')[0],
      });
    }

    return {
      name: 'Product Data',
      description: 'Product catalog with performance metrics',
      rows,
      rowCount: rows.length,
    };
  }

  /**
   * Generate time series dataset
   */
  generateTimeSeriesData(days: number = 365): SampleDataset {
    const rows = [];
    const startDate = new Date('2024-01-01');
    let baseValue = 1000;
    let trend = 5;

    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);

      // Add trend and seasonality
      const seasonal = Math.sin((i / 365) * 2 * Math.PI) * 200;
      const noise = (Math.random() - 0.5) * 100;
      const value = baseValue + (trend * i) + seasonal + noise;

      rows.push({
        Date: date.toISOString().split('T')[0],
        Month: MONTHS[date.getMonth()],
        Year: date.getFullYear(),
        Quarter: `Q${Math.floor(date.getMonth() / 3) + 1}`,
        DayOfWeek: date.toLocaleDateString('en-US', { weekday: 'long' }),
        Value: Math.round(value),
        MovingAvg7: Math.round(value + (Math.random() - 0.5) * 50),
        MovingAvg30: Math.round(value + (Math.random() - 0.5) * 30),
      });
    }

    return {
      name: 'Time Series Data',
      description: 'Daily metrics with trend and seasonality',
      rows,
      rowCount: rows.length,
    };
  }

  /**
   * Generate machine learning results dataset
   */
  generateMLResultsData(rowCount: number = 100): SampleDataset {
    const rows = [];
    const models = ['Random Forest', 'Logistic Regression', 'SVM', 'Neural Network', 'XGBoost'];
    const features = ['Feature_A', 'Feature_B', 'Feature_C', 'Feature_D', 'Feature_E'];

    for (let i = 0; i < rowCount; i++) {
      const actual = Math.random() > 0.5 ? 1 : 0;
      const predicted = Math.random() > 0.4 ? 1 : 0;
      const probability = Math.random();

      rows.push({
        ID: i + 1,
        Model: models[Math.floor(Math.random() * models.length)],
        Actual: actual,
        Predicted: predicted,
        Probability: Math.round(probability * 100) / 100,
        Correct: actual === predicted,
        Feature_A: Math.random() * 100,
        Feature_B: Math.random() * 100,
        Feature_C: Math.random() * 100,
        Feature_D: Math.random() * 100,
        Feature_E: Math.random() * 100,
        TrainingTime: Math.round(Math.random() * 1000) / 10,
      });
    }

    return {
      name: 'ML Results',
      description: 'Machine learning model predictions and features',
      rows,
      rowCount: rows.length,
    };
  }

  /**
   * Get all available sample datasets
   */
  getAllSampleDatasets(): { id: string; name: string; description: string }[] {
    return [
      { id: 'sales', name: 'Sales Data', description: '100 sales transactions' },
      { id: 'customers', name: 'Customer Data', description: '50 customer records' },
      { id: 'products', name: 'Product Data', description: '40 product listings' },
      { id: 'timeseries', name: 'Time Series', description: '365 days of metrics' },
      { id: 'ml-results', name: 'ML Results', description: '100 prediction records' },
    ];
  }

  /**
   * Get sample dataset by ID
   */
  getSampleDataset(id: string, customRowCount?: number): SampleDataset | null {
    switch (id) {
      case 'sales':
        return this.generateSalesData(customRowCount || 100);
      case 'customers':
        return this.generateCustomerData(customRowCount || 50);
      case 'products':
        return this.generateProductData(customRowCount || 40);
      case 'timeseries':
        return this.generateTimeSeriesData(customRowCount || 365);
      case 'ml-results':
        return this.generateMLResultsData(customRowCount || 100);
      default:
        return null;
    }
  }

  /**
   * Generate correlation dataset (for scatter plots)
   */
  generateCorrelationData(
    count: number = 50,
    correlation: 'strong' | 'moderate' | 'weak' = 'moderate'
  ): any[] {
    const rows = [];
    const correlationStrength = correlation === 'strong' ? 0.9 : correlation === 'moderate' ? 0.6 : 0.3;

    for (let i = 0; i < count; i++) {
      const x = Math.random() * 100;
      const noise = (Math.random() - 0.5) * 50 * (1 - correlationStrength);
      const y = x * correlationStrength + noise + 10;

      rows.push({
        X: Math.round(x * 10) / 10,
        Y: Math.round(y * 10) / 10,
        Category: CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)],
        Size: Math.floor(Math.random() * 100) + 10,
      });
    }

    return rows;
  }
}

export const sampleDataService = new SampleDataService();
