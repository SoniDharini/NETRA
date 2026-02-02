
import os
import django
import sys
import pandas as pd

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from datasets.models import Dataset
from datasets.preprocessing_service import preprocessing_service

print("=== DIAGNOSTIC: DATASET 30 ===")
try:
    # Try to fetch dataset 30
    try:
        dataset = Dataset.objects.get(id=30)
    except Dataset.DoesNotExist:
        # Fallback to last dataset if 30 doesn't exist (maybe it was DB ID vs fileId mismatch)
        print("Dataset 30 not found. Checking last dataset...")
        dataset = Dataset.objects.last()
        
    print(f"Dataset ID: {dataset.id}")
    print(f"File Path: {dataset.file.path}")
    
    # Check if file exists
    if not os.path.exists(dataset.file.path):
        print("ERROR: File does not exist on disk!")
    else:
        print("File exists.")
        
    # Try to load
    print("Attempting to load via preprocessing_service...")
    df = preprocessing_service.load_dataset(dataset.file.path)
    print(f"Loaded successfully. Shape: {df.shape}")
    
    # Try to preview (mimic views.py logic)
    print("Attempting to generate preview...")
    preview_df = df.head(5)
    
    # Mimic the detailed fix I applied in views.py
    preview_clean = preview_df.replace([float('inf'), float('-inf')], None)
    preview_clean = preview_clean.where(pd.notnull(preview_clean), None)
    preview_dict = preview_clean.to_dict(orient='records')
    
    print("Preview generated successfully!")
    print(preview_dict)

except Exception as e:
    print("\nXXX EXCEPTION CAUGHT XXX")
    print(e)
    import traceback
    traceback.print_exc()
