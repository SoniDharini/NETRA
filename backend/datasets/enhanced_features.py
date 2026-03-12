# Enhanced Feature Engineering Module
# Adds comprehensive datetime, text, polynomial, and target encoding support

import pandas as pd
import numpy as np
from typing import Dict, List, Any

def ensure_unique_feature_name(df: pd.DataFrame, base_name: str) -> str:
    """
    Ensure engineered features are appended and never overwrite existing columns.
    If base_name already exists, append _1, _2, ... until unique.
    """
    if not base_name:
        base_name = "engineered_feature"
    if base_name not in df.columns:
        return base_name
    suffix = 1
    while f"{base_name}_{suffix}" in df.columns:
        suffix += 1
    return f"{base_name}_{suffix}"

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
    
    # === DOMAIN SPECIFIC / INTELLIGENT FEATURES ===
    domain_suggestions = []
    
    def find_col(words):
        for col in numeric_cols:
            if col.lower() in [w.lower() for w in words]:
                return col
        return None
    
    col_runs = find_col(['Runs', 'total_runs', 'run'])
    col_balls = find_col(['Balls', 'total_balls', 'ball'])
    col_extras = find_col(['Extras', 'extra_runs', 'extra'])
    col_boundaries = find_col(['Boundaries', 'boundary', 'fours', 'sixes'])
    col_overs = find_col(['Overs', 'over'])

    if col_runs and col_balls:
        domain_suggestions.append({
            'type': 'create_ratio',
            'name': 'StrikeRate',
            'column': f'{col_runs}, {col_balls}',
            'description': 'Batting efficiency metric',
            'logic': f'{col_runs} / {col_balls}',
            'recommended': True,
            'newFeatures': ['StrikeRate'],
            'params': {'col_num': col_runs, 'col_denom': col_balls, 'name': 'StrikeRate'}
        })

    if col_runs and col_extras:
        domain_suggestions.append({
            'type': 'create_addition',
            'name': 'TotalRuns',
            'column': f'{col_runs}, {col_extras}',
            'description': 'Total runs including extras',
            'logic': f'{col_runs} + {col_extras}',
            'recommended': True,
            'newFeatures': ['TotalRuns'],
            'params': {'col1': col_runs, 'col2': col_extras, 'name': 'TotalRuns'}
        })

    if col_boundaries and col_balls:
        domain_suggestions.append({
            'type': 'create_ratio',
            'name': 'BoundaryRate',
            'column': f'{col_boundaries}, {col_balls}',
            'description': 'Boundary scoring efficiency',
            'logic': f'{col_boundaries} / {col_balls}',
            'recommended': True,
            'newFeatures': ['BoundaryRate'],
            'params': {'col_num': col_boundaries, 'col_denom': col_balls, 'name': 'BoundaryRate'}
        })
        
    if col_runs and col_overs:
        domain_suggestions.append({
            'type': 'create_ratio',
            'name': 'RunsPerOver',
            'column': f'{col_runs}, {col_overs}',
            'description': 'Average runs per over',
            'logic': f'{col_runs} / {col_overs}',
            'recommended': True,
            'newFeatures': ['RunsPerOver'],
            'params': {'col_num': col_runs, 'col_denom': col_overs, 'name': 'RunsPerOver'}
        })
        
    suggestions.extend(domain_suggestions)

    # === INTERACTION FEATURES ===
    if len(mi_scores) >= 2:
        sorted_mi = sorted([k for k in mi_scores.keys() if k in numeric_cols], 
                          key=lambda k: mi_scores[k], reverse=True)
        if len(sorted_mi) >= 2:
            col1, col2 = sorted_mi[0], sorted_mi[1]
            new_feature = f"{col1}_x_{col2}"
            suggestions.append({
                'type': 'create_interaction',
                'name': new_feature,
                'column': f'{col1}, {col2}',
                'description': f'Create {new_feature}',
                'rationale': f'{col1} (MI: {mi_scores[col1]:.3f}) × {col2} (MI: {mi_scores[col2]:.3f}) - Captures multiplicative relationship',
                'logic': f'{col1} * {col2}',
                'recommended': True,
                'newFeatures': [new_feature],
                'impact': f'Adds 1 numerical column',
                'group': 'interaction',
                'params': {'col1': col1, 'col2': col2, 'operation': 'multiply', 'name': new_feature}
            })
    
    # === POLYNOMIAL FEATURES ===
    if mi_scores:
        top_features = sorted([c for c in numeric_cols if c in mi_scores], 
                            key=lambda c: mi_scores[c], reverse=True)[:2]
        for col in top_features:
            sq_name = f'{col}_squared'
            suggestions.append({
                'type': 'polynomial_features',
                'name': sq_name,
                'column': col,
                'description': f'Square of {col}',
                'logic': f'{col}²',
                'recommended': False,
                'rationale': f'{col} has strong relationship. Polynomial terms capture non-linearity',
                'newFeatures': [sq_name],
                'impact': 'Adds 1 numerical column',
                'group': 'polynomial',
                'params': {'degree': 2, 'name': sq_name}
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
            log_name = f'{col}_log'
            suggestions.append({
                'type': 'log_transform',
                'name': log_name,
                'column': col,
                'description': f'Log({col})',
                'logic': f'log(1 + {col})',
                'recommended': True,
                'rationale': f'Skewness={skew_val:.2f}. Log transform normalizes distribution',
                'newFeatures': [log_name],
                'impact': 'Adds 1 numerical column (or replaces original)',
                'group': 'transformation',
                'params': {'inplace': False, 'name': log_name}
            })
    
    # === BINNING ===
    for col in numeric_cols:
        if df[col].nunique() > 20:
            if 'age' in col.lower() or 'year' in col.lower() or df[col].std() > df[col].mean():
                bin_name = f'{col}_binned'
                suggestions.append({
                    'type': 'binning',
                    'name': bin_name,
                    'column': col,
                    'description': f'Bin {col} into 5 intervals',
                    'logic': f'Quantile_Bin({col})',
                    'recommended': False,
                    'rationale': f'Discretizing {col} helps capture non-linear patterns',
                    'newFeatures': [bin_name],
                    'impact': 'Adds 1 categorical column (5 bins)',
                    'group': 'discretization',
                    'params': {'bins': 5, 'strategy': 'quantile', 'name': bin_name}
                })
    
    # === DATETIME FEATURES ===
    datetime_cols = detect_datetime_columns(df, target_col)
    for col in datetime_cols:
        yr_name = f'{col}_Year'
        suggestions.append({
            'type': 'datetime_features',
            'name': yr_name,
            'column': col,
            'description': f'Extract Year from {col}',
            'logic': f'Year({col})',
            'recommended': True,
            'rationale': 'Extracts temporal patterns',
            'newFeatures': [yr_name],
            'impact': 'Adds 1 numerical column',
            'group': 'datetime',
            'params': {'name': yr_name}
        })
    
    # === TARGET ENCODING ===
    if target_col:
        for col in categorical_cols:
            cardinality = df[col].nunique()
            if cardinality > 10:
                target_name = f'{col}_target_enc'
                suggestions.append({
                    'type': 'target_encoding',
                    'name': target_name,
                    'column': col,
                    'description': f'Target encode {col} ({cardinality} categories)',
                    'logic': f'Mean({target_col}) per {col}',
                    'recommended': True,
                    'rationale': f'High cardinality. Maps categories to mean target value',
                    'newFeatures': [target_name],
                    'impact': 'Replaces categorical with 1 numerical column',
                    'group': 'encoding',
                    'params': {'smoothing': 0.1, 'target_col': target_col, 'name': target_name}
                })
    
    # === TEXT FEATURES ===
    text_cols = detect_text_columns(df, target_col)
    for col in text_cols:
        len_name = f'{col}_Length'
        suggestions.append({
            'type': 'text_features',
            'name': len_name,
            'column': col,
            'description': f'Extract text length from {col}',
            'logic': f'Length({col})',
            'recommended': True,
            'rationale': 'Text length captures complexity',
            'newFeatures': [len_name],
            'impact': 'Adds 1 numerical column',
            'group': 'text',
            'params': {'name': len_name}
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
                'name': new_feat,
                'column': col,
                'description': f'Calculate Age from {col}',
                'logic': f'{current_year} - Year({col})',
                'recommended': True,
                'rationale': f'Detected "{col}" likely contains birthdates. Age is a stronger predictive signal than raw dates.',
                'newFeatures': [new_feat],
                'impact': 'Adds numerical "age" column',
                'group': 'semantic',
                'params': {'year': current_year, 'name': new_feat}
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
                    'name': ratio_name,
                    'column': f'{c1}, {c2}',
                    'description': f'Create ratio: {c1} / {c2}',
                    'recommended': False, # User must approve context
                    'rationale': f'Both columns have high importance. Ratio might normalize them (e.g., density, efficiency).',
                    'logic': f'{c1} / {c2}',
                    'newFeatures': [ratio_name],
                    'impact': 'Adds 1 numerical column',
                    'group': 'feature_augmentation',
                    'params': {'col_num': c1, 'col_denom': c2, 'name': ratio_name}
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
                    new_feature_mean = f'{top_numeric}_mean_{cat_col}'
                    suggestions.append({
                        'type': 'group_aggregate',
                        'name': new_feature_mean,
                        'column': f'{top_numeric}, {cat_col}',
                        'description': f'Group {top_numeric} by {cat_col} (Mean)',
                        'logic': f'Mean({top_numeric}) by {cat_col}',
                        'recommended': True,
                        'rationale': f'Captures regional/group trends. Aggregating {top_numeric} by {cat_col} adds context.',
                        'newFeatures': [new_feature_mean],
                        'impact': 'Adds 1 numerical column',
                        'group': 'feature_augmentation',
                        'params': {'group_col': cat_col, 'agg_col': top_numeric, 'agg_func': 'mean', 'name': new_feature_mean}
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
        if step_type == 'create_interaction':
            col1 = params.get('col1')
            col2 = params.get('col2')
            requested_name = params.get('name', f'{col1}_x_{col2}')
            name = ensure_unique_feature_name(df_out, requested_name)
            if col1 in df_out.columns and col2 in df_out.columns:
                df_out[name] = df_out[col1] * df_out[col2]
                
        elif step_type == 'polynomial_features':
            col = params.get('column') or column
            requested_name = params.get('name', f'{col}_squared')
            name = ensure_unique_feature_name(df_out, requested_name)
            if col in df_out.columns:
                df_out[name] = df_out[col] ** 2
        
        elif step_type == 'datetime_features':
            if column in df_out.columns:
                # Parse datetime if not already
                if not pd.api.types.is_datetime64_any_dtype(df_out[column]):
                    df_out[column] = pd.to_datetime(df_out[column], errors='coerce')
                
                requested_name = params.get('name', f'{column}_Year')
                name = ensure_unique_feature_name(df_out, requested_name)
                df_out[name] = df_out[column].dt.year
                
        elif step_type == 'log_transform':
             requested_name = params.get('name', f'{column}_log')
             name = ensure_unique_feature_name(df_out, requested_name)
             if column in df_out.columns:
                 df_out[name] = np.log1p(df_out[column])
                 
        elif step_type == 'binning':
             bins = params.get('bins', 5)
             strategy = params.get('strategy', 'uniform')
             requested_name = params.get('name', f'{column}_binned')
             name = ensure_unique_feature_name(df_out, requested_name)
             if column in df_out.columns:
                 if strategy == 'quantile':
                     df_out[name] = pd.qcut(df_out[column], q=bins, labels=False, duplicates='drop')
                 else:
                     df_out[name] = pd.cut(df_out[column], bins=bins, labels=False)
        
        elif step_type == 'target_encoding':
            requested_name = params.get('name', f'{column}_target_enc')
            name = ensure_unique_feature_name(df_out, requested_name)
            if column in df_out.columns and target_col and target_col in df_out.columns:
                smoothing = params.get('smoothing', 0.1)
                global_mean = df_out[target_col].mean()
                # Calculate mean target per category
                agg = df_out.groupby(column)[target_col].agg(['mean', 'count'])
                # Apply smoothing
                smooth_mean = (agg['mean'] * agg['count'] + global_mean * smoothing) / (agg['count'] + smoothing)
                df_out[name] = df_out[column].map(smooth_mean).fillna(global_mean)
        
        elif step_type == 'text_features':
            if column in df_out.columns:
                requested_name = params.get('name', f'{column}_Length')
                name = ensure_unique_feature_name(df_out, requested_name)
                df_out[name] = df_out[column].astype(str).str.len()

        elif step_type == 'group_aggregate':
            group_col = params.get('group_col')
            agg_col = params.get('agg_col')
            agg_func = params.get('agg_func', 'mean')
            requested_name = params.get('name', f'{agg_col}_{agg_func}_by_{group_col}')
            name = ensure_unique_feature_name(df_out, requested_name)
            
            if group_col in df_out.columns and agg_col in df_out.columns:
                # Calculate aggregate map
                agg_map = df_out.groupby(group_col)[agg_col].agg(agg_func)
                df_out[name] = df_out[group_col].map(agg_map)
                
        elif step_type == 'calculate_age':
            if column in df_out.columns:
                 requested_name = params.get('name', f'{column}_age')
                 name = ensure_unique_feature_name(df_out, requested_name)
                 # Parse if needed
                 series = df_out[column]
                 if not pd.api.types.is_datetime64_any_dtype(series):
                     series = pd.to_datetime(series, errors='coerce')
                 
                 year = params.get('year', 2025)
                 # Calculate approximate age
                 df_out[name] = year - series.dt.year
                 
        elif step_type == 'create_ratio':
             num = params.get('col_num')
             denom = params.get('col_denom')
             requested_name = params.get('name', f'{num}_div_{denom}')
             name = ensure_unique_feature_name(df_out, requested_name)
             if num in df_out.columns and denom in df_out.columns:
                 # Avoid division by zero
                 df_out[name] = df_out[num] / df_out[denom].replace(0, np.nan)
        
        elif step_type == 'create_addition':
             c1 = params.get('col1')
             c2 = params.get('col2')
             requested_name = params.get('name', f'{c1}_plus_{c2}')
             name = ensure_unique_feature_name(df_out, requested_name)
             if c1 in df_out.columns and c2 in df_out.columns:
                 df_out[name] = df_out[c1].fillna(0) + df_out[c2].fillna(0)
        
    except Exception as e:
        print(f"Error applying {step_type} on {column}: {e}")
    
    return df_out
