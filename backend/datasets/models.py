import uuid
from django.db import models
from django.contrib.auth.models import User

class Dataset(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    file = models.FileField(upload_to='datasets/')  # original_file - stored in media/datasets/
    processed_file = models.FileField(upload_to='datasets/processed/', null=True, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)
    rows = models.IntegerField(null=True, blank=True)
    columns = models.JSONField(null=True, blank=True)  # column names list
    preprocessing_applied = models.BooleanField(default=False)
    metadata = models.JSONField(default=dict)

    def __str__(self):
        return self.name


class Visualization(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    dataset = models.ForeignKey(Dataset, on_delete=models.CASCADE)
    title = models.CharField(max_length=255)
    chart_type = models.CharField(max_length=50)
    config = models.JSONField(default=dict)
    is_ai_recommended = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title