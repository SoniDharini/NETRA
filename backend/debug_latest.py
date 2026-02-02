
import os
import django
from django.conf import settings
import pandas as pd
import sys

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from datasets.models import Dataset
from datasets.preprocessing_service import preprocessing_service

print(f"MEDIA_ROOT: {settings.MEDIA_ROOT}")

try:
    # Get latest dataset
    dataset = Dataset.objects.last()
    if not dataset:
        print("No datasets found.")
        sys.exit(0)
        
    print(f"Checking Dataset ID: {dataset.id}")
    print(f"Name: {dataset.name}")
    print(f"File field: {dataset.file}")
    
    # Check if path exists
    try:
        file_path = dataset.file.path
        print(f"Absolute Path: {file_path}")
        
        if os.path.exists(file_path):
            print("Status: FILE EXISTS on disk.")
            
            # Try to load
            try:
                df = preprocessing_service.load_dataset(file_path)
                print(f"Load Success! Shape: {df.shape}")
                print(df.head(2))
            except Exception as e:
                print(f"ERROR loading with preprocessing_service: {e}")
                import traceback
                traceback.print_exc()
        else:
            print("Status: FILE NOT FOUND on disk.")
            # Try to see if it exists relative to media root
            reconstructed_path = os.path.join(settings.MEDIA_ROOT, str(dataset.file))
            print(f"Reconstructed Path: {reconstructed_path}")
            if os.path.exists(reconstructed_path):
                 print("Found at reconstructed path! 'path' property might be wrong.")
            
    except Exception as e:
         print(f"Error accessing .path: {e}")

except Exception as e:
    print(f"General Error: {e}")
