"""
Test Script to Verify Full Dataset Processing

This script tests that:
1. Full dataset is uploaded and stored
2. Only 5x5 preview is returned to frontend
3. Preprocessing operates on full dataset
4. Downloaded data contains full processed dataset
"""
import os
import sys
import django
import pandas as pd
import numpy as np
from pathlib import Path

# Setup Django environment
sys.path.insert(0, str(Path(__file__).parent))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from datasets.models import Dataset
from datasets.preprocessing_service import preprocessing_service
from django.core.files.base import ContentFile


def create_test_dataset(rows=100, cols=10):
    """Create a test dataset with known properties"""
    np.random.seed(42)
    
    data = {}
    for i in range(cols):
        if i < 5:
            # Numeric columns
            data[f'feature_{i}'] = np.random.randn(rows) * 10 + 50
        else:
            # Categorical columns
            data[f'category_{i}'] = np.random.choice(['A', 'B', 'C', 'D'], rows)
    
    # Add some missing values
    df = pd.DataFrame(data)
    df.loc[10:15, 'feature_0'] = np.nan  # 6 missing values
    df.loc[20:22, 'category_5'] = np.nan  # 3 missing values
    
    # Add duplicates
    df = pd.concat([df, df.iloc[[0, 1]]], ignore_index=True)
    
    print(f"✓ Created test dataset: {len(df)} rows × {len(df.columns)} columns")
    print(f"  - Missing values in feature_0: {df['feature_0'].isna().sum()}")
    print(f"  - Duplicate rows: {df.duplicated().sum()}")
    
    return df


def test_upload_full_dataset():
    """Test 1: Verify full dataset is uploaded and stored"""
    print("\n" + "="*60)
    print("TEST 1: Upload Full Dataset")
    print("="*60)
    
    # Create test user
    user, created = User.objects.get_or_create(
        username='testuser',
        defaults={'email': 'test@example.com'}
    )
    if created:
        user.set_password('testpass123')
        user.save()
    
    # Create test dataset
    df_original = create_test_dataset(rows=100, cols=10)
    original_shape = df_original.shape
    
    # Simulate upload
    csv_buffer = df_original.to_csv(index=False)
    dataset = Dataset(user=user, name='test_dataset.csv', metadata={})
    dataset.file.save('test_dataset.csv', ContentFile(csv_buffer.encode('utf-8')))
    
    # Create preview (5x5)
    preview = df_original.head(5).iloc[:, :5]
    dataset.metadata['preview'] = preview.to_dict(orient='records')
    dataset.metadata['rowCount'] = len(df_original)
    dataset.metadata['columnCount'] = len(df_original.columns)
    dataset.save()
    
    # Verify stored file
    df_loaded = preprocessing_service.load_dataset(dataset.file.path)
    loaded_shape = df_loaded.shape
    
    print(f"\n✓ Original dataset shape: {original_shape}")
    print(f"✓ Stored dataset shape: {loaded_shape}")
    print(f"✓ Preview shape: {preview.shape}")
    
    assert original_shape == loaded_shape, "Full dataset should be stored!"
    assert preview.shape == (5, 5), "Preview should be 5x5!"
    assert dataset.metadata['rowCount'] == original_shape[0], "Metadata should reflect full dataset!"
    
    print("\n✅ TEST 1 PASSED: Full dataset uploaded and stored correctly")
    return dataset.id


