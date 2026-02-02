
import os
import django
from django.conf import settings
import pandas as pd

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from datasets.models import Dataset
from datasets.preprocessing_service import preprocessing_service

print("Listing Datasets:")
for d in Dataset.objects.all().order_by('-id')[:3]:
    print(f"ID: {d.id}, Name: {d.name}, File: {d.file.name}")
    try:
        print(f"  Path: {d.file.path}")
        if os.path.exists(d.file.path):
            print("  File exists.")
            try:
                df = preprocessing_service.load_dataset(d.file.path)
                print(f"  Load success. Shape: {df.shape}")
                print(f"  Preview head: {df.head(2)}")
            except Exception as e:
                print(f"  LOAD FAILED: {e}")
        else:
            print("  FILE MISSING!")
    except Exception as e:
        print(f"  Error checking file: {e}")
