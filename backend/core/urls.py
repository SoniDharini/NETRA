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
]