
import pandas as pd
import numpy as np
from typing import Dict, List, Any
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder
from sklearn.impute import SimpleImputer

def train_feature_discovery_model(df: pd.DataFrame, target_col: str, task: str) -> Dict[str, Any]:
    """
    Trains a Gradient Boosting model to discover feature importance and non-linear signal.
    """
    try:
        # Prepare data
        X = df.drop(columns=[target_col])
        y = df[target_col]
        
        # Handle simple preprocessing for the discovery model
        # (This is just for feature finding, not the final pipeline)
        
        # Encoder for categorical
        transformers = {}
        X_encoded = X.copy()
        
        for col in X_encoded.columns:
            if X_encoded[col].dtype == 'object' or X_encoded[col].dtype.name == 'category':
                le = LabelEncoder()
                # Handle unknown/new values by simple string conversion
                X_encoded[col] = le.fit_transform(X_encoded[col].astype(str))
                transformers[col] = le
        
        # Impute missing
        imputer = SimpleImputer(strategy='mean')
        X_matrix = imputer.fit_transform(X_encoded)
        feature_names = X_encoded.columns.tolist()
        
        model = None
        if task == 'classification':
            # Use smaller estimators for speed since this is just discovery
            model = GradientBoostingClassifier(n_estimators=100, max_depth=3, random_state=42)
            if y.dtype == 'object':
                y = LabelEncoder().fit_transform(y)
            model.fit(X_matrix, y)
        else:
            model = GradientBoostingRegressor(n_estimators=100, max_depth=3, random_state=42)
            model.fit(X_matrix, y)
            
        # Extract metadata
        importances = model.feature_importances_
        feature_imp = {feat: float(imp) for feat, imp in zip(feature_names, importances)}
        
        return {
            'feature_importances': feature_imp,
            'top_features': sorted(feature_imp.items(), key=lambda x: x[1], reverse=True)[:5],
            'model_type': 'Gradient Boosted Trees (sklearn)'
        }
        
    except Exception as e:
        print(f"ML Discovery Failed: {e}")
        return {}

def generate_ml_driven_suggestions(df: pd.DataFrame, profile: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Generate feature engineering suggestions based on ML model analysis.
    """
    suggestions = []
    target_info = profile.get('target', {})
    target_col = target_info.get('column')
    task = target_info.get('task')
    
    if not target_col or not task:
        return []
        
    discovery_result = train_feature_discovery_model(df, target_col, task)
    if not discovery_result:
        return []
        
    top_features = discovery_result.get('top_features', [])
    feature_importances = discovery_result.get('feature_importances', {})
    
    # 1. Non-linear transformations for Top Features
    for feat, imp in top_features:
        if imp > 0.05: # Threshold for "significant"
            # Only numeric features
            if pd.api.types.is_numeric_dtype(df[feat]):
                suggestions.append({
                    'type': 'polynomial_features',
                    'column': feat,
                    'description': f'Generate polynomial features for high-importance {feat}',
                    'recommended': True,
                    'rationale': f'ML Discovery: {feat} is a top predictor (Importance: {imp:.3f}). Polynomial expansion may capture non-linear signal detected by tree splits.',
                    'newFeatures': [f'{feat}_squared', f'{feat}_cubed'],
                    'impact': f'Adds 2 columns derived from {feat}',
                    'group': 'ml_driven',
                    'params': {'degree': 3}
                })
    
    # 2. Target-Aware Interactions
    # If top 2 features are numeric, suggest interaction
    numeric_top = [f[0] for f in top_features if pd.api.types.is_numeric_dtype(df[f[0]])]
    if len(numeric_top) >= 2:
        col1, col2 = numeric_top[0], numeric_top[1]
        combo_name = f"{col1}_x_{col2}"
        suggestions.append({
            'type': 'create_interaction',
            'column': f'{col1}, {col2}',
            'description': f'Create interaction: {col1} × {col2}',
            'recommended': True,
            'rationale': f'ML Discovery: {col1} and {col2} are the dominant predictors. Their interaction is likely to be a strong signal.',
            'newFeatures': [combo_name],
            'impact': 'Adds 1 interaction feature',
            'group': 'ml_driven',
            'params': {'col1': col1, 'col2': col2, 'operation': 'multiply'}
        })
        
    return suggestions
