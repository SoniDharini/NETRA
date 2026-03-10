# Enhanced Feature Engineering Module
# Adds comprehensive datetime, text, polynomial, and target encoding support

import pandas as pd
import numpy as np
from typing import Dict, List, Any

def detect_datetime_columns(df: pd.DataFrame, exclude_col: str = None) -> List[str]:
    """Detect columns that are or can be parsed as datetime"""
    datetime_cols = []
    for col in df.columns:
        if col == exclude_col:
            continue
        # Check if already datetime
        if pd.api.types.is_datetime64_any_dtype(df[col]):
            datetime_cols.append(col)
        # Try to parse if object type
        elif df[col].dtype == 'object':
            sample = df[col].dropna().head(100)
            if sample.empty:
                continue
            try:
                parsed = pd.to_datetime(sample, errors='coerce')
                # If at least 80% parse successfully, consider it datetime
                if parsed.notna().sum() / len(sample) > 0.8:
                    datetime_cols.append(col)
            except:
                pass
    return datetime_cols

def detect_text_columns(df: pd.DataFrame, exclude_col: str = None, min_avg_len: int = 50) -> List[str]:
    """Detect text columns based on average string length"""
    text_cols = []
    for col in df.columns:
        if col == exclude_col:
            continue
        if df[col].dtype == 'object':
            sample = df[col].dropna().head(100)
            if sample.empty:
                continue
            avg_length = sample.astype(str).str.len().mean()
            if avg_length > min_avg_len:
                text_cols.append(col)
    return text_cols

