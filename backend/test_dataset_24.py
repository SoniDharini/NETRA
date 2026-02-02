
import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from datasets.models import Dataset
from datasets.preprocessing_service import preprocessing_service

print("=== DIAGNOSTIC TEST: DATASET RETRIEVAL ===\n")

# Check if dataset 24 exists
try:
    dataset = Dataset.objects.get(id=24)
    print(f"✓ Dataset ID 24 found")
    print(f"  Name: {dataset.name}")
    print(f"  User: {dataset.user.username}")
    print(f"  File: {dataset.file}")
    
    # Check file path
    try:
        file_path = dataset.file.path
        print(f"  Path: {file_path}")
        
        if os.path.exists(file_path):
            print(f"  ✓ File exists on disk")
            
            # Try to load
            try:
                df = preprocessing_service.load_dataset(file_path)
                print(f"  ✓ Successfully loaded! Shape: {df.shape}")
                print(f"  Columns: {list(df.columns)[:5]}...")
                print(f"  Has NaN: {df.isnull().any().any()}")
                print(f"  Has Inf: {(df == float('inf')).any().any() or (df == float('-inf')).any().any()}")
                
                # Test preview generation
                preview_df = df.head(5)
                preview_clean = preview_df.replace([float('inf'), float('-inf')], None).where(preview_df.notnull(), None)
                preview_dict = preview_clean.to_dict(orient='records')
                print(f"  ✓ Preview generated successfully ({len(preview_dict)} rows)")
                
            except Exception as e:
                print(f"  ✗ LOAD FAILED: {e}")
                import traceback
                traceback.print_exc()
        else:
            print(f"  ✗ FILE NOT FOUND ON DISK")
            
    except Exception as e:
        print(f"  ✗ Error accessing path: {e}")
        
except Dataset.DoesNotExist:
    print(f"✗ Dataset ID 24 NOT FOUND in database")
    print(f"\nAvailable datasets:")
    for d in Dataset.objects.all().order_by('-id')[:5]:
        print(f"  ID: {d.id}, Name: {d.name}, User: {d.user.username}")
except Exception as e:
    print(f"✗ Error: {e}")
    import traceback
    traceback.print_exc()
