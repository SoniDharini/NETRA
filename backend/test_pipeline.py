"""
Test script to verify the complete preprocessing pipeline
"""
import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from datasets.models import Dataset
from datasets.preprocessing_service import preprocessing_service
from django.contrib.auth.models import User
import pandas as pd

print("=" * 60)
print("PREPROCESSING PIPELINE TEST")
print("=" * 60)

# Get the latest dataset
dataset = Dataset.objects.last()
print(f"\n[OK] Dataset ID: {dataset.id}")
print(f"[OK] File: {dataset.name}")
print(f"[OK] Path: {dataset.file.path}")
print(f"[OK] User: {dataset.user.username}")

# Test 1: Load Dataset
print("\n[TEST 1] Loading full dataset...")
try:
    df = preprocessing_service.load_dataset(dataset.file.path)
    print(f"✓ Loaded successfully: {df.shape[0]} rows × {df.shape[1]} columns")
except Exception as e:
    print(f"✗ FAILED: {e}")
    sys.exit(1)

# Test 2: Profile Dataset
print("\n[TEST 2] Profiling dataset...")
try:
    profile = preprocessing_service.profile_dataset(df)
    print(f"✓ Profile generated")
    print(f"  - Row count: {profile['rowCount']}")
    print(f"  - Column count: {profile['columnCount']}")
    print(f"  - Missing values: {len(profile['missingValues'])} columns")
    print(f"  - Duplicate rows: {profile['duplicateRows']}")
    if profile.get('target'):
        print(f"  - Target column: {profile['target']['column']} ({profile['target']['task']})")
except Exception as e:
    print(f"✗ FAILED: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 3: Generate Preprocessing Suggestions
print("\n[TEST 3] Generating preprocessing suggestions...")
try:
    prep_suggestions = preprocessing_service.generate_preprocessing_suggestions(df, profile)
    print(f"✓ Generated {len(prep_suggestions)} preprocessing suggestions")
    for i, s in enumerate(prep_suggestions[:3], 1):
        print(f"  {i}. {s['type']}: {s['description']}")
except Exception as e:
    print(f"✗ FAILED: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 4: Generate Feature Engineering Suggestions
print("\n[TEST 4] Generating feature engineering suggestions...")
try:
    fe_suggestions = preprocessing_service.generate_feature_engineering_suggestions(df, profile)
    print(f"✓ Generated {len(fe_suggestions)} feature engineering suggestions")
    for i, s in enumerate(fe_suggestions[:3], 1):
        desc = s.get('description', 'N/A')
        impact = s.get('impact', 'N/A')
        print(f"  {i}. {s['type']}: {desc}")
        if 'newFeatures' in s:
            print(f"     Creates: {', '.join(s['newFeatures'])}")
except Exception as e:
    print(f"✗ FAILED: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 5: Data Preview (JSON serialization)
print("\n[TEST 5] Testing data preview (JSON serialization)...")
try:
    preview_df = df.head(5)
    preview_clean = preview_df.replace([float('inf'), float('-inf')], None)
    preview_clean = preview_clean.where(pd.notnull(preview_clean), None)
    preview_dict = preview_clean.to_dict(orient='records')
    print(f"✓ Preview generated: {len(preview_dict)} rows")
    print(f"  Columns: {list(df.columns)[:5]}...")
except Exception as e:
    print(f"✗ FAILED: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# Test 6: Apply Sample Preprocessing
print("\n[TEST 6] Testing preprocessing application...")
try:
    # Select a simple step
    sample_steps = [
        {
            'type': 'remove_duplicates',
            'params': {}
        }
    ]
    df_processed, summary = preprocessing_service.apply_preprocessing(df, sample_steps)
    print(f"✓ Preprocessing applied")
    print(f"  Before: {summary['beforeShape']}")
    print(f"  After: {summary['afterShape']}")
    print(f"  Applied steps: {len(summary['appliedSteps'])}")
except Exception as e:
    print(f"✗ FAILED: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

print("\n" + "=" * 60)
print("ALL TESTS PASSED ✓")
print("=" * 60)
print("\nThe preprocessing pipeline is working correctly!")
print("You can now:")
print("1. Log in to the frontend")
print("2. Upload a dataset")
print("3. Navigate to preprocessing")
print("4. See intelligent suggestions")
print("5. Apply transformations")
print("6. Download processed data")
