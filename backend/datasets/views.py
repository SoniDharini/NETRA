from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Dataset
from .serializers import DatasetSerializer
import pandas as pd

class UploadViewSet(viewsets.ModelViewSet):
    queryset = Dataset.objects.all()
    serializer_class = DatasetSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        dataset = serializer.save(user=self.request.user)
        try:
            file = dataset.file
            file_extension = file.name.split('.')[-1].lower()
            if file_extension == 'csv':
                df = pd.read_csv(file)
            elif file_extension in ['xlsx', 'xls']:
                df = pd.read_excel(file)
            elif file_extension == 'json':
                df = pd.read_json(file)
            else:
                # This part will not be reached because the serializer will raise a validation error
                # but as a fallback, we handle it
                raise Exception("Unsupported file type")

            preview = df.head(5).iloc[:, :5]
            dataset.metadata['preview'] = preview.to_dict()
            dataset.save()
        except Exception as e:
            # If parsing fails, delete the dataset record and file
            dataset.delete()
            # Re-raise the exception to be caught by the default exception handler
            raise e

    def get_queryset(self):
        return Dataset.objects.filter(user=self.request.user)