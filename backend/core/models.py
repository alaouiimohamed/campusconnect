"""Modèles métier de CampusConnect (app core).

Traduction en Django du MLD de Wassim (init_db.sql), avec les corrections :
- plus de table Utilisateur : toutes les relations vers un utilisateur
  pointent vers settings.AUTH_USER_MODEL (accounts.User, créé par la US01) ;
- clés primaires générées par Django (BigAutoField) ;
- organisateur d'un événement en RESTRICT ;
- description en TextField, champ "lieu" texte, latitude/longitude facultatives ;
- RESTRICT au lieu de CASCADE depuis Departement, Filiere et Professeur ;
- inscription avec date et statut, sans doublon possible.

Les tables d'association du MLD deviennent des ManyToManyField :
Appartenir, Concerner_Notif, Rejoindre, Gerer et Enseigner.
"""

from django.conf import settings
from django.db import models


# ==========================================
# 1. Tables de référence
# ==========================================
class Departement(models.Model):
    nom = models.CharField(max_length=100, unique=True)

    class Meta:
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class Filiere(models.Model):
    nom = models.CharField(max_length=100)
    abrv = models.CharField(max_length=50, unique=True)
    departement = models.ForeignKey(
        Departement, on_delete=models.RESTRICT, related_name="filieres"
    )

    class Meta:
        ordering = ["nom"]

    def __str__(self):
        return self.abrv


class Categorie(models.Model):
    nom = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=255, blank=True)
    abrv = models.CharField(max_length=50, blank=True)

    class Meta:
        ordering = ["nom"]

    def __str__(self):
        return self.nom


# ==========================================
# 2. Profils, liés en 1-1 à accounts.User
#    (le rôle est porté par User.role)
# ==========================================
class Admin(models.Model):
    """Profil administrateur. Le champ passkey du MLD est retiré :
    l'administrateur se connecte avec son compte (role ADMIN)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="profil_admin",
    )

    def __str__(self):
        return f"Admin : {self.user}"


class Organisateur(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="profil_organisateur",
    )
    telephone = models.CharField(max_length=50, blank=True)

    def __str__(self):
        return f"Organisateur : {self.user}"


class Professeur(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="profil_professeur",
    )
    code_prof = models.CharField(max_length=50, unique=True)
    departement = models.ForeignKey(
        Departement, on_delete=models.RESTRICT, related_name="professeurs"
    )
    # Ancienne table Enseigner
    filieres = models.ManyToManyField(Filiere, related_name="professeurs", blank=True)

    def __str__(self):
        return f"Professeur : {self.user}"


class Etudiant(models.Model):
    """Créé quand l'étudiant complète son profil (après l'inscription US01)."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        primary_key=True,
        related_name="profil_etudiant",
    )
    code_apogee = models.CharField(max_length=50, unique=True)
    filiere = models.ForeignKey(
        Filiere, on_delete=models.RESTRICT, related_name="etudiants"
    )

    def __str__(self):
        return f"{self.code_apogee} : {self.user}"


# ==========================================
# 3. Clubs et événements
# ==========================================
class Club(models.Model):
    nom = models.CharField(max_length=100, unique=True)
    logo_url = models.URLField(max_length=255, blank=True)
    responsable = models.ForeignKey(
        Professeur, on_delete=models.RESTRICT, related_name="clubs_geres"
    )
    # Ancienne table Rejoindre
    membres = models.ManyToManyField(Etudiant, related_name="clubs", blank=True)

    class Meta:
        ordering = ["nom"]

    def __str__(self):
        return self.nom


class Evenement(models.Model):
    class Statut(models.TextChoices):
        BROUILLON = "BROUILLON", "Brouillon"
        EN_ATTENTE = "EN_ATTENTE", "En attente de validation"
        PUBLIE = "PUBLIE", "Publié"
        COMPLET = "COMPLET", "Complet"
        EN_COURS = "EN_COURS", "En cours"
        TERMINE = "TERMINE", "Terminé"
        ANNULE = "ANNULE", "Annulé"

    titre = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    date_debut = models.DateTimeField(null=True, blank=True)
    date_fin = models.DateTimeField(null=True, blank=True)
    lieu = models.CharField(max_length=150)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    capacite = models.PositiveIntegerField(null=True, blank=True)
    statut = models.CharField(
        max_length=20, choices=Statut.choices, default=Statut.BROUILLON
    )
    organisateur = models.ForeignKey(
        Organisateur, on_delete=models.RESTRICT, related_name="evenements"
    )
    # Ancienne table Appartenir
    categories = models.ManyToManyField(
        Categorie, related_name="evenements", blank=True
    )
    # Ancienne table Gerer
    clubs = models.ManyToManyField(Club, related_name="evenements", blank=True)
    # Ancienne table inscrire, via le modèle Inscription
    inscrits = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="Inscription",
        related_name="evenements_inscrits",
        blank=True,
    )

    class Meta:
        ordering = ["date_debut"]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(capacite__gt=0) | models.Q(capacite__isnull=True),
                name="evenement_capacite_positive",
            ),
        ]

    def __str__(self):
        return self.titre


# ==========================================
# 4. Inscriptions, favoris, notifications
# ==========================================
class Inscription(models.Model):
    class Statut(models.TextChoices):
        CONFIRMEE = "CONFIRMEE", "Confirmée"
        LISTE_ATTENTE = "LISTE_ATTENTE", "Liste d'attente"
        ANNULEE = "ANNULEE", "Annulée"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="inscriptions",
    )
    evenement = models.ForeignKey(
        Evenement, on_delete=models.CASCADE, related_name="inscriptions"
    )
    date_inscription = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(
        max_length=20, choices=Statut.choices, default=Statut.CONFIRMEE
    )

    class Meta:
        ordering = ["-date_inscription"]
        constraints = [
            models.UniqueConstraint(
                fields=["user", "evenement"], name="inscription_unique"
            ),
        ]

    def __str__(self):
        return f"{self.user} → {self.evenement}"


class Favori(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="favoris",
    )
    evenement = models.ForeignKey(
        Evenement, on_delete=models.CASCADE, related_name="favoris"
    )
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-date_creation"]
        constraints = [
            models.UniqueConstraint(fields=["user", "evenement"], name="favori_unique"),
        ]

    def __str__(self):
        return f"{self.user} ★ {self.evenement}"


class Notification(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notifications",
    )
    message = models.CharField(max_length=255)
    lu = models.BooleanField(default=False)
    date_creation = models.DateTimeField(auto_now_add=True)
    # Ancienne table Concerner_Notif
    evenements = models.ManyToManyField(
        Evenement, related_name="notifications", blank=True
    )

    class Meta:
        ordering = ["-date_creation"]

    def __str__(self):
        return f"Notification pour {self.user} : {self.message[:40]}"