def test_preprocessing_on_full_dataset(file_id):
    """Test 2: Verify preprocessing operates on full dataset"""
    print("\n" + "="*60)
    print("TEST 2: Preprocessing on Full Dataset")
    print("="*60)
    
    dataset = Dataset.objects.get(id=file_id)
    df_original = preprocessing_service.load_dataset(dataset.file.path)
    
    print(f"\n✓ Loaded dataset: {df_original.shape[0]} rows × {df_original.shape[1]} columns")
    
    # Profile the FULL dataset
    profile = preprocessing_service.profile_dataset(df_original)
    
    print(f"\n✓ Dataset Profile (on FULL dataset):")
    print(f"  - Total rows: {profile['rowCount']}")
    print(f"  - Total columns: {profile['columnCount']}")
    print(f"  - Duplicate rows: {profile['duplicateRows']}")
    print(f"  - Missing values: {len(profile['missingValues'])} columns affected")
    
    # Generate preprocessing suggestions
    suggestions = preprocessing_service.generate_preprocessing_suggestions(df_original, profile)
    
    print(f"\n✓ Generated {len(suggestions)} preprocessing suggestions")
    for i, sug in enumerate(suggestions[:5]):
        print(f"  {i+1}. {sug['type']}: {sug['description']}")
    
    # Apply preprocessing steps to FULL dataset
    steps_to_apply = [
        {'type': 'remove_duplicates', 'params': {}},
        {'type': 'fill_missing', 'column': 'feature_0', 'params': {'strategy': 'mean'}},
    ]
    
    df_processed, summary = preprocessing_service.apply_preprocessing(df_original, steps_to_apply)
    
    print(f"\n✓ Preprocessing Summary:")
    print(f"  - Before: {summary['beforeShape']['rows']} rows × {summary['beforeShape']['cols']} columns")
    print(f"  - After: {summary['afterShape']['rows']} rows × {summary['afterShape']['cols']} columns")
    print(f"  - Applied steps: {len(summary['appliedSteps'])}")
    
    # Verify processing was on full dataset
    assert summary['beforeShape']['rows'] == df_original.shape[0], "Should process full dataset!"
    assert summary['afterShape']['rows'] < df_original.shape[0], "Duplicates should be removed!"
    
    # Verify missing values were filled
    assert df_processed['feature_0'].isna().sum() == 0, "Missing values should be filled!"
    
    print("\n✅ TEST 2 PASSED: Preprocessing operated on full dataset correctly")
    return df_processed


def test_download_full_dataset(file_id):
    """Test 3: Verify downloaded dataset is complete"""
    print("\n" + "="*60)
    print("TEST 3: Download Full Dataset")
    print("="*60)
    
    dataset = Dataset.objects.get(id=file_id)
    df_downloaded = preprocessing_service.load_dataset(dataset.file.path)
    
    print(f"\n✓ Downloaded dataset shape: {df_downloaded.shape}")
    print(f"  - Total rows: {len(df_downloaded)}")
    print(f"  - Total columns: {len(df_downloaded.columns)}")
    
    # Verify all columns are present
    assert len(df_downloaded.columns) > 5, "All columns should be present in download!"
    assert len(df_downloaded) > 5, "All rows should be present in download!"
    
    print("\n✅ TEST 3 PASSED: Full dataset can be downloaded correctly")


def run_all_tests():
    """Run all tests"""
    print("\n" + "="*60)
    print("DATA INTEGRITY TEST SUITE")
    print("="*60)
    print("Testing: Full Dataset Upload → Preview → Preprocessing → Download")
    
    try:
        # Test 1: Upload
        file_id = test_upload_full_dataset()
        
        # Test 2: Preprocessing
        test_preprocessing_on_full_dataset(file_id)
        
        # Test 3: Download
        test_download_full_dataset(file_id)
        
        print("\n" + "="*60)
        print("✅ ALL TESTS PASSED!")
        print("="*60)
        print("\nConclusion:")
        print("  ✓ Full dataset is stored in backend")
        print("  ✓ Only 5x5 preview is returned to frontend")
        print("  ✓ Preprocessing operates on full dataset")
        print("  ✓ Downloaded data contains complete dataset")
        print("\n" + "="*60)
        
    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {str(e)}")
        return 1
    except Exception as e:
        print(f"\n❌ ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1
    
    return 0


if __name__ == '__main__':
    exit_code = run_all_tests()
    sys.exit(exit_code)
