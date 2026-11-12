import pytest
from django.contrib.auth import get_user_model
from django.db import IntegrityError

User = get_user_model()


def test_auth_user_model_est_accounts_user():
    assert User._meta.label == "accounts.User"
    assert User.USERNAME_FIELD == "email"
    assert "username" not in {f.name for f in User._meta.get_fields()}


@pytest.mark.django_db
def test_create_user_etudiant_par_defaut_et_mot_de_passe_hache():
    user = User.objects.create_user(
        email="Amina.Test@Example.COM",
        password="MotDePasse-Solide-42",
        first_name="Amina",
        last_name="Test",
    )

    assert user.email == "amina.test@example.com"
    assert user.role == User.Role.ETUDIANT
    assert user.is_active
    assert not user.is_staff
    assert not user.is_superuser
    assert user.password != "MotDePasse-Solide-42"
    assert user.check_password("MotDePasse-Solide-42")
    assert str(user) == "amina.test@example.com"


@pytest.mark.django_db
def test_create_user_sans_email_leve_une_erreur():
    with pytest.raises(ValueError):
        User.objects.create_user(email="", password="MotDePasse-Solide-42")


@pytest.mark.django_db
def test_create_superuser_a_le_role_admin():
    admin = User.objects.create_superuser(
        email="admin@example.com",
        password="MotDePasse-Solide-42",
        first_name="Ad",
        last_name="Min",
    )

    assert admin.role == User.Role.ADMIN
    assert admin.is_staff
    assert admin.is_superuser


@pytest.mark.django_db
@pytest.mark.parametrize(
    "extra",
    [{"is_staff": False}, {"is_superuser": False}, {"role": "ETUDIANT"}],
)
def test_create_superuser_refuse_une_configuration_incoherente(extra):
    with pytest.raises(ValueError):
        User.objects.create_superuser(
            email="admin@example.com", password="MotDePasse-Solide-42", **extra
        )


@pytest.mark.django_db
def test_email_unique_sans_tenir_compte_des_majuscules():
    User.objects.create_user(email="dup@example.com", password="x")

    with pytest.raises(IntegrityError):
        User.objects.create_user(email="DUP@Example.com", password="x")
