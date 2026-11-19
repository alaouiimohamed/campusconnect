from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from core.models import Organisateur

from .models import User, normaliser_email

# Rôles qu'un visiteur peut choisir lui-même à l'inscription.
# PROFESSEUR et ADMIN ne sont attribués que par un administrateur (US03).
ROLES_INSCRIPTION = [User.Role.ETUDIANT, User.Role.ORGANISATEUR]

MESSAGES_TEXTE = {
    "required": "Ce champ est obligatoire.",
    "blank": "Ce champ ne peut pas être vide.",
    "null": "Ce champ ne peut pas être vide.",
    "invalid": "Valeur invalide.",
    "max_length": "Ce champ ne doit pas dépasser {max_length} caractères.",
}


def _champ_texte(**kwargs):
    return serializers.CharField(
        error_messages=MESSAGES_TEXTE, trim_whitespace=True, **kwargs
    )


def _champ_mot_de_passe():
    return serializers.CharField(
        write_only=True,
        trim_whitespace=False,
        style={"input_type": "password"},
        error_messages=MESSAGES_TEXTE,
    )


class RegisterSerializer(serializers.ModelSerializer):
    """Création de compte (US01), depuis l'espace étudiant ou organisateur.

    - role : ETUDIANT (par défaut) ou ORGANISATEUR ; toute autre valeur est
      refusée (PROFESSEUR et ADMIN sont attribués par un admin, US03) ;
    - organisation : obligatoire pour un ORGANISATEUR, ignorée sinon ; le
      profil core.Organisateur est créé dans la même transaction que le compte.
    """

    role = serializers.ChoiceField(
        choices=ROLES_INSCRIPTION,
        default=User.Role.ETUDIANT,
        error_messages={
            **MESSAGES_TEXTE,
            "invalid_choice": "Rôle invalide : choisissez ETUDIANT ou ORGANISATEUR.",
        },
    )
    organisation = _champ_texte(
        max_length=150, required=False, allow_blank=True, write_only=True
    )
    first_name = _champ_texte(max_length=150)
    last_name = _champ_texte(max_length=150)
    email = serializers.EmailField(
        max_length=254,
        error_messages={
            **MESSAGES_TEXTE,
            "invalid": "Saisissez une adresse email valide.",
        },
    )
    password = _champ_mot_de_passe()
    password_confirm = _champ_mot_de_passe()

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "email",
            "role",
            "organisation",
            "password",
            "password_confirm",
        ]
        read_only_fields = ["id"]

    def validate_email(self, value):
        email = normaliser_email(value)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "Un compte existe déjà avec cette adresse email."
            )
        return email

    def validate(self, attrs):
        if attrs["role"] == User.Role.ORGANISATEUR:
            if "organisation" not in attrs:
                raise serializers.ValidationError(
                    {"organisation": MESSAGES_TEXTE["required"]}
                )
            if not attrs["organisation"]:
                raise serializers.ValidationError(
                    {"organisation": MESSAGES_TEXTE["blank"]}
                )
        else:
            # Un étudiant n'a pas d'organisation : la valeur est ignorée.
            attrs.pop("organisation", None)

        password = attrs["password"]
        if password != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Les mots de passe ne correspondent pas."}
            )

        # Utilisateur non enregistré : sert au validateur de similarité
        # (le mot de passe ne doit pas ressembler au nom ou à l'email).
        candidat = User(
            email=attrs["email"],
            first_name=attrs["first_name"],
            last_name=attrs["last_name"],
        )
        try:
            password_validation.validate_password(password, user=candidat)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc
        return attrs

    def create(self, validated_data):
        validated_data.pop("password_confirm")
        role = validated_data["role"]
        try:
            # Compte et profil organisateur : tout ou rien.
            with transaction.atomic():
                user = User.objects.create_user(
                    email=validated_data["email"],
                    password=validated_data["password"],
                    first_name=validated_data["first_name"],
                    last_name=validated_data["last_name"],
                    role=role,
                )
                if role == User.Role.ORGANISATEUR:
                    Organisateur.objects.create(
                        user=user, organisation=validated_data["organisation"]
                    )
                return user
        except IntegrityError as exc:
            # Deux inscriptions simultanées avec le même email.
            raise serializers.ValidationError(
                {"email": ["Un compte existe déjà avec cette adresse email."]}
            ) from exc


class UserSerializer(serializers.ModelSerializer):
    """Informations publiques de l'utilisateur connecté (US02)."""

    class Meta:
        model = User
        fields = ["id", "first_name", "last_name", "email", "role"]
        read_only_fields = fields


class LoginSerializer(TokenObtainPairSerializer):
    """Connexion par email + mot de passe (US02).

    Renvoie les jetons access/refresh et les informations de l'utilisateur.
    Email inconnu, mauvais mot de passe ou compte inactif donnent le même
    message, pour ne pas révéler quels comptes existent.
    """

    default_error_messages = {"no_active_account": "Identifiants invalides."}

    def validate(self, attrs):
        # Les emails sont enregistrés en minuscules (US01).
        attrs[self.username_field] = normaliser_email(attrs[self.username_field])
        data = super().validate(attrs)
        data["user"] = UserSerializer(self.user).data
        return data
