"""Tests des catégories par défaut et de leur gestion administrateur (US15)."""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from core.models import Categorie

User = get_user_model()
URL = "/api/categories/"


def creer_utilisateur(email, role):
    return User.objects.create_user(
        email=email,
        password="Campus-Connect-2026!",
        first_name="Nadia",
        last_name="Alami",
        role=role,
    )


def client_pour(user=None):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user)
    return client


def test_url():
    assert reverse("categories") == URL


@pytest.mark.django_db
def test_categories_par_defaut_creees_par_la_migration():
    assert set(Categorie.objects.values_list("nom", flat=True)) == {
        "Conférence",
        "Atelier",
        "Compétition",
        "Culture",
        "Associatif",
    }


@pytest.mark.django_db
def test_creation_api_par_administrateur():
    admin = creer_utilisateur("admin@example.com", User.Role.ADMIN)

    response = client_pour(admin).post(
        URL,
        {
            "nom": "  Informatique  ",
            "description": "  Événements tech  ",
            "abrv": " IT ",
        },
        format="json",
    )

    assert response.status_code == 201
    assert response.json() == {
        "id": Categorie.objects.get(nom="Informatique").id,
        "nom": "Informatique",
        "description": "Événements tech",
        "abrv": "IT",
    }


@pytest.mark.django_db
@pytest.mark.parametrize("role", [User.Role.ETUDIANT, User.Role.ORGANISATEUR])
def test_creation_api_refusee_aux_non_administrateurs(role):
    user = creer_utilisateur("user@example.com", role)

    response = client_pour(user).post(URL, {"nom": "Informatique"}, format="json")

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seuls les administrateurs peuvent gérer les catégories."
    }
    assert not Categorie.objects.filter(nom="Informatique").exists()


@pytest.mark.django_db
def test_creation_api_sans_jeton_401():
    response = client_pour().post(URL, {"nom": "Informatique"}, format="json")

    assert response.status_code == 401
    assert not Categorie.objects.filter(nom="Informatique").exists()


@pytest.mark.django_db
def test_liste_categories_publique():
    Categorie.objects.get_or_create(nom="Conférence")
    Categorie.objects.get_or_create(nom="Atelier")
    Categorie.objects.create(nom="Informatique")

    response = client_pour().get(URL)

    assert response.status_code == 200
    noms = [categorie["nom"] for categorie in response.json()]
    assert "Atelier" in noms
    assert "Conférence" in noms
    assert "Informatique" in noms


@pytest.mark.django_db
def test_detail_categorie_public():
    categorie = Categorie.objects.create(
        nom="Sport", description="Activités sportives", abrv="SPORT"
    )

    response = client_pour().get(f"{URL}{categorie.pk}/")

    assert response.status_code == 200
    assert response.json() == {
        "id": categorie.pk,
        "nom": "Sport",
        "description": "Activités sportives",
        "abrv": "SPORT",
    }


@pytest.mark.django_db
def test_modification_et_suppression_par_administrateur():
    admin = creer_utilisateur("admin@example.com", User.Role.ADMIN)
    categorie = Categorie.objects.get(nom="Culture")
    detail_url = f"{URL}{categorie.pk}/"

    modification = client_pour(admin).patch(
        detail_url,
        {"nom": "Culture et loisirs", "abrv": "CUL"},
        format="json",
    )
    assert modification.status_code == 200
    categorie.refresh_from_db()
    assert categorie.nom == "Culture et loisirs"
    assert categorie.abrv == "CUL"

    suppression = client_pour(admin).delete(detail_url)
    assert suppression.status_code == 204
    assert not Categorie.objects.filter(pk=categorie.pk).exists()


@pytest.mark.django_db
def test_non_administrateur_ne_peut_pas_modifier_ni_supprimer():
    user = creer_utilisateur("user@example.com", User.Role.ETUDIANT)
    categorie = Categorie.objects.get(nom="Culture")
    detail_url = f"{URL}{categorie.pk}/"

    modification = client_pour(user).patch(
        detail_url, {"nom": "Autre"}, format="json"
    )
    assert modification.status_code == 403
    assert client_pour(user).delete(detail_url).status_code == 403
    assert Categorie.objects.filter(pk=categorie.pk).exists()


@pytest.mark.django_db
def test_nom_vide_refuse():
    admin = creer_utilisateur("admin@example.com", User.Role.ADMIN)

    response = client_pour(admin).post(URL, {"nom": "   "}, format="json")

    assert response.status_code == 400
    assert response.json() == {"nom": ["Ce champ ne peut pas être vide."]}


@pytest.mark.django_db
@pytest.mark.parametrize("nom", ["Conférence", "  conférence  "])
def test_nom_insensible_a_la_casse_refuse_en_creation(nom):
    admin = creer_utilisateur("admin@example.com", User.Role.ADMIN)
    Categorie.objects.get_or_create(nom="Conférence")

    response = client_pour(admin).post(URL, {"nom": nom}, format="json")

    assert response.status_code == 400
    assert response.json() == {"nom": ["Une catégorie existe déjà avec ce nom."]}


@pytest.mark.django_db
def test_django_admin_affiche_crud_categories(admin_client):
    changelist = admin_client.get(reverse("admin:core_categorie_changelist"))
    assert changelist.status_code == 200
    assert admin_client.get(reverse("admin:core_categorie_add")).status_code == 200

    categorie = Categorie.objects.get(nom="Culture")
    assert (
        admin_client.get(
            reverse("admin:core_categorie_change", args=[categorie.pk])
        ).status_code
        == 200
    )
