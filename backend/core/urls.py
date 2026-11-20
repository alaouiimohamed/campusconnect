from django.urls import path

from .views import EvenementCreateView, HealthView

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("evenements/", EvenementCreateView.as_view(), name="evenements"),
]
