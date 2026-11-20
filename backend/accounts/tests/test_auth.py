"""Tests de l'API de connexion et déconnexion par JWT (US02)."""

import pytest
from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

User = get_user_model()

LOGIN_URL = "/api/auth/login/"
REFRESH_URL = "/api/auth/refresh/"
LOGOUT_URL = "/api/auth/logout/"
ME_URL = "/api/auth/me/"
MOT_DE_PASSE = "Campus-Connect-2026!"
IDENTIFIANTS_INVALIDES = {"detail": "Identifiants invalides."}


@pytest.fixture(autouse=True)
def vider_cache_throttling():
    # Le throttling DRF compte les requêtes dans le cache : on repart de zéro.
    cache.clear()
    yield
    cache.clear()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def utilisateur(db):
    return User.objects.create_user(
        email="amina.benali@example.com",
        password=MOT_DE_PASSE,
        first_name="Amina",
        last_name="Benali",
    )


def login(client, email="amina.benali@example.com", password=MOT_DE_PASSE):
    return client.post(LOGIN_URL, {"email": email, "password": password}, format="json")


def test_urls():
    assert reverse("login") == LOGIN_URL
    assert reverse("token_refresh") == REFRESH_URL
    assert reverse("logout") == LOGOUT_URL
    assert reverse("me") == ME_URL


# --- Connexion -------------------------------------------------------------


def test_connexion_reussie(api_client, utilisateur):
    response = login(api_client)

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"access", "refresh", "user"}
    assert body["user"] == {
        "id": utilisateur.id,
        "first_name": "Amina",
        "last_name": "Benali",
        "email": "amina.benali@example.com",
        "role": "ETUDIANT",
    }
    assert AccessToken(body["access"])["user_id"] == str(utilisateur.id)
    assert RefreshToken(body["refresh"])["user_id"] == str(utilisateur.id)
    assert MOT_DE_PASSE not in response.content.decode()

    utilisateur.refresh_from_db()
    assert utilisateur.last_login is not None


def test_connexion_email_insensible_a_la_casse(api_client, utilisateur):
    response = login(api_client, email="  Amina.BENALI@Example.com ")

    assert response.status_code == 200
    assert response.json()["user"]["email"] == "amina.benali@example.com"


def test_duree_de_vie_des_jetons(api_client, utilisateur):
    body = login(api_client).json()

    access = AccessToken(body["access"])
    refresh = RefreshToken(body["refresh"])
    durees = settings.SIMPLE_JWT

    # simplejwt calcule l'expiration du jeton d'accès à partir de l'heure de
    # création du refresh (la paire expire relativement au même instant),
    # alors que son iat est pris un peu plus tard, à sa propre création :
    # access["exp"] - access["iat"] peut valoir une seconde de moins.
    assert (
        access["exp"] - refresh["iat"]
        == durees["ACCESS_TOKEN_LIFETIME"].total_seconds()
    )
    assert refresh["iat"] <= access["iat"] < access["exp"]
    assert (
        refresh["exp"] - refresh["iat"]
        == durees["REFRESH_TOKEN_LIFETIME"].total_seconds()
    )


def test_mauvais_mot_de_passe(api_client, utilisateur):
    response = login(api_client, password="Mauvais-Mot-De-Passe-1")

    assert response.status_code == 401
    assert response.json() == IDENTIFIANTS_INVALIDES


@pytest.mark.django_db
def test_email_inconnu(api_client):
    response = login(api_client, email="inconnu@example.com")

    assert response.status_code == 401
    assert response.json() == IDENTIFIANTS_INVALIDES


def test_compte_inactif_ne_peut_pas_se_connecter(api_client, utilisateur):
    utilisateur.is_active = False
    utilisateur.save()

    response = login(api_client)

    # Même réponse qu'un mauvais mot de passe : rien n'indique que le compte existe.
    assert response.status_code == 401
    assert response.json() == IDENTIFIANTS_INVALIDES


@pytest.mark.django_db
def test_connexion_champs_manquants(api_client):
    response = api_client.post(LOGIN_URL, {}, format="json")

    assert response.status_code == 400
    assert set(response.json()) == {"email", "password"}


def test_throttle_5_tentatives_par_minute(api_client, utilisateur):
    for _ in range(5):
        assert login(api_client, password="Mauvais-Mot-De-Passe-1").status_code == 401

    # 6e tentative dans la minute : refusée, même avec le bon mot de passe.
    response = login(api_client)

    assert response.status_code == 429
    assert "access" not in response.json()


