"""Tests de l'API de création d'événement (US07)."""

from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from core.models import Categorie, Departement, Evenement, Organisateur, Professeur

User = get_user_model()

URL = "/api/evenements/"
CHAMPS_OBLIGATOIRES = [
    "titre",
    "categories",
    "description",
    "date_debut",
    "date_fin",
    "lieu",
    "capacite",
]


def creer_utilisateur(email, role, **extra):
    return User.objects.create_user(
        email=email,
        password="Campus-Connect-2026!",
        first_name=extra.pop("first_name", "Youssef"),
        last_name=extra.pop("last_name", "Alami"),
        role=role,
        **extra,
    )


@pytest.fixture
def organisateur(db):
    user = creer_utilisateur("contact@bde-fpk.org", User.Role.ORGANISATEUR)
    Organisateur.objects.create(user=user, organisation="BDE de la FPK")
    return user


@pytest.fixture
def categories(db):
    return [
        Categorie.objects.get_or_create(nom="Conférence")[0],
        Categorie.objects.create(nom="Informatique"),
    ]


def client_pour(user):
    client = APIClient()
    if user is not None:
        client.force_authenticate(user)
    return client


def donnees(categories, /, **overrides):
    debut = timezone.now() + timedelta(days=10)
    data = {
        "titre": "Journée de l'intelligence artificielle",
        "categories": [c.id for c in categories],
        "description": "Conférences et ateliers autour de l'IA.",
        "date_debut": debut.isoformat(),
        "date_fin": (debut + timedelta(hours=3)).isoformat(),
        "lieu": "Amphi A, FPK",
        "capacite": 120,
    }
    data.update(overrides)
    return data


def creer(user, data):
    return client_pour(user).post(URL, data, format="json")


def test_url():
    assert reverse("evenements") == URL


# --- Création réussie ---------------------------------------------------------


@pytest.mark.django_db
def test_creation_brouillon_par_defaut(organisateur, categories):
    data = donnees(categories)
    response = creer(organisateur, data)

    assert response.status_code == 201
    body = response.json()
    evenement = Evenement.objects.get()
    assert body["id"] == evenement.id
    assert body["statut"] == "BROUILLON"
    assert body["titre"] == data["titre"]
    assert body["description"] == data["description"]
    assert body["lieu"] == "Amphi A, FPK"
    assert body["capacite"] == 120
    assert body["categories"] == [
        {"id": categories[0].id, "nom": "Conférence"},
        {"id": categories[1].id, "nom": "Informatique"},
    ]
    assert body["organisateur"] == {
        "id": organisateur.id,
        "first_name": "Youssef",
        "last_name": "Alami",
        "organisation": "BDE de la FPK",
    }
    assert evenement.organisateur.user == organisateur
    assert evenement.statut == Evenement.Statut.BROUILLON
    assert set(evenement.categories.all()) == set(categories)


@pytest.mark.django_db
def test_creation_brouillon_explicite(organisateur, categories):
    response = creer(organisateur, donnees(categories, statut="BROUILLON"))

    assert response.status_code == 201
    assert response.json()["statut"] == "BROUILLON"


@pytest.mark.django_db
def test_creation_soumise_pour_validation(organisateur, categories):
    response = creer(organisateur, donnees(categories, statut="EN_ATTENTE"))

    assert response.status_code == 201
    assert response.json()["statut"] == "EN_ATTENTE"
    assert Evenement.objects.get().statut == Evenement.Statut.EN_ATTENTE


@pytest.mark.django_db
def test_jwt_reel_accepte(organisateur, categories):
    client = APIClient()
    login = client.post(
        "/api/auth/login/",
        {"email": organisateur.email, "password": "Campus-Connect-2026!"},
        format="json",
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {login.json()['access']}")

    response = client.post(URL, donnees(categories), format="json")

    assert response.status_code == 201


# --- Authentification et rôles -----------------------------------------------


@pytest.mark.django_db
def test_sans_jeton_401(categories):
    response = creer(None, donnees(categories))

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"].startswith("Bearer")
    assert not Evenement.objects.exists()


@pytest.mark.django_db
def test_jeton_invalide_401(categories):
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION="Bearer pas-un-jeton")

    response = client.post(URL, donnees(categories), format="json")

    assert response.status_code == 401
    assert response.json()["code"] == "token_not_valid"


@pytest.mark.django_db
@pytest.mark.parametrize("role", [User.Role.ETUDIANT, User.Role.ADMIN])
def test_autres_roles_403(categories, role):
    user = creer_utilisateur("autre@example.com", role)

    response = creer(user, donnees(categories))

    assert response.status_code == 403
    assert response.json() == {
        "detail": "Seuls les organisateurs et les professeurs "
        "peuvent créer un événement."
    }
    assert not Evenement.objects.exists()
    assert not Organisateur.objects.filter(user=user).exists()


@pytest.mark.django_db
def test_professeur_sans_profil_organisateur(categories):
    professeur = creer_utilisateur(
        "prof@usms.ac.ma", User.Role.PROFESSEUR, first_name="Nadia"
    )
    Professeur.objects.create(
        user=professeur,
        code_prof="P-001",
        departement=Departement.objects.create(nom="Informatique"),
    )

    response = creer(professeur, donnees(categories))

    assert response.status_code == 201
    profil = Organisateur.objects.get(user=professeur)
    assert profil.organisation == ""
    assert Evenement.objects.get().organisateur == profil
    assert response.json()["organisateur"]["first_name"] == "Nadia"


