from unittest import mock

import pytest
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework.throttling import ScopedRateThrottle

User = get_user_model()
URL = "/api/auth/register/"
MOT_DE_PASSE = "Campus-Connect-2026!"


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
def payload():
    return {
        "first_name": "Amina",
        "last_name": "Benali",
        "email": "amina.benali@example.com",
        "password": MOT_DE_PASSE,
        "password_confirm": MOT_DE_PASSE,
    }


def post(client, data):
    return client.post(URL, data, format="json")


def test_url_register():
    assert reverse("register") == URL


@pytest.mark.django_db
def test_creation_reussie(api_client, payload):
    response = post(api_client, payload)

    assert response.status_code == 201
    body = response.json()
    assert set(body) == {"id", "first_name", "last_name", "email", "role"}
    assert body["role"] == "ETUDIANT"
    assert body["email"] == "amina.benali@example.com"

    user = User.objects.get(email="amina.benali@example.com")
    assert user.role == User.Role.ETUDIANT
    assert user.password != MOT_DE_PASSE
    assert user.password.startswith("pbkdf2_sha256$")
    assert user.check_password(MOT_DE_PASSE)


@pytest.mark.django_db
def test_email_enregistre_en_minuscules(api_client, payload):
    payload["email"] = "  Amina.BENALI@Example.COM "

    response = post(api_client, payload)

    assert response.status_code == 201
    assert response.json()["email"] == "amina.benali@example.com"


@pytest.mark.django_db
def test_reponse_ne_contient_jamais_le_mot_de_passe(api_client, payload):
    response = post(api_client, payload)

    assert response.status_code == 201
    contenu = response.content.decode()
    assert "password" not in contenu
    assert MOT_DE_PASSE not in contenu


@pytest.mark.django_db
def test_role_envoye_est_ignore(api_client, payload):
    payload["role"] = "ADMIN"

    response = post(api_client, payload)

    assert response.status_code == 201
    assert response.json()["role"] == "ETUDIANT"
    user = User.objects.get(email=payload["email"])
    assert user.role == User.Role.ETUDIANT
    assert not user.is_staff
    assert not user.is_superuser


@pytest.mark.django_db
@pytest.mark.parametrize(
    "email_existant",
    ["amina.benali@example.com", "AMINA.Benali@EXAMPLE.com"],
)
def test_email_deja_utilise(api_client, payload, email_existant):
    User.objects.create_user(email=email_existant, password=MOT_DE_PASSE)
    payload["email"] = "Amina.Benali@Example.com"

    response = post(api_client, payload)

    assert response.status_code == 400
    assert response.json() == {
        "email": ["Un compte existe déjà avec cette adresse email."]
    }
    assert User.objects.count() == 1


@pytest.mark.django_db
def test_email_invalide(api_client, payload):
    payload["email"] = "pas-un-email"

    response = post(api_client, payload)

    assert response.status_code == 400
    assert response.json() == {"email": ["Saisissez une adresse email valide."]}


@pytest.mark.django_db
def test_mots_de_passe_differents(api_client, payload):
    payload["password_confirm"] = "Autre-Mot-De-Passe-99"

    response = post(api_client, payload)

    assert response.status_code == 400
    assert response.json() == {
        "password_confirm": ["Les mots de passe ne correspondent pas."]
    }
    assert not User.objects.exists()


@pytest.mark.django_db
@pytest.mark.parametrize("faible", ["123", "12345678", "password", "aminabenali"])
def test_mot_de_passe_faible(api_client, payload, faible):
    payload["password"] = payload["password_confirm"] = faible

    response = post(api_client, payload)

    assert response.status_code == 400
    erreurs = response.json()
    assert list(erreurs) == ["password"]
    assert erreurs["password"]
    assert not User.objects.exists()


@pytest.mark.django_db
def test_mot_de_passe_trop_court_message_en_francais(api_client, payload):
    payload["password"] = payload["password_confirm"] = "Ab1!"

    response = post(api_client, payload)

    assert response.status_code == 400
    assert any("trop court" in message for message in response.json()["password"])


@pytest.mark.django_db
def test_champs_manquants(api_client):
    response = post(api_client, {})

    assert response.status_code == 400
    erreurs = response.json()
    champs = {"first_name", "last_name", "email", "password", "password_confirm"}
    assert set(erreurs) == champs
    for champ in champs:
        assert erreurs[champ] == ["Ce champ est obligatoire."]


@pytest.mark.django_db
@pytest.mark.parametrize("champ", ["first_name", "last_name", "email", "password"])
def test_champ_vide(api_client, payload, champ):
    payload[champ] = "   " if champ != "password" else ""

    response = post(api_client, payload)

    assert response.status_code == 400
    assert response.json()[champ] == ["Ce champ ne peut pas être vide."]


def test_endpoint_accessible_sans_authentification():
    from accounts.views import RegisterView

    assert RegisterView.authentication_classes == []


@pytest.mark.django_db
def test_throttling_renvoie_429(api_client, payload):
    with mock.patch.object(
        ScopedRateThrottle, "THROTTLE_RATES", {"register": "2/hour"}
    ):
        for i in range(2):
            payload["email"] = f"etudiant{i}@example.com"
            assert post(api_client, payload).status_code == 201

        payload["email"] = "etudiant2@example.com"
        response = post(api_client, payload)

    assert response.status_code == 429