def generate_enhanced_feature_engineering_suggestions(
    df: pd.DataFrame, 
    profile: Dict[str, Any],
    mi_scores: Dict[str, float]
) -> List[Dict[str, Any]]:
    """
    Generate comprehensive feature engineering suggestions
    with detailed column-level mapping and impact descriptions
    """
    suggestions = []
    target_col = profile.get('target', {}).get('column')
    
    numeric_cols = df.select_dtypes(include=[np.number]).columns.tolist()
    if target_col in numeric_cols:
        numeric_cols.remove(target_col)
    
    categorical_cols = df.select_dtypes(include=['object', 'category']).columns.tolist()
    if target_col in categorical_cols:
        categorical_cols.remove(target_col)
    
    # === INTERACTION FEATURES ===
    if len(mi_scores) >= 2:
        sorted_mi = sorted([k for k in mi_scores.keys() if k in numeric_cols], 
                          key=lambda k: mi_scores[k], reverse=True)
        if len(sorted_mi) >= 2:
            col1, col2 = sorted_mi[0], sorted_mi[1]
            new_feature = f"{col1}_x_{col2}"
            suggestions.append({
                'type': 'create_interaction',
                'column': f'{col1}, {col2}',
                'description': f'Create {new_feature}',
                'recommended': True,
                'rationale': f'{col1} (MI: {mi_scores[col1]:.3f}) × {col2} (MI: {mi_scores[col2]:.3f}) - Captures multiplicative relationship',
                'newFeatures': [new_feature],
                'impact': f'Adds 1 numerical column',
                'group': 'interaction',
                'params': {'col1': col1, 'col2': col2, 'operation': 'multiply'}
            })
    
    # === POLYNOMIAL FEATURES ===
    if mi_scores:
        top_features = sorted([c for c in numeric_cols if c in mi_scores], 
                            key=lambda c: mi_scores[c], reverse=True)[:2]
        for col in top_features:
            suggestions.append({
                'type': 'polynomial_features',
                'column': col,
                'description': f'Add {col}² and {col}³',
                'recommended': False,
                'rationale': f'{col} has strong relationship (MI: {mi_scores[col]:.3f}). Polynomial terms capture non-linearity',
                'newFeatures': [f'{col}_squared', f'{col}_cubed'],
                'impact': 'Adds 2 numerical columns',
                'group': 'polynomial',
                'params': {'degree': 3}
            })
    
    # === LOG TRANSFORMATION ===
    skewness = profile.get('skewness') or {}
    if not isinstance(skewness, dict):
        skewness = {}
    for col, skew in skewness.items():
        if col == target_col or col not in df.columns:
            continue
        try:
            skew_val = float(skew) if skew is not None else 0
        except (TypeError, ValueError):
            skew_val = 0
        if abs(skew_val) <= 1.0:
            continue
        if pd.api.types.is_numeric_dtype(df[col]) and df[col].min() > 0:
            suggestions.append({
                'type': 'log_transform',
                'column': col,
                'description': f'Log({col})',
                'recommended': True,
                'rationale': f'Skewness={skew_val:.2f}. Log transform normalizes distribution',
                'newFeatures': [f'{col}_log'],
                'impact': 'Adds 1 numerical column (or replaces original)',
                'group': 'transformation',
                'params': {'inplace': False}
            })
    
    # === BINNING ===
    for col in numeric_cols:
        if df[col].nunique() > 20:
            if 'age' in col.lower() or 'year' in col.lower() or df[col].std() > df[col].mean():
                suggestions.append({
                    'type': 'binning',
                    'column': col,
                    'description': f'Bin {col} into 5 intervals',
                    'recommended': False,
                    'rationale': f'Discretizing {col} helps capture non-linear patterns',
                    'newFeatures': [f'{col}_binned'],
                    'impact': 'Adds 1 categorical column (5 bins)',
                    'group': 'discretization',
                    'params': {'bins': 5, 'strategy': 'quantile'}
                })
    
    # === DATETIME FEATURES ===
    datetime_cols = detect_datetime_columns(df, target_col)
    for col in datetime_cols:
        new_features = [f'{col}_year', f'{col}_month', f'{col}_day', f'{col}_weekday']
        suggestions.append({
            'type': 'datetime_features',
            'column': col,
            'description': f'Extract time components from {col}',
            'recommended': True,
            'rationale': 'Extracts temporal patterns (seasonality, day-of-week effects)',
            'newFeatures': new_features,
            'impact': 'Adds 4 numerical columns',
            'group': 'datetime',
            'params': {}
        })
    
    # === TARGET ENCODING ===
    if target_col:
        for col in categorical_cols:
            cardinality = df[col].nunique()
            if cardinality > 10:
                suggestions.append({
                    'type': 'target_encoding',
                    'column': col,
                    'description': f'Target encode {col} ({cardinality} categories)',
                    'recommended': True,
                    'rationale': f'High cardinality. Maps categories to mean target value',
                    'newFeatures': [f'{col}_target_enc'],
                    'impact': 'Replaces categorical with 1 numerical column',
                    'group': 'encoding',
                    'params': {'smoothing': 0.1, 'target_col': target_col}
                })
    
    # === TEXT FEATURES ===
    text_cols = detect_text_columns(df, target_col)
    for col in text_cols:
        suggestions.append({
            'type': 'text_features',
            'column': col,
            'description': f'Extract text stats from {col}',
            'recommended': True,
            'rationale': 'Text length and word count capture complexity',
            'newFeatures': [f'{col}_length', f'{col}_word_count'],
            'impact': 'Adds 2 numerical columns',
            'group': 'text',
            'params': {}
        })
    
    # === SEMANTIC FEATURES (Age from Birthdate) ===
    import datetime
    current_year = datetime.datetime.now().year
    
    for col in datetime_cols:
        col_lower = col.lower()
        if 'birth' in col_lower or 'dob' in col_lower:
             new_feat = f'{col}_age'
             suggestions.append({
                'type': 'calculate_age',
                'column': col,
                'description': f'Calculate Age from {col}',
                'recommended': True,
                'rationale': f'Detected "{col}" likely contains birthdates. Age is a stronger predictive signal than raw dates.',
                'newFeatures': [new_feat],
                'impact': 'Adds numerical "age" column',
                'group': 'semantic',
                'params': {'year': current_year}
             })

    # === RATIO FEATURES (Numerical) ===
    # Only suggest if we have meaningful pairs (heuristic: similar scale or high MI)
    if len(mi_scores) >= 2:
        top_numeric = sorted([k for k in mi_scores.keys() if k in numeric_cols], 
                           key=lambda k: mi_scores[k], reverse=True)[:3]
        
        # Check permutations of top 3
        for i in range(len(top_numeric)):
            for j in range(i+1, len(top_numeric)):
                c1, c2 = top_numeric[i], top_numeric[j]
                # Avoid dividing by zero logic handle later
                ratio_name = f'{c1}_div_{c2}'
                suggestions.append({
                    'type': 'create_ratio',
                    'column': f'{c1}, {c2}',
                    'description': f'Create ratio: {c1} / {c2}',
                    'recommended': False, # User must approve context
                    'rationale': f'Both columns have high importance. Ratio might normalize them (e.g., density, efficiency).',
                    'newFeatures': [ratio_name],
                    'impact': 'Adds 1 numerical column',
                    'group': 'feature_augmentation',
                    'params': {'col_num': c1, 'col_denom': c2}
                })

    # === GROUP-WISE AGGREGATES ===
    # For each low-cardinality categorical col, aggregation of top numeric cols
    if len(categorical_cols) > 0 and len(numeric_cols) > 0:
        # Pick top numeric col by MI (or variance if no target)
        top_numeric = None
        if mi_scores:
             top_numeric = max([c for c in numeric_cols if c in mi_scores], key=lambda c: mi_scores.get(c, 0), default=None)
        
        if top_numeric:
            for cat_col in categorical_cols:
                if df[cat_col].nunique() < 10:  # Only for valid grouping cols
                    new_feature_mean = f'{top_numeric}_mean_by_{cat_col}'
                    suggestions.append({
                        'type': 'group_aggregate',
                        'column': f'{top_numeric}, {cat_col}',
                        'description': f'Group {top_numeric} by {cat_col} (Mean)',
                        'recommended': True,
                        'rationale': f'Captures regional/group trends. Aggregating {top_numeric} by {cat_col} adds context.',
                        'newFeatures': [new_feature_mean],
                        'impact': 'Adds 1 numerical column',
                        'group': 'feature_augmentation',
                        'params': {'group_col': cat_col, 'agg_col': top_numeric, 'agg_func': 'mean'}
                    })

    return suggestions

