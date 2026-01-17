from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Dataset
from .serializers import DatasetSerializer
import pandas as pd

class UploadViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def create(self, request):
        # Use a different serializer for upload that doesn't require the file to be saved first
        serializer = DatasetSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            dataset = serializer.save(user=request.user)
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
                    return Response({'error': 'Unsupported file type'}, status=status.HTTP_400_BAD_REQUEST)

                preview = df.head(5).iloc[:, :5]
                dataset.metadata['preview'] = preview.to_dict()
                dataset.save()

                # Return a different serializer for the response
                response_serializer = DatasetSerializer(dataset)
                return Response(response_serializer.data, status=status.HTTP_201_CREATED)

            except Exception as e:
                # If parsing fails, delete the dataset record and file
                dataset.delete()
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)