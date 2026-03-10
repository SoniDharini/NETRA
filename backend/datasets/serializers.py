from rest_framework import serializers
from .models import Dataset, Visualization


class DatasetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Dataset
        fields = '__all__'
        read_only_fields = ('id', 'uploaded_at')

    def create(self, validated_data):
        # The user will be added in the view.
        return Dataset.objects.create(**validated_data)


class VisualizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Visualization
        fields = '__all__'
        read_only_fields = ('id', 'created_at')