def test_connexion_ignore_un_entete_authorization_invalide(api_client, utilisateur):
    api_client.credentials(HTTP_AUTHORIZATION="Bearer jeton-invalide")

    assert login(api_client).status_code == 200


# --- Rafraîchissement ----------------------------------------------------


def test_refresh_renvoie_un_nouveau_jeton_d_acces(api_client, utilisateur):
    jetons = login(api_client).json()

    response = api_client.post(
        REFRESH_URL, {"refresh": jetons["refresh"]}, format="json"
    )

    assert response.status_code == 200
    body = response.json()
    assert set(body) == {"access", "refresh"}
    assert AccessToken(body["access"])["user_id"] == str(utilisateur.id)
    # Rotation : un nouveau jeton de rafraîchissement est émis.
    assert body["refresh"] != jetons["refresh"]


def test_refresh_ancien_jeton_refuse_apres_rotation(api_client, utilisateur):
    ancien = login(api_client).json()["refresh"]
    assert (
        api_client.post(REFRESH_URL, {"refresh": ancien}, format="json").status_code
        == 200
    )

    response = api_client.post(REFRESH_URL, {"refresh": ancien}, format="json")

    assert response.status_code == 401


@pytest.mark.django_db
def test_refresh_jeton_invalide(api_client):
    response = api_client.post(REFRESH_URL, {"refresh": "pas-un-jeton"}, format="json")

    assert response.status_code == 401


# --- Déconnexion ---------------------------------------------------------


def test_logout_puis_refresh_refuse(api_client, utilisateur):
    refresh = login(api_client).json()["refresh"]

    response = api_client.post(LOGOUT_URL, {"refresh": refresh}, format="json")

    assert response.status_code == 200
    assert response.json() == {}
    response = api_client.post(REFRESH_URL, {"refresh": refresh}, format="json")
    assert response.status_code == 401


def test_logout_deux_fois_refuse(api_client, utilisateur):
    refresh = login(api_client).json()["refresh"]
    api_client.post(LOGOUT_URL, {"refresh": refresh}, format="json")

    response = api_client.post(LOGOUT_URL, {"refresh": refresh}, format="json")

    assert response.status_code == 401


@pytest.mark.django_db
def test_logout_sans_jeton(api_client):
    response = api_client.post(LOGOUT_URL, {}, format="json")

    assert response.status_code == 400
    assert set(response.json()) == {"refresh"}


# --- Utilisateur connecté ------------------------------------------------


def test_me_avec_jeton(api_client, utilisateur):
    access = login(api_client).json()["access"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    response = api_client.get(ME_URL)

    assert response.status_code == 200
    assert response.json() == {
        "id": utilisateur.id,
        "first_name": "Amina",
        "last_name": "Benali",
        "email": "amina.benali@example.com",
        "role": "ETUDIANT",
    }


@pytest.mark.django_db
def test_me_sans_jeton(api_client):
    response = api_client.get(ME_URL)

    assert response.status_code == 401
    assert response.headers["WWW-Authenticate"].startswith("Bearer")


@pytest.mark.django_db
def test_me_jeton_invalide(api_client):
    api_client.credentials(HTTP_AUTHORIZATION="Bearer pas-un-jeton")

    response = api_client.get(ME_URL)

    assert response.status_code == 401


def test_me_refuse_le_jeton_de_rafraichissement(api_client, utilisateur):
    refresh = login(api_client).json()["refresh"]
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {refresh}")

    response = api_client.get(ME_URL)

    assert response.status_code == 401


def test_me_compte_desactive_apres_connexion(api_client, utilisateur):
    access = login(api_client).json()["access"]
    utilisateur.is_active = False
    utilisateur.save()
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {access}")

    response = api_client.get(ME_URL)

    assert response.status_code == 401


# --- L'inscription (US01) reste publique ---------------------------------


@pytest.mark.django_db
def test_inscription_reste_publique_avec_jwt_par_defaut(api_client):
    # Même un en-tête Authorization invalide ne bloque pas l'inscription.
    api_client.credentials(HTTP_AUTHORIZATION="Bearer jeton-invalide")

    response = api_client.post(
        "/api/auth/register/",
        {
            "first_name": "Youssef",
            "last_name": "Alami",
            "email": "youssef.alami@example.com",
            "password": MOT_DE_PASSE,
            "password_confirm": MOT_DE_PASSE,
        },
        format="json",
    )

    assert response.status_code == 201
