
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UploadViewSet,
    JsonUploadView,
    get_data_preview,
    get_data_profile,
    get_preprocessing_suggestions,
    get_feature_engineering_suggestions,
    apply_preprocessing,
    download_preprocessed_data,
    profile_and_suggest_features
)

router = DefaultRouter()
router.register(r'uploads', UploadViewSet, basename='dataset')

urlpatterns = [
    path('', include(router.urls)),
    path('upload-json/', JsonUploadView.as_view(), name='upload-json'),
    path('get-data-preview/', get_data_preview, name='get-data-preview'),
    path('get-data-profile/', get_data_profile, name='get-data-profile'),
    path('preprocessing-suggestions/', get_preprocessing_suggestions, name='preprocessing-suggestions'),
    path('feature-engineering-suggestions/', get_feature_engineering_suggestions, name='feature-engineering-suggestions'),
    path('<uuid:dataset_id>/profile-and-suggest/', profile_and_suggest_features, name='profile-and-suggest-features'),
    path('apply-preprocessing/', apply_preprocessing, name='apply-preprocessing'),
    path('download-preprocessed/', download_preprocessed_data, name='download-preprocessed'),
]