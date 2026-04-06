from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse


def health_check(request):
    """Health check endpoint for backend verification."""
    return JsonResponse({'status': 'ok', 'service': 'netra-backend'})


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', health_check),
    path('health/', health_check),
    path('api/health/', health_check),
    path('api/auth/', include('accounts.urls')),
    path('api/datasets/', include('datasets.urls')),
    path('api/visualizations/nlq', getattr(__import__('datasets.views', fromlist=['process_nlq_view']), 'process_nlq_view')),
    path('api/models/recommendations/', getattr(__import__('datasets.views', fromlist=['get_model_recommendations_view']), 'get_model_recommendations_view')),
]