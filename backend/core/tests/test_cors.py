"""CORS : le frontend Vite (http://localhost:5173) doit pouvoir appeler l'API.

Les origines autorisées viennent de CORS_ALLOWED_ORIGINS (backend/.env),
avec http://localhost:5173 par défaut.
"""

import pytest
from django.conf import settings
from django.test import Client

URL_INSCRIPTION = "/api/auth/register/"
ORIGINE_FRONTEND = "http://localhost:5173"


@pytest.fixture
def client():
    return Client()


def preflight(client, origine):
    return client.options(
        URL_INSCRIPTION,
        HTTP_ORIGIN=origine,
        HTTP_ACCESS_CONTROL_REQUEST_METHOD="POST",
        HTTP_ACCESS_CONTROL_REQUEST_HEADERS="content-type",
    )


def test_origine_frontend_configuree():
    assert ORIGINE_FRONTEND in settings.CORS_ALLOWED_ORIGINS


def test_preflight_autorise_le_frontend(client):
    response = preflight(client, ORIGINE_FRONTEND)

    assert response.status_code == 200
    assert response["Access-Control-Allow-Origin"] == ORIGINE_FRONTEND
    assert "POST" in response["Access-Control-Allow-Methods"]
    assert "content-type" in response["Access-Control-Allow-Headers"]


def test_preflight_refuse_une_origine_inconnue(client):
    response = preflight(client, "https://site-inconnu.example")

    assert "Access-Control-Allow-Origin" not in response


@pytest.mark.django_db
def test_reponse_post_porte_l_entete_cors(client):
    response = client.post(
        URL_INSCRIPTION,
        data={},
        content_type="application/json",
        HTTP_ORIGIN=ORIGINE_FRONTEND,
    )

    # 400 (corps vide) : le navigateur doit quand même pouvoir lire les erreurs.
    assert response.status_code == 400
    assert response["Access-Control-Allow-Origin"] == ORIGINE_FRONTEND