def apply_enhanced_feature_engineering(
    df: pd.DataFrame,
    step: Dict[str, Any],
    target_col: str = None
) -> pd.DataFrame:
    """Apply a single feature engineering step to the dataframe"""
    df_out = df.copy()
    step_type = step.get('type')
    params = step.get('params', {})
    column = step.get('column')
    
    # Try to get target_col from params if not provided
    if not target_col:
        target_col = params.get('target_col')
    
    try:
        if step_type == 'polynomial_features':
            col = params.get('column') or column
            if col in df_out.columns:
                df_out[f'{col}_squared'] = df_out[col] ** 2
                df_out[f'{col}_cubed'] = df_out[col] ** 3
        
        elif step_type == 'datetime_features':
            if column in df_out.columns:
                # Parse datetime if not already
                if not pd.api.types.is_datetime64_any_dtype(df_out[column]):
                    df_out[column] = pd.to_datetime(df_out[column], errors='coerce')
                
                df_out[f'{column}_year'] = df_out[column].dt.year
                df_out[f'{column}_month'] = df_out[column].dt.month
                df_out[f'{column}_day'] = df_out[column].dt.day
                df_out[f'{column}_weekday'] = df_out[column].dt.weekday
        
        elif step_type == 'target_encoding':
            if column in df_out.columns and target_col and target_col in df_out.columns:
                smoothing = params.get('smoothing', 0.1)
                global_mean = df_out[target_col].mean()
                # Calculate mean target per category
                agg = df_out.groupby(column)[target_col].agg(['mean', 'count'])
                # Apply smoothing
                smooth_mean = (agg['mean'] * agg['count'] + global_mean * smoothing) / (agg['count'] + smoothing)
                df_out[f'{column}_target_enc'] = df_out[column].map(smooth_mean).fillna(global_mean)
        
        elif step_type == 'text_features':
            if column in df_out.columns:
                df_out[f'{column}_length'] = df_out[column].astype(str).str.len()
                df_out[f'{column}_word_count'] = df_out[column].astype(str).str.split().str.len()

        elif step_type == 'group_aggregate':
            group_col = params.get('group_col')
            agg_col = params.get('agg_col')
            agg_func = params.get('agg_func', 'mean')
            
            if group_col in df_out.columns and agg_col in df_out.columns:
                # Calculate aggregate map
                agg_map = df_out.groupby(group_col)[agg_col].agg(agg_func)
                new_col_name = f'{agg_col}_{agg_func}_by_{group_col}'
                df_out[new_col_name] = df_out[group_col].map(agg_map)
                
        elif step_type == 'calculate_age':
            if column in df_out.columns:
                 # Parse if needed
                 series = df_out[column]
                 if not pd.api.types.is_datetime64_any_dtype(series):
                     series = pd.to_datetime(series, errors='coerce')
                 
                 year = params.get('year', 2025)
                 # Calculate approximate age
                 df_out[f'{column}_age'] = year - series.dt.year
                 
        elif step_type == 'create_ratio':
             num = params.get('col_num')
             denom = params.get('col_denom')
             if num in df_out.columns and denom in df_out.columns:
                 # Avoid division by zero
                 df_out[f'{num}_div_{denom}'] = df_out[num] / df_out[denom].replace(0, np.nan)
        
    except Exception as e:
        print(f"Error applying {step_type} on {column}: {e}")
    
    return df_out
