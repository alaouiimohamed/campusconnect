from django.urls import path

from .views import (
    CategorieDetailView,
    CategorieListCreateView,
    EvenementCreateView,
    HealthView,
)

urlpatterns = [
    path("health/", HealthView.as_view(), name="health"),
    path("evenements/", EvenementCreateView.as_view(), name="evenements"),
    path("categories/", CategorieListCreateView.as_view(), name="categories"),
    path(
        "categories/<int:pk>/",
        CategorieDetailView.as_view(),
        name="categorie-detail",
    ),
]
