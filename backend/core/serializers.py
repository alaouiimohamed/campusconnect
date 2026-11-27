from django.utils import timezone
from rest_framework import serializers

from .models import Categorie, Evenement

# Statuts qu'un organisateur peut choisir à la création :
# « Enregistrer le brouillon » ou « Soumettre pour validation ».
# Seul l'administrateur publie un événement (PUBLIE).
STATUTS_CREATION = [Evenement.Statut.BROUILLON, Evenement.Statut.EN_ATTENTE]

MESSAGES_TEXTE = {
    "required": "Ce champ est obligatoire.",
    "blank": "Ce champ ne peut pas être vide.",
    "null": "Ce champ ne peut pas être vide.",
    "max_length": "Ce champ ne doit pas dépasser {max_length} caractères.",
}

MESSAGES_DATE = {
    "required": "Ce champ est obligatoire.",
    "null": "Ce champ ne peut pas être vide.",
    "invalid": "Date invalide : utilisez le format ISO 8601, "
    "par exemple 2026-12-15T14:00:00+01:00.",
}


class CategorieResumeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categorie
        fields = ["id", "nom"]


class CategorieSerializer(serializers.ModelSerializer):
    nom = serializers.CharField(
        max_length=100,
        trim_whitespace=True,
        error_messages={
            "required": "Ce champ est obligatoire.",
            "blank": "Ce champ ne peut pas être vide.",
            "max_length": "Ce champ ne doit pas dépasser 100 caractères.",
        },
    )
    description = serializers.CharField(
        max_length=255,
        required=False,
        allow_blank=True,
        trim_whitespace=True,
        error_messages={
            "blank": "Ce champ peut être vide.",
            "max_length": "Ce champ ne doit pas dépasser 255 caractères.",
        },
    )
    abrv = serializers.CharField(
        max_length=50,
        required=False,
        allow_blank=True,
        trim_whitespace=True,
        error_messages={
            "blank": "Ce champ peut être vide.",
            "max_length": "Ce champ ne doit pas dépasser 50 caractères.",
        },
    )

    class Meta:
        model = Categorie
        fields = ["id", "nom", "description", "abrv"]
        read_only_fields = ["id"]

    def validate_nom(self, value):
        nom = value.strip()
        categories = Categorie.objects.filter(nom__iexact=nom)
        if self.instance is not None:
            categories = categories.exclude(pk=self.instance.pk)
        if categories.exists():
            raise serializers.ValidationError(
                "Une catégorie existe déjà avec ce nom."
            )
        return nom


def _organisateur(organisateur):
    user = organisateur.user
    return {
        "id": user.id,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "organisation": organisateur.organisation,
    }


class EvenementCreateSerializer(serializers.ModelSerializer):
    """Création d'un événement (US07).

    L'organisateur n'est jamais lu dans le corps de la requête : la vue le
    déduit de l'utilisateur connecté. La photo de couverture fera l'objet
    d'une tâche séparée.
    """

    titre = serializers.CharField(max_length=150, error_messages=MESSAGES_TEXTE)
    description = serializers.CharField(error_messages=MESSAGES_TEXTE)
    lieu = serializers.CharField(max_length=150, error_messages=MESSAGES_TEXTE)
    date_debut = serializers.DateTimeField(error_messages=MESSAGES_DATE)
    date_fin = serializers.DateTimeField(error_messages=MESSAGES_DATE)
    capacite = serializers.IntegerField(
        min_value=1,
        error_messages={
            "required": "Ce champ est obligatoire.",
            "null": "Ce champ ne peut pas être vide.",
            "invalid": "Saisissez un nombre entier.",
            "min_value": "La capacité doit être supérieure à 0.",
            "max_string_length": "Valeur trop grande.",
        },
    )
    categories = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=Categorie.objects.all(),
        allow_empty=False,
        error_messages={
            "required": "Choisissez au moins une catégorie.",
            "null": "Choisissez au moins une catégorie.",
            "empty": "Choisissez au moins une catégorie.",
            "not_a_list": "Envoyez une liste d'identifiants de catégories.",
        },
    )
    statut = serializers.ChoiceField(
        choices=STATUTS_CREATION,
        default=Evenement.Statut.BROUILLON,
        error_messages={
            "invalid_choice": "Statut invalide : choisissez BROUILLON ou "
            "EN_ATTENTE. Seul l'administrateur publie un événement.",
            "null": "Ce champ ne peut pas être vide.",
        },
    )

    class Meta:
        model = Evenement
        fields = [
            "id",
            "titre",
            "description",
            "date_debut",
            "date_fin",
            "lieu",
            "capacite",
            "categories",
            "statut",
            "organisateur",
        ]
        read_only_fields = ["id", "organisateur"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        # Messages en français pour une catégorie inconnue ou mal formée.
        self.fields["categories"].child_relation.error_messages.update(
            {
                "does_not_exist": "Catégorie introuvable : {pk_value}.",
                "incorrect_type": "Identifiant de catégorie invalide.",
            }
        )

    def validate_date_debut(self, value):
        if value <= timezone.now():
            raise serializers.ValidationError(
                "La date de début doit être dans le futur."
            )
        return value

    def validate(self, attrs):
        if attrs["date_fin"] <= attrs["date_debut"]:
            raise serializers.ValidationError(
                {"date_fin": "La date de fin doit être après la date de début."}
            )
        return attrs

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["categories"] = CategorieResumeSerializer(
            instance.categories.all(), many=True
        ).data
        data["organisateur"] = _organisateur(instance.organisateur)
        return data
