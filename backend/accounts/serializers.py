from django.contrib.auth import password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from rest_framework import serializers

from .models import User, normaliser_email

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
    """Création de compte visiteur (US01).

    Le rôle est en lecture seule : un nouveau compte est toujours ETUDIANT,
    même si le client envoie "role" (seul un admin attribue les rôles, US03).
    """

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
            "password",
            "password_confirm",
        ]
        read_only_fields = ["id", "role"]

    def validate_email(self, value):
        email = normaliser_email(value)
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError(
                "Un compte existe déjà avec cette adresse email."
            )
        return email

    def validate(self, attrs):
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
        try:
            with transaction.atomic():
                return User.objects.create_user(
                    email=validated_data["email"],
                    password=validated_data["password"],
                    first_name=validated_data["first_name"],
                    last_name=validated_data["last_name"],
                )
        except IntegrityError as exc:
            # Deux inscriptions simultanées avec le même email.
            raise serializers.ValidationError(
                {"email": ["Un compte existe déjà avec cette adresse email."]}
            ) from exc
