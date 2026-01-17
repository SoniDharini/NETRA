from django.urls import path
from .views import UploadViewSet
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register(r'upload', UploadViewSet, basename='upload')
urlpatterns = router.urls