"""
Preprocessing Service for Dataset Operations

This service handles:
- Loading full datasets from stored files
- Dataset profiling (missing values, duplicates, outliers, types)
- Generating preprocessing suggestions
- Applying preprocessing steps to full datasets
- Storing preprocessed datasets
"""
import pandas as pd
import numpy as np
import os
from typing import Dict, List, Any, Tuple, Optional
from pathlib import Path
import uuid
import warnings
from sklearn.preprocessing import StandardScaler, MinMaxScaler, RobustScaler, LabelEncoder
from sklearn.impute import SimpleImputer, KNNImputer
from sklearn.ensemble import IsolationForest
from sklearn.cluster import KMeans
from sklearn.neighbors import LocalOutlierFactor
from sklearn.impute import SimpleImputer, KNNImputer
from sklearn.decomposition import PCA
from sklearn.feature_selection import mutual_info_classif, mutual_info_regression
from scipy import stats

# Import enhanced feature engineering utilities
try:
    from .enhanced_features import (
        detect_datetime_columns,
        detect_text_columns,
        generate_enhanced_feature_engineering_suggestions,
        apply_enhanced_feature_engineering
    )
    HAS_ENHANCED_FEATURES = True
    
    from .ml_feature_discovery import generate_ml_driven_suggestions, perform_unsupervised_discovery
    HAS_ML_DISCOVERY = True
    
except ImportError:
    HAS_ENHANCED_FEATURES = False
    HAS_ML_DISCOVERY = False
    print("Enhanced feature modules not available")

# Suppress warnings for cleaner logs
warnings.filterwarnings('ignore')

