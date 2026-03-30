import { DatasetAnalysis } from './datasetAnalyzer';

export interface ModelSuggestion {
  modelId: string;
  label: string;
  reason: string;
}

export interface PredictedPerformance {
  summary: string;
  metrics: string[];
}

export function suggestBestModel(analysis: DatasetAnalysis): ModelSuggestion {
  if (analysis.problemType === 'classification') {
    if (analysis.datasetSize === 'small') {
      return {
        modelId: 'logistic_regression',
        label: 'Logistic Regression',
        reason: 'Small classification datasets typically train fast and stay interpretable.',
      };
    }
    if (analysis.datasetSize === 'medium') {
      return {
        modelId: 'random_forest',
        label: 'Random Forest',
        reason: 'Medium classification datasets benefit from robust non-linear decision boundaries.',
      };
    }
    return {
      modelId: 'neural_network',
      label: 'Neural Network',
      reason: 'Large classification datasets can benefit from higher-capacity models.',
    };
  }

  const isLikelyLinear = analysis.featureCount <= 5 && analysis.missingValueRatio < 0.05;
  if (isLikelyLinear) {
    return {
      modelId: 'logistic_regression',
      label: 'Linear Regression (via Logistic/Linear option)',
      reason: 'Low-dimensional clean regression data is often well handled by linear regression.',
    };
  }
  return {
    modelId: 'random_forest',
    label: 'Random Forest Regressor',
    reason: 'Likely non-linear regression benefits from ensemble tree models.',
  };
}

export function predictPerformance(analysis: DatasetAnalysis, selectedModel?: string): PredictedPerformance {
  if (analysis.problemType === 'classification') {
    const base = analysis.datasetSize === 'small' ? '0.70-0.86' : analysis.datasetSize === 'medium' ? '0.78-0.90' : '0.82-0.93';
    return {
      summary: `Estimated classification performance for ${selectedModel || 'selected model'}.`,
      metrics: [
        `Accuracy (expected): ${base}`,
        'Precision: depends on class balance',
        'Recall: depends on class separability',
      ],
    };
  }

  const r2Base = analysis.datasetSize === 'small' ? '0.45-0.75' : analysis.datasetSize === 'medium' ? '0.55-0.82' : '0.62-0.88';
  return {
    summary: `Estimated regression performance for ${selectedModel || 'selected model'}.`,
    metrics: [
      `R² Score (expected): ${r2Base}`,
      'MAE: lower is better (data-scale dependent)',
      'RMSE: lower is better (sensitive to outliers)',
    ],
  };
}

