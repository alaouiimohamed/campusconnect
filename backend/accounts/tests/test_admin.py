import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse

User = get_user_model()


@pytest.mark.django_db
@pytest.mark.parametrize("vue", ["changelist", "add"])
def test_pages_admin_user(admin_client, vue):
    response = admin_client.get(reverse(f"admin:accounts_user_{vue}"))

    assert response.status_code == 200


@pytest.mark.django_db
def test_page_modification_admin_user(admin_client):
    user = User.objects.create_user(email="etu@example.com", password="x")

    response = admin_client.get(reverse("admin:accounts_user_change", args=[user.pk]))

    assert response.status_code == 200
    assert b"etu@example.com" in response.content
