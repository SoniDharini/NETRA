import pandas as pd
import numpy as np
from typing import Dict, List, Any
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.cluster import KMeans, DBSCAN
from sklearn.metrics import silhouette_score
from sklearn.neighbors import LocalOutlierFactor

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

def perform_unsupervised_discovery(df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Perform unsupervised pattern discovery (Clustering & Anomaly Detection).
    """
    suggestions = []
    
    # Select numeric columns for clustering
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if len(numeric_cols) < 2:
        return []
    
    # Preprocess for clustering: Impute & Scale
    try:
        X = df[numeric_cols].copy()
        imputer = SimpleImputer(strategy='median')
        X_imputed = imputer.fit_transform(X)
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_imputed)
        
        # Limit sample size for speed
        if len(X_scaled) > 5000:
             # Use sampling for discovery
             indices = np.random.choice(len(X_scaled), 5000, replace=False)
             X_sample = X_scaled[indices]
        else:
             X_sample = X_scaled
             
        # --- K-MEANS CLUSTERING ---
        best_score = -1
        best_k = 0
        
        # Try K from 2 to 6
        for k in range(2, 7):
            kmeans = KMeans(n_clusters=k, random_state=42, n_init=10)
            labels = kmeans.fit_predict(X_sample)
            score = silhouette_score(X_sample, labels)
            
            if score > best_score:
                best_score = score
                best_k = k
        
        # If we found a reasonable structure
        if best_score > 0.4: # Silhouette threshold
             suggestions.append({
                'type': 'cluster_segmentation',
                'description': f'Create K-Means Clusters (K={best_k})',
                'recommended': True,
                'rationale': f'Unsupervised Discovery: Found distinct groups with high silhouette score ({best_score:.2f}). Useful for segmentation.',
                'newFeatures': ['cluster_id'],
                'impact': 'Adds 1 categorical column (Cluster IDs)',
                'group': 'clustering',
                'params': {'n_clusters': best_k, 'columns': numeric_cols}
             })

        # --- DBSCAN CLUSTERING (HDBSCAN Proxy) ---
        # DBSCAN is density based, similar intent to HDBSCAN
        try:
            dbscan = DBSCAN(eps=0.5, min_samples=5)
            clusters_db = dbscan.fit_predict(X_sample)
            n_clusters_db = len(set(clusters_db)) - (1 if -1 in clusters_db else 0)
            
            if n_clusters_db > 1:
                 suggestions.append({
                    'type': 'cluster_dbscan',
                    'description': f'Create Density Clusters (DBSCAN/HDBSCAN)',
                    'recommended': False, # More experimental
                    'rationale': f'Unsupervised Discovery: Found {n_clusters_db} density-based clusters. Good for arbitrary shapes.',
                    'newFeatures': ['cluster_dbscan'],
                    'impact': 'Adds 1 categorical column',
                    'group': 'clustering',
                    'params': {'eps': 0.5, 'min_samples': 5}
                 })
        except Exception as db_err:
            pass

        # --- ANOMALY DETECTION (LOF) ---
        # Local Outlier Factor
        lof = LocalOutlierFactor(n_neighbors=20, contamination=0.05)
        # fit_predict returns 1 for inliers, -1 for outliers
        # We can't pickle LOF for prediction easily on new data without saving model, 
        # but for batch processing we can apply it.
        # Suggesting to add "is_anomaly" flag rather than dropping blindly
        
        suggestions.append({
            'type': 'detect_anomalies_lof',
            'description': 'Flag Local Outliers (LOF)',
            'recommended': True,
            'rationale': 'Identify local density anomalies using Local Outlier Factor. Adds a flag column rather than deleting rows.',
            'newFeatures': ['is_anomaly_lof'],
            'impact': 'Adds 1 binary column',
            'group': 'anomaly_detection',
            'params': {'n_neighbors': 20}
        })

    except Exception as e:
        print(f"Unsupervised discovery failed: {e}")
        
    return suggestions