@pytest.mark.django_db
def test_professeur_reutilise_son_profil(categories):
    professeur = creer_utilisateur("prof@usms.ac.ma", User.Role.PROFESSEUR)

    assert creer(professeur, donnees(categories)).status_code == 201
    assert creer(professeur, donnees(categories)).status_code == 201

    assert Organisateur.objects.filter(user=professeur).count() == 1
    assert Evenement.objects.filter(organisateur__user=professeur).count() == 2


@pytest.mark.django_db
def test_organisateur_du_corps_ignore(organisateur, categories):
    autre = creer_utilisateur("autre@bde.org", User.Role.ORGANISATEUR)
    profil_autre = Organisateur.objects.create(user=autre, organisation="Autre")

    response = creer(organisateur, donnees(categories, organisateur=profil_autre.pk))

    assert response.status_code == 201
    assert response.json()["organisateur"]["id"] == organisateur.id
    assert Evenement.objects.get().organisateur.user == organisateur
    assert not profil_autre.evenements.exists()


# --- Validation -------------------------------------------------------------


@pytest.mark.django_db
def test_corps_vide_tous_les_champs_obligatoires(organisateur):
    response = creer(organisateur, {})

    assert response.status_code == 400
    body = response.json()
    assert set(body) == set(CHAMPS_OBLIGATOIRES)
    assert body["categories"] == ["Choisissez au moins une catégorie."]
    assert body["titre"] == ["Ce champ est obligatoire."]


@pytest.mark.django_db
@pytest.mark.parametrize("champ", CHAMPS_OBLIGATOIRES)
def test_champ_manquant(organisateur, categories, champ):
    data = donnees(categories)
    del data[champ]

    response = creer(organisateur, data)

    assert response.status_code == 400
    assert set(response.json()) == {champ}
    assert not Evenement.objects.exists()


@pytest.mark.django_db
@pytest.mark.parametrize("champ", ["titre", "description", "lieu"])
def test_texte_vide(organisateur, categories, champ):
    response = creer(organisateur, donnees(categories, **{champ: "   "}))

    assert response.status_code == 400
    assert response.json() == {champ: ["Ce champ ne peut pas être vide."]}


@pytest.mark.django_db
@pytest.mark.parametrize("champ", ["titre", "lieu"])
def test_texte_trop_long(organisateur, categories, champ):
    response = creer(organisateur, donnees(categories, **{champ: "x" * 151}))

    assert response.status_code == 400
    assert response.json() == {champ: ["Ce champ ne doit pas dépasser 150 caractères."]}


@pytest.mark.django_db
def test_titre_150_caracteres_accepte(organisateur, categories):
    response = creer(organisateur, donnees(categories, titre="x" * 150))

    assert response.status_code == 201


@pytest.mark.django_db
def test_date_fin_avant_date_debut(organisateur, categories):
    debut = timezone.now() + timedelta(days=5)
    data = donnees(
        categories,
        date_debut=debut.isoformat(),
        date_fin=(debut - timedelta(hours=1)).isoformat(),
    )

    response = creer(organisateur, data)

    assert response.status_code == 400
    assert response.json() == {
        "date_fin": ["La date de fin doit être après la date de début."]
    }


@pytest.mark.django_db
def test_date_fin_egale_date_debut(organisateur, categories):
    debut = (timezone.now() + timedelta(days=5)).isoformat()

    data = donnees(categories, date_debut=debut, date_fin=debut)

    response = creer(organisateur, data)

    assert response.status_code == 400
    assert "date_fin" in response.json()


@pytest.mark.django_db
def test_date_debut_passee(organisateur, categories):
    debut = timezone.now() - timedelta(days=1)
    data = donnees(
        categories,
        date_debut=debut.isoformat(),
        date_fin=(debut + timedelta(days=2)).isoformat(),
    )

    response = creer(organisateur, data)

    assert response.status_code == 400
    assert response.json() == {
        "date_debut": ["La date de début doit être dans le futur."]
    }


@pytest.mark.django_db
def test_date_invalide(organisateur, categories):
    response = creer(organisateur, donnees(categories, date_debut="demain"))

    assert response.status_code == 400
    assert response.json()["date_debut"][0].startswith("Date invalide")


@pytest.mark.django_db
@pytest.mark.parametrize("capacite", [0, -5])
def test_capacite_non_positive(organisateur, categories, capacite):
    response = creer(organisateur, donnees(categories, capacite=capacite))

    assert response.status_code == 400
    assert response.json() == {"capacite": ["La capacité doit être supérieure à 0."]}


@pytest.mark.django_db
def test_categorie_inexistante(organisateur, categories):
    response = creer(
        organisateur, donnees(categories, categories=[categories[0].id, 999999])
    )

    assert response.status_code == 400
    assert response.json() == {"categories": ["Catégorie introuvable : 999999."]}
    assert not Evenement.objects.exists()


@pytest.mark.django_db
def test_liste_de_categories_vide(organisateur, categories):
    response = creer(organisateur, donnees(categories, categories=[]))

    assert response.status_code == 400
    assert response.json() == {"categories": ["Choisissez au moins une catégorie."]}


@pytest.mark.django_db
@pytest.mark.parametrize("statut", ["PUBLIE", "COMPLET", "ANNULE", "brouillon", ""])
def test_statut_refuse(organisateur, categories, statut):
    response = creer(organisateur, donnees(categories, statut=statut))

    assert response.status_code == 400
    assert response.json() == {
        "statut": [
            "Statut invalide : choisissez BROUILLON ou EN_ATTENTE. "
            "Seul l'administrateur publie un événement."
        ]
    }
    assert not Evenement.objects.exists()
