import os
import sys
import django

sys.path.append(r'd:\NETRA\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from datasets.models import Dataset
from datasets.ml_service import ml_service
import pandas as pd
from django.core.files.storage import default_storage

import logging
logging.basicConfig(level=logging.INFO, stream=sys.stdout)

def test():
    # Fetch a dataset that exists
    dataset = Dataset.objects.last()
    if not dataset:
        print("No datasets found")
        return
        
    print(f"Testing with dataset {dataset.id}: {dataset.name}")
    
    # Try with raw file first
    file_path = dataset.processed_file.path if dataset.processed_file else dataset.file.path
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return
        
    df = pd.read_csv(file_path)
    print(f"Data shape: {df.shape}")
    print(f"Columns: {df.columns.tolist()}")
    
    # Try training a model (assuming 'purchased' or 'target' or last column is target)
    target_col = df.columns[-1]
    if 'purchased' in df.columns:
        target_col = 'purchased'
        
    print(f"Using target column: {target_col}")
    
    try:
        metrics = ml_service.train_model(df, 'random_forest', target_col)
        print("Success! Metrics:", metrics)
    except Exception as e:
        print("Failed:", str(e))

if __name__ == '__main__':
    test()
