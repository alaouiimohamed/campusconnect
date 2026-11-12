"""Modèle utilisateur de CampusConnect (US01).

L'email sert d'identifiant de connexion ; le rôle est porté par la table User.
Les tables de profil (Etudiant, Organisateur, Professeur, ...) pointent vers
ce modèle via settings.AUTH_USER_MODEL.
"""

from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


def normaliser_email(email):
    """Email sans espaces autour et entièrement en minuscules."""
    return (email or "").strip().lower()


class UserManager(BaseUserManager):
    use_in_migrations = True

    def _create_user(self, email, password, **extra_fields):
        if not email:
            raise ValueError("L'adresse email est obligatoire.")
        user = self.model(email=normaliser_email(email), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", False)
        extra_fields.setdefault("is_superuser", False)
        extra_fields.setdefault("role", User.Role.ETUDIANT)
        return self._create_user(email, password, **extra_fields)

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        if extra_fields.get("is_staff") is not True:
            raise ValueError("Un superutilisateur doit avoir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Un superutilisateur doit avoir is_superuser=True.")
        if extra_fields.get("role") != User.Role.ADMIN:
            raise ValueError("Un superutilisateur doit avoir le rôle ADMIN.")
        return self._create_user(email, password, **extra_fields)


class User(AbstractUser):
    class Role(models.TextChoices):
        ETUDIANT = "ETUDIANT", "Étudiant"
        ORGANISATEUR = "ORGANISATEUR", "Organisateur"
        PROFESSEUR = "PROFESSEUR", "Professeur"
        ADMIN = "ADMIN", "Administrateur"

    username = None
    email = models.EmailField(
        "adresse email",
        unique=True,
        error_messages={"unique": "Un compte existe déjà avec cette adresse email."},
    )
    role = models.CharField(
        "rôle",
        max_length=20,
        choices=Role.choices,
        default=Role.ETUDIANT,
    )

    USERNAME_FIELD = "email"
    EMAIL_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = UserManager()

    class Meta:
        verbose_name = "utilisateur"
        verbose_name_plural = "utilisateurs"
        ordering = ["email"]

    def __str__(self):
        return self.email

    def clean(self):
        super().clean()
        self.email = normaliser_email(self.email)

    def save(self, *args, **kwargs):
        # Garantit l'unicité insensible à la casse, quel que soit le point d'entrée
        # (API, admin, shell).
        self.email = normaliser_email(self.email)
        super().save(*args, **kwargs)
