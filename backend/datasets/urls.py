from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    upload_dataset,
    preprocess_dataset,
    visualize_dataset,
    UploadViewSet,
    JsonUploadView,
    get_data_preview,
    get_data_profile,
    get_dataset_profile_full,
    get_preprocessing_suggestions,
    get_feature_engineering_suggestions,
    apply_preprocessing,
    download_preprocessed_data,
    profile_and_suggest_features,
    auto_process_dataset,
    get_visualization_suggestions,
    save_visualization,
    get_saved_visualizations
)

router = DefaultRouter()
router.register(r'uploads', UploadViewSet, basename='dataset')

urlpatterns = [
    path('', include(router.urls)),
    path('upload/', upload_dataset, name='upload-dataset'),
    path('upload-json/', JsonUploadView.as_view(), name='upload-json'),
    path('get-data-preview/', get_data_preview, name='get-data-preview'),
    path('get-data-profile/', get_data_profile, name='get-data-profile'),
    path('get-dataset-profile-full/', get_dataset_profile_full, name='get-dataset-profile-full'),
    path('preprocessing-suggestions/', get_preprocessing_suggestions, name='preprocessing-suggestions'),
    path('feature-engineering-suggestions/', get_feature_engineering_suggestions, name='feature-engineering-suggestions'),
    path('<int:dataset_id>/profile-and-suggest/', profile_and_suggest_features, name='profile-and-suggest-features'),
    path('apply-preprocessing/', apply_preprocessing, name='apply-preprocessing'),
    path('auto-process/', auto_process_dataset, name='auto-process-dataset'),
    path('download-preprocessed/', download_preprocessed_data, name='download-preprocessed'),
    
    # RESTful endpoints as per requirements
    path('dataset/<int:dataset_id>/download/', download_preprocessed_data, name='rest-download-dataset'),
    path('dataset/<int:dataset_id>/preprocess/', apply_preprocessing, name='rest-preprocess-dataset'),
    path('preprocess/<int:dataset_id>/', preprocess_dataset, name='preprocess-dataset'),
    path('visualize/<int:dataset_id>/', visualize_dataset, name='visualize-dataset'),

    # Visualization
    path('visualization-suggestions/', get_visualization_suggestions, name='visualization-suggestions'),
    path('save-visualization/', save_visualization, name='save-visualization'),
    path('saved-visualizations/<int:dataset_id>/', get_saved_visualizations, name='get-saved-visualizations'),
]
