from django.contrib import admin

from .models import Categorie


@admin.register(Categorie)
class CategorieAdmin(admin.ModelAdmin):
    list_display = ["nom", "abrv", "description"]
    search_fields = ["nom", "abrv", "description"]
    ordering = ["nom"]
