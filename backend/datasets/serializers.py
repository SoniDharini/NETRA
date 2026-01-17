from rest_framework import serializers
from .models import Dataset

class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = ('id', 'name', 'file', 'uploaded_at', 'metadata')
        read_only_fields = ('id', 'uploaded_at')

    def create(self, validated_data):
        # The user will be added in the view.
        return Dataset.objects.create(**validated_data)