class PreprocessingService:
    """Service for dataset preprocessing operations"""
    
    def __init__(self):
        self.scalers = {
            'standard': StandardScaler,
            'minmax': MinMaxScaler,
            'robust': RobustScaler,
        }
    
    def load_dataset(self, file_path: str) -> pd.DataFrame:
        """Load the full dataset from file path"""
        file_ext = Path(file_path).suffix.lower()
        
        if not os.path.exists(file_path):
             # Try determining if it's relative to MEDIA_ROOT? 
             # Assuming absolute path provided by Django's dataset.file.path
             raise FileNotFoundError(f"File not found at {file_path}")

        try:
            df = pd.DataFrame()
            if file_ext == '.csv':
                try:
                    df = pd.read_csv(file_path, encoding='utf-8')
                except UnicodeDecodeError:
                    try:
                        df = pd.read_csv(file_path, encoding='latin1')
                    except UnicodeDecodeError:
                        df = pd.read_csv(file_path, encoding='iso-8859-1')
            elif file_ext in ['.xlsx', '.xls']:
                df = pd.read_excel(file_path)
            elif file_ext == '.json':
                df = pd.read_json(file_path)
            else:
                raise ValueError(f"Unsupported file format: {file_ext}")
            
            if df.empty:
                raise ValueError("Dataset is empty.")
            return df
        except Exception as e:
            raise ValueError(f"Failed to load dataset: {str(e)}")
    
    def profile_dataset(self, df: pd.DataFrame) -> Dict[str, Any]:
        """
        Generate comprehensive profile of the dataset.
        Returns statistics on full dataset.
        """
        profile = {
            'rowCount': len(df),
            'columnCount': len(df.columns),
            'columns': list(df.columns),
            'columnTypes': {col: str(df[col].dtype) for col in df.columns},
            'missingValues': {},
            'duplicateRows': int(df.duplicated().sum()),
            'numericStats': {},
            'outliers': {},
            'correlations': {},
            'skewness': {},
            'kurtosis': {}
        }
        
        # Missing values analysis (on full dataset)
        for col in df.columns:
            missing_count = df[col].isna().sum()
            if missing_count > 0:
                profile['missingValues'][col] = {
                    'count': int(missing_count),
                    'percent': float((missing_count / len(df)) * 100)
                }
        
        # Numeric statistics (on full dataset)
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        
        # Correlation Matrix
        if len(numeric_cols) > 1:
            try:
                corr_matrix = df[numeric_cols].corr(method='pearson').abs()
                # Create a simplified correlation dictionary (pairs with > 0.7 correlation)
                for i in range(len(numeric_cols)):
                    for j in range(i+1, len(numeric_cols)):
                        col1 = numeric_cols[i]
                        col2 = numeric_cols[j]
                        val = corr_matrix.iloc[i, j]
                        if val > 0.7:
                             profile['correlations'][f"{col1}|{col2}"] = float(val)
                
                # Also calculate Spearman
                corr_matrix_spearman = df[numeric_cols].corr(method='spearman').abs()
                for i in range(len(numeric_cols)):
                    for j in range(i+1, len(numeric_cols)):
                        col1 = numeric_cols[i]
                        col2 = numeric_cols[j]
                        val = corr_matrix_spearman.iloc[i, j]
                        if val > 0.7:
                              profile['correlations'][f"{col1}|{col2}_spearman"] = float(val)

            except Exception:
                pass

        for col in numeric_cols:
            if df[col].notna().sum() > 0:
                profile['numericStats'][col] = {
                    'mean': float(df[col].mean()),
                    'std': float(df[col].std()) if df[col].std() is not pd.NA else 0.0,
                    'min': float(df[col].min()),
                    'max': float(df[col].max()),
                    'median': float(df[col].median()),
                }
                
                # Skewness and Kurtosis
                try:
                    skew_val = df[col].skew()
                    kurt_val = df[col].kurtosis()
                    profile['skewness'][col] = float(skew_val) if not pd.isna(skew_val) else 0.0
                    profile['kurtosis'][col] = float(kurt_val) if not pd.isna(kurt_val) else 0.0
                except:
                    pass

                # Detect outliers using IQR method (on full dataset)
                Q1 = df[col].quantile(0.25)
                Q3 = df[col].quantile(0.75)
                IQR = Q3 - Q1
                outliers = ((df[col] < (Q1 - 1.5 * IQR)) | (df[col] > (Q3 + 1.5 * IQR))).sum()
                
                if outliers > 0:
                    profile['outliers'][col] = {
                        'count': int(outliers),
                        'percent': float((outliers / len(df)) * 100),
                        'method': 'IQR'
                    }
        
        # Try to detect target column
        profile['target'] = self._detect_target_column(df)
        
        # Unsupervised Outlier Detection (Isolation Forest)
        if len(numeric_cols) > 0:
            try:
                # Use a sample if dataset is too large to speed up profiling
                sample_df = df[numeric_cols].dropna()
                if len(sample_df) > 10000:
                    sample_df = sample_df.sample(10000, random_state=42)
                
                iso_forest = IsolationForest(contamination=0.05, random_state=42)
                preds = iso_forest.fit_predict(sample_df)
                n_outliers = (preds == -1).sum()
                profile['unsupervisedOutliers'] = {
                    'count': int(n_outliers),
                    'percent': float(n_outliers / len(sample_df) * 100),
                    'method': 'IsolationForest'
                }
            except Exception:
                pass

        return profile
    
    def _detect_target_column(self, df: pd.DataFrame) -> Optional[Dict[str, Any]]:
        """Attempt to detect the target column and task type"""
        # Common target column names
        target_candidates = ['target', 'label', 'class', 'y', 'output', 'outcome', 'price', 'salary', 'churn']
        
        target_col = None
        for candidate in target_candidates:
            if candidate in df.columns: # restricted matching
                target_col = candidate
                break
        else:
             # Case-insensitive check
             for Col in df.columns:
                 if Col.lower() in target_candidates:
                     target_col = Col
                     break

        # If not found, use the last column as a heuristic
        if not target_col and len(df.columns) > 0:
            target_col = df.columns[-1]
        
        if not target_col:
            return None
        
        return self._analyze_target(df, target_col)

    def _analyze_target(self, df: pd.DataFrame, target_col: str) -> Dict[str, Any]:
        # Determine task type
        unique_values = df[target_col].nunique()
        task = 'unknown'
        
        if pd.api.types.is_numeric_dtype(df[target_col]):
            if unique_values <= 20: # Heuristic for classification vs regression
                task = 'classification'
            else:
                task = 'regression'
        else:
            task = 'classification'
        
        result = {
            'column': target_col,
            'task': task,
        }
        
        # Add distribution for classification
        if task == 'classification':
            value_counts = df[target_col].value_counts()
            result['distribution'] = [
                {'label': str(label), 'count': int(count), 'percent': float((count / len(df)) * 100)}
                for label, count in value_counts.items()
            ]
            
            # Check for class imbalance
            if len(value_counts) > 1:
                max_count = value_counts.max()
                min_count = value_counts.min()
                ratio = max_count / min_count if min_count > 0 else float('inf')
                
                result['classImbalance'] = {
                    'isImbalanced': ratio > 3,
                    'ratio': float(ratio),
                    'note': f'Majority class is {ratio:.1f}x more frequent than minority class' if ratio > 3 else None
                }
        
        return result

    def calculate_mutual_information(self, df: pd.DataFrame, target_col: str, task: str) -> Dict[str, float]:
        """Calculate Mutual Information between features and target"""
        if target_col not in df.columns:
            return {}
            
        try:
            # Prepare data: Label Encode categorical features
            df_encoded = df.copy()
            
            # Drop columns that are not useful for MI (like IDs, unique identifiers if string)
            # For simplicity, we try to encode everything
            for col in df_encoded.columns:
                if df_encoded[col].dtype == 'object' or df_encoded[col].dtype.name == 'category':
                    try:
                         le = LabelEncoder()
                         df_encoded[col] = le.fit_transform(df_encoded[col].astype(str))
                    except:
                         # If encoding fails, drop the column
                         df_encoded = df_encoded.drop(columns=[col])

            # Fill missing values
            df_encoded = df_encoded.fillna(0) # Simple fill for MI check
            
            # Ensure all are numeric
            df_encoded = df_encoded.select_dtypes(include=[np.number])
            
            if target_col not in df_encoded.columns:
                 return {}

            X = df_encoded.drop(columns=[target_col])
            y = df_encoded[target_col]
            
            if X.empty:
                return {}

            if task == 'classification':
                if y.dtype == 'float':
                     y = y.astype(int)
                mi_scores = mutual_info_classif(X, y, random_state=42)
            else:
                mi_scores = mutual_info_regression(X, y, random_state=42)
            
            return {col: float(score) for col, score in zip(X.columns, mi_scores)}
            
        except Exception as e:
            print(f"Error calculating MI: {e}")
            return {}

    def generate_preprocessing_suggestions(self, df: pd.DataFrame, profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate AI-driven preprocessing suggestions based on data profile & MI"""
        suggestions = []
        target_info = profile.get('target', {})
        target_col = target_info.get('column')
        task = target_info.get('task')
        
        # Calculate MI if target exists
        mi_scores = {}
        if target_col and task:
             mi_scores = self.calculate_mutual_information(df, target_col, task)
        
        # 1. Remove duplicates
        if profile['duplicateRows'] > 0:
            suggestions.append({
                'type': 'remove_duplicates',
                'description': f'Remove {profile["duplicateRows"]} duplicate rows',
                'recommended': True,
                'rationale': f'Found {profile["duplicateRows"]} duplicates. Removing them prevents data leakage and bias.',
                'group': 'cleaning',
                'params': {}
            })
        
        # 2. Handle missing values
        for col, info in profile['missingValues'].items():
            mi_score = mi_scores.get(col, 0)
            
            if info['percent'] > 50:
                # Logic: If >50% missing AND Low MI -> Drop
                # If >50% missing BUT High MI -> Advanced Imputation needed (but for now drop heavily missing)
                
                suggestions.append({
                    'type': 'drop_column',
                    'column': col,
                    'description': f'Drop column {col} ({info["percent"]:.1f}% missing)',
                    'recommended': True,
                    'rationale': f'Column {col} is missing {info["percent"]:.1f}% of data. Imputation would introduce too much noise.',
                    'group': 'cleaning',
                    'params': {}
                })
            else:
                # Suggest imputation
                col_dtype = df[col].dtype
                is_numeric = pd.api.types.is_numeric_dtype(col_dtype)
                
                # If High MI and missing, use KNN (Intelligent)
                # If Low MI/Generic, use Median/Most Frequent
                strategy = 'median' if is_numeric else 'most_frequent'
                if mi_score > 0.05 and is_numeric and len(df) < 10000: # Only use KNN for smaller datasets to save time
                     strategy = 'knn'
                     
                suggestions.append({
                    'type': 'fill_missing',
                    'column': col,
                    'description': f'Fill missing values in {col} ({info["count"]} rows) using {strategy}',
                    'recommended': True,
                    'rationale': f'Missing values found. Using {strategy} imputation as it preserves distribution better.',
                    'group': 'cleaning',
                    'params': {'strategy': strategy}
                })
        
        # 3. Handle Outliers
        for col, info in profile.get('outliers', {}).items():
            if info['percent'] < 5: 
                suggestions.append({
                    'type': 'remove_outliers',
                    'column': col,
                    'description': f'Remove outliers from {col} ({info["count"]} rows detected)',
                    'recommended': False, # User discretional
                    'rationale': f'Outliers can skew model training. Detected via IQR method.',
                    'group': 'cleaning',
                    'params': {'method': 'iqr'}
                })
        
        # 4. Unsupervised Outlier Removal (Isolation Forest)
        if profile.get('unsupervisedOutliers', {}).get('count', 0) > 0:
             count = profile['unsupervisedOutliers']['count']
             suggestions.append({
                'type': 'remove_outliers_isolation_forest',
                'description': f'Remove {count} anomalies detected by Isolation Forest',
                'recommended': False, 
                'rationale': 'Isolation Forest identified these rows as anomalous in the multi-dimensional space.',
                'group': 'cleaning',
                'params': {'contamination': 0.05}
             })

        # 5. Encoding
        categorical_cols = df.select_dtypes(include=['object', 'category']).columns
        for col in categorical_cols:
            if col != target_col:
                unique_count = df[col].nunique()
                # If cardinality is high -> Label/Frequency/Target Encoding
                # If low -> One-Hot
                
                if unique_count <= 10:
                    encoding_type = 'onehot'
                    rationale = f'Low cardinality ({unique_count}). One-hot encoding is suitable.'
                else:
                    encoding_type = 'label' # Default to label for simplicity in generic app
                    rationale = f'High cardinality ({unique_count}). Label encoding is efficient.'
                
                suggestions.append({
                    'type': 'encode_categorical',
                    'column': col,
                    'description': f'Encode {col} using {encoding_type} encoding',
                    'recommended': True,
                    'rationale': rationale,
                    'group': 'encoding',
                    'params': {'encoding': encoding_type}
                })
        
        # 6. Scaling
        # Only scale if we have numeric columns and they have different ranges or high variance
        numeric_cols = df.select_dtypes(include=[np.number]).columns
        if len(numeric_cols) > 0:
            # Check skewness to decide between Standard and Robust
            max_skew = max([abs(profile.get('skewness', {}).get(c, 0)) for c in numeric_cols], default=0)
            
            scaler_type = 'standard'
            rationale = 'Standardize numeric features to mean=0, std=1.'
            if max_skew > 1.5:
                 scaler_type = 'robust'
                 rationale = 'Data contains skewed features/outliers. RobustScaler is recommended.'
            
            suggestions.append({
                'type': 'normalize',
                'description': f'Normalize numeric features using {scaler_type} scaler',
                'recommended': True,
                'rationale': rationale,
                'group': 'scaling',
                'params': {'scaler': scaler_type}
            })
            
        # 7. Low MI Feature Removal (Feature Selection)
        if mi_scores:
            low_mi_threshold = 0.005
            for col, score in mi_scores.items():
                if score < low_mi_threshold and col != target_col:
                     suggestions.append({
                        'type': 'drop_column',
                        'column': col,
                        'description': f'Drop low-information feature {col}',
                        'recommended': False, # Cautious recommendation
                        'rationale': f'Mutual Information score is very low ({score:.4f}). This feature likely adds noise.',
                        'group': 'feature_selection',
                        'params': {}
                     })
        
        # 8. PCA Suggestion (Dimensionality Reduction)
        if len(numeric_cols) > 5: # Heuristic
             # Check if we have high multicollinearity or just many features
             if len(profile.get('correlations', {})) > 5:
                  suggestions.append({
                      'type': 'reduce_dimensions_pca',
                      'description': f'Apply PCA to reduce dimensionality (high correlation detected)',
                      'recommended': False, # Recommend inspection
                      'rationale': f'Detected high correlation between features. PCA can reduce dimensions while preserving variance.',
                      'group': 'feature_selection',
                      'params': {'n_components': 0.95} # 95% variance
                  })

        return suggestions

    def generate_feature_engineering_suggestions(self, df: pd.DataFrame, profile: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate AI-driven feature engineering suggestions"""
        suggestions = []  # Initialize suggestions list
        target_info = profile.get('target', {})
        target_col = target_info.get('column')
        task = target_info.get('task')
        
        mi_scores = {}
        if target_col:
             mi_scores = self.calculate_mutual_information(df, target_col, task)
             
        if HAS_ENHANCED_FEATURES:
            suggestions.extend(generate_enhanced_feature_engineering_suggestions(df, profile, mi_scores))
            
        if HAS_ML_DISCOVERY:
            # Add model-based suggestions
            ml_suggestions = generate_ml_driven_suggestions(df, profile)
            suggestions.extend(ml_suggestions)
            
            # Add unsupervised discovery suggestions
            unsupervised_suggestions = perform_unsupervised_discovery(df)
            suggestions.extend(unsupervised_suggestions)
            
        if HAS_ENHANCED_FEATURES or HAS_ML_DISCOVERY:
             return suggestions
            
        # Fallback to basic if enhanced module failed to import
        suggestions = []
        numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
        if target_col in numeric_cols: numeric_cols.remove(target_col)
        
        # 1. Interaction Features (between high MI features)
        if len(mi_scores) >= 2:
            sorted_mi = sorted([k for k in mi_scores.keys() if k in numeric_cols], key=lambda k: mi_scores[k], reverse=True)
            if len(sorted_mi) >= 2:
                col1, col2 = sorted_mi[0], sorted_mi[1]
                suggestions.append({
                    'type': 'create_interaction',
                    'column': f'{col1}, {col2}',
                    'description': f'Create interaction feature: {col1} * {col2}',
                    'recommended': True,
                    'rationale': f'Both {col1} and {col2} have high info content.',
                    'group': 'creation',
                    'params': {'col1': col1, 'col2': col2, 'operation': 'multiply'}
                })
        
        return suggestions

    def apply_preprocessing(
        self, 
        df: pd.DataFrame, 
        steps: List[Dict[str, Any]]
    ) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        """
        Apply preprocessing steps to the FULL dataset.
        """
        df_processed = df.copy()
        before_shape = df_processed.shape
        applied_steps = []
        removed_features = []
        engineered_features = []
        
        for step in steps:
            step_type = step.get('type', '')
            column = step.get('column')
            params = step.get('params', {})
            
            try:
                # --- CLEANING ---
                if step_type == 'remove_duplicates':
                    before_cnt = len(df_processed)
                    df_processed = df_processed.drop_duplicates()
                    applied_steps.append({'type': step_type, 'description': f'Removed {before_cnt - len(df_processed)} duplicates'})
                
                elif step_type == 'drop_column' and column in df_processed.columns:
                    df_processed = df_processed.drop(columns=[column])
                    removed_features.append(column)
                    applied_steps.append({'type': step_type, 'description': f'Dropped {column}'})
                
                elif step_type == 'fill_missing' and column in df_processed.columns:
                    strategy = params.get('strategy', 'mean')
                    if strategy == 'knn':
                         imputer = KNNImputer(n_neighbors=5)
                         df_processed[column] = imputer.fit_transform(df_processed[[column]])
                    else:
                         imputer = SimpleImputer(strategy=strategy)
                         df_processed[column] = imputer.fit_transform(df_processed[[column]]) # Returns 2D array
                    
                    applied_steps.append({'type': step_type, 'description': f'Filled missing in {column} ({strategy})'})
                
                elif step_type == 'remove_outliers' and column in df_processed.columns:
                    # IQR method
                    Q1 = df_processed[column].quantile(0.25)
                    Q3 = df_processed[column].quantile(0.75)
                    IQR = Q3 - Q1
                    mask = ~((df_processed[column] < (Q1 - 1.5 * IQR)) | (df_processed[column] > (Q3 + 1.5 * IQR)))
                    df_processed = df_processed[mask]
                    applied_steps.append({'type': step_type, 'description': f'Removed outliers in {column} (IQR)'})
                
                elif step_type == 'remove_outliers_isolation_forest':
                    numeric_cols = df_processed.select_dtypes(include=[np.number]).columns
                    if len(numeric_cols) > 0:
                         iso = IsolationForest(contamination=params.get('contamination', 0.05), random_state=42)
                         preds = iso.fit_predict(df_processed[numeric_cols].fillna(0))
                         df_processed = df_processed[preds == 1]
                         applied_steps.append({'type': step_type, 'description': 'Removed anomalies via Isolation Forest'})

                # --- ENCODING ---
                elif step_type == 'encode_categorical' and column in df_processed.columns:
                    encoding = params.get('encoding', 'onehot')
                    if encoding == 'onehot':
                        dummies = pd.get_dummies(df_processed[column], prefix=column)
                        df_processed = pd.concat([df_processed.drop(columns=[column]), dummies], axis=1)
                        removed_features.append(column)
                        engineered_features.extend(dummies.columns.tolist())
                    else:
                        le = LabelEncoder()
                        df_processed[column] = le.fit_transform(df_processed[column].astype(str))
                    
                    applied_steps.append({'type': step_type, 'description': f'Encoded {column} ({encoding})'})

                # --- SCALING ---
                elif step_type == 'normalize':
                     scaler_type = params.get('scaler', 'standard')
                     numeric_cols = df_processed.select_dtypes(include=[np.number]).columns.tolist()
                     if numeric_cols:
                         if scaler_type == 'robust': scaler = RobustScaler()
                         elif scaler_type == 'minmax': scaler = MinMaxScaler()
                         else: scaler = StandardScaler()
                         
                         df_processed[numeric_cols] = scaler.fit_transform(df_processed[numeric_cols])
                         applied_steps.append({'type': step_type, 'description': f'Scaled numeric features ({scaler_type})'})

                # --- FEATURE ENGINEERING ---
                elif step_type == 'create_interaction':
                     col1 = params.get('col1')
                     col2 = params.get('col2')
                     if col1 in df_processed.columns and col2 in df_processed.columns:
                         new_col_name = f"{col1}_x_{col2}"
                         df_processed[new_col_name] = df_processed[col1] * df_processed[col2]
                         engineered_features.append(new_col_name)
                         applied_steps.append({'type': step_type, 'description': f'Created interaction {new_col_name}'})

                elif step_type == 'log_transform' and column in df_processed.columns:
                     df_processed[column] = np.log1p(df_processed[column])
                     applied_steps.append({'type': step_type, 'description': f'Log transformed {column}'})
                     
                elif step_type == 'binning' and column in df_processed.columns:
                     bins = params.get('bins', 5)
                     strategy = params.get('strategy', 'uniform')
                     if strategy == 'quantile':
                         df_processed[f'{column}_binned'] = pd.qcut(df_processed[column], q=bins, labels=False, duplicates='drop')
                     else:
                         df_processed[f'{column}_binned'] = pd.cut(df_processed[column], bins=bins, labels=False)
                     engineered_features.append(f'{column}_binned')
                     applied_steps.append({'type': step_type, 'description': f'Binned {column} into {bins} bins ({strategy})'})

                elif step_type in ['polynomial_features', 'datetime_features', 'target_encoding', 'text_features', 'group_aggregate', 'calculate_age', 'create_ratio']:
                     if HAS_ENHANCED_FEATURES:
                         df_processed = apply_enhanced_feature_engineering(df_processed, step)
                         
                         desc_map = {
                             'polynomial_features': f'Created polynomial features for {column}',
                             'datetime_features': f'Extracted datetime from {column}',
                             'target_encoding': f'Target encoded {column}',
                             'text_features': f'Extracted text features from {column}',
                             'group_aggregate': f'Created group aggregate: {column}',
                             'calculate_age': f'Calculated age from {column}',
                             'create_ratio': f'Created ratio feature'
                         }
                         
                         # Track features based on type
                         if step_type == 'polynomial_features':
                              engineered_features.extend([f'{column}_squared', f'{column}_cubed'])
                         elif step_type == 'datetime_features':
                              engineered_features.extend([f'{column}_year', f'{column}_month', f'{column}_day', f'{column}_weekday'])
                         elif step_type == 'target_encoding':
                              engineered_features.append(f'{column}_target_enc')
                         elif step_type == 'text_features':
                              engineered_features.extend([f'{column}_length', f'{column}_word_count'])
                         elif step_type == 'group_aggregate':
                              agg_col = params.get('agg_col')
                              group_col = params.get('group_col')
                              agg_func = params.get('agg_func', 'mean')
                              engineered_features.append(f'{agg_col}_{agg_func}_by_{group_col}')
                         elif step_type == 'calculate_age':
                              engineered_features.append(f'{column}_age')
                         elif step_type == 'create_ratio':
                               num = params.get('col_num')
                               denom = params.get('col_denom')
                               engineered_features.append(f'{num}_div_{denom}')

                         applied_steps.append({'type': step_type, 'description': desc_map.get(step_type, f'Applied {step_type}')})
                     else:
                        print(f"Warning: Step {step_type} requested but enhanced features module missing")
                
                elif step_type == 'cluster_segmentation':
                     try:
                         n_clusters = params.get('n_clusters', 3)
                         cols = params.get('columns')
                         
                         # Use provided columns or fall back to all numeric
                         numeric_cols = df_processed.select_dtypes(include=[np.number]).columns
                         use_cols = [c for c in cols if c in df_processed.columns] if cols else numeric_cols
                         
                         if len(use_cols) > 0:
                             # Impute for clustering
                             X = df_processed[use_cols].fillna(df_processed[use_cols].median())
                             # Scale
                             scaler = StandardScaler()
                             X_scaled = scaler.fit_transform(X)
                             
                             kmeans = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
                             df_processed['cluster_id'] = kmeans.fit_predict(X_scaled)
                             engineered_features.append('cluster_id')
                             applied_steps.append({'type': step_type, 'description': f'Created {n_clusters} clusters using KMeans'})
                     except Exception as e:
                         print(f"Error applying clustering: {e}")
                
                elif step_type == 'cluster_dbscan':
                     try:
                         eps = params.get('eps', 0.5)
                         min_samples = params.get('min_samples', 5)
                         numeric_cols = df_processed.select_dtypes(include=[np.number]).columns
                         
                         if len(numeric_cols) > 0:
                             from sklearn.cluster import DBSCAN
                             X = df_processed[numeric_cols].fillna(df_processed[numeric_cols].median())
                             scaler = StandardScaler()
                             X_scaled = scaler.fit_transform(X)
                             
                             # Use simple sampling if too large, DBSCAN is O(N^2) worst case usually
                             if len(X) > 20000:
                                  print("Skipping DBSCAN on large dataset for safety")
                             else:
                                 dbscan = DBSCAN(eps=eps, min_samples=min_samples)
                                 clusters = dbscan.fit_predict(X_scaled)
                                 df_processed['cluster_dbscan'] = clusters
                                 engineered_features.append('cluster_dbscan')
                                 applied_steps.append({'type': step_type, 'description': f'Created clusters using DBSCAN (eps={eps})'})
                     except Exception as e:
                         print(f"Error applying DBSCAN: {e}")
                
                elif step_type == 'detect_anomalies_lof':
                     try:
                         n_neighbors = params.get('n_neighbors', 20)
                         numeric_cols = df_processed.select_dtypes(include=[np.number]).columns
                         
                         if len(numeric_cols) > 0:
                             X = df_processed[numeric_cols].fillna(df_processed[numeric_cols].median())
                             scaler = StandardScaler()
                             X_scaled = scaler.fit_transform(X)
                             
                             lof = LocalOutlierFactor(n_neighbors=n_neighbors)
                             # -1 is outlier, 1 is inlier. Convert to 1 (anomaly) vs 0 (normal)
                             preds = lof.fit_predict(X_scaled)
                             df_processed['is_anomaly_lof'] = np.where(preds == -1, 1, 0)
                             engineered_features.append('is_anomaly_lof')
                             applied_steps.append({'type': step_type, 'description': f'Flagged anomalies using LOF (neighbors={n_neighbors})'})
                     except Exception as e:
                         print(f"Error applying LOF: {e}")

            except Exception as e:
                # Log error and continue
                print(f"Error applying step {step_type} on {column}: {e}")
                applied_steps.append({'type': step_type, 'description': f'Failed: {str(e)}', 'error': str(e)})

        after_shape = df_processed.shape
        
        summary = {
            'beforeShape': {'rows': before_shape[0], 'cols': before_shape[1]},
            'afterShape': {'rows': after_shape[0], 'cols': after_shape[1]},
            'appliedSteps': applied_steps,
            'removedFeatures': removed_features,
            'engineeredFeatures': engineered_features,
            'summary': f'Preprocessing completed: {before_shape[0]} → {after_shape[0]} rows, {before_shape[1]} → {after_shape[1]} columns'
        }
        
        return df_processed, summary

# Singleton instance
preprocessing_service = PreprocessingService()
