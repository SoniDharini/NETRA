
import pandas as pd
import numpy as np
from datasets.enhanced_features import generate_enhanced_feature_engineering_suggestions
from datasets.ml_feature_discovery import generate_ml_driven_suggestions

# Mock profile
profile = {
    'target': {'column': 'target', 'task': 'classification'},
    'skewness': {'revenue': 2.5},
    'columns': ['dob', 'revenue', 'cost', 'target']
}

# Mock Data
df = pd.DataFrame({
    'dob': ['1990-01-01', '1985-05-12', '2000-11-30', '1995-02-20', '1980-07-07'], # Date
    'revenue': [100, 200, 150, 300, 250], # Numeric
    'cost': [50, 80, 70, 120, 90], # Numeric
    'target': [0, 1, 0, 1, 1]
})

# Convert dob to datetime
df['dob'] = pd.to_datetime(df['dob'])

print("=== TESTING SEMANTIC FEATURES ===")
suggestions = generate_enhanced_feature_engineering_suggestions(df, profile, {'revenue': 0.5, 'cost': 0.4})
found_age = False
found_ratio = False

for s in suggestions:
    print(f"[{s['type']}] {s['description']}")
    if s['type'] == 'calculate_age':
        found_age = True
        print(f"   -> Rationale: {s['rationale']}")
    if s['type'] == 'create_ratio':
        found_ratio = True
        print(f"   -> Rationale: {s['rationale']}")

if found_age and found_ratio:
    print("\nSUCCESS: Semantic features detected!")
else:
    print("\nFAILURE: Missing features.")

print("\n=== TESTING ML FEATURES ===")
ml_suggestions = generate_ml_driven_suggestions(df, profile)
for s in ml_suggestions:
    print(f"[{s['type']}] {s['description']}")
