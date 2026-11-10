from unittest import mock

import pytest
from django.db import OperationalError, connection
from django.urls import reverse
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


@pytest.mark.django_db
def test_health_renvoie_ok(api_client):
    response = api_client.get(reverse("health"))

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


@pytest.mark.django_db
def test_health_renvoie_503_si_base_injoignable(api_client):
    with mock.patch(
        "core.views.connection.cursor", side_effect=OperationalError("down")
    ):
        response = api_client.get(reverse("health"))

    assert response.status_code == 503
    assert response.json()["status"] == "error"


def test_health_accessible_sans_authentification():
    from core.views import HealthView

    assert HealthView.authentication_classes == []


@pytest.mark.django_db
def test_extension_pgvector_active():
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1 FROM pg_extension WHERE extname = 'vector'")
        assert cursor.fetchone() is not None
