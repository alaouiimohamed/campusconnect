import uuid
from django.db import models


# ==========================================
# 1. INDEPENDENT PARENT TABLES
# ==========================================
class Departement(models.Model):
    id_departement = models.CharField(max_length=50, primary_key=True)
    nom = models.CharField(max_length=50)


class Utilisateur(models.Model):
    id_utilisateur = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    prenom = models.TextField()
    nom = models.CharField(max_length=25)
    email = models.EmailField(max_length=50, unique=True)
    motdepasse = models.CharField(
        max_length=255
    ) 
    role = models.CharField(max_length=25)
    datecreation = models.DateTimeField(auto_now_add=True)


class Categorie(models.Model):
    id_categorie = models.AutoField(primary_key=True)
    name = models.CharField(max_length=25, unique=True)
    description = models.CharField(max_length=50, null=True, blank=True)
    abrv = models.CharField(max_length=50, null=True, blank=True)


# ==========================================
# 2. FIRST-LEVEL CHILD TABLES & ROLES (Héritage)
# ==========================================
class Filiere(models.Model):
    id_filiere = models.CharField(max_length=50, primary_key=True)
    abrv = models.CharField(max_length=50, unique=True, null=True, blank=True)
    nom = models.CharField(max_length=50)
    departement = models.ForeignKey(
        Departement, on_delete=models.CASCADE, db_column="id_departement"
    )


# كنستعملو OneToOneField باش نترجمو الـ Héritage ديال الـ MLD
class Admin(models.Model):
    utilisateur = models.OneToOneField(
        Utilisateur,
        on_delete=models.CASCADE,
        primary_key=True,
        db_column="id_utilisateur",
    )
    passkey = models.CharField(max_length=50)


class Organisateur(models.Model):
    utilisateur = models.OneToOneField(
        Utilisateur,
        on_delete=models.CASCADE,
        primary_key=True,
        db_column="id_utilisateur",
    )
    telephone = models.CharField(max_length=50, null=True, blank=True)


class Professeur(models.Model):
    utilisateur = models.OneToOneField(
        Utilisateur,
        on_delete=models.CASCADE,
        primary_key=True,
        db_column="id_utilisateur",
    )
    code_prof = models.CharField(max_length=50, unique=True)
    departement = models.ForeignKey(
        Departement, on_delete=models.CASCADE, db_column="id_departement"
    )
    filieres_enseignees = models.ManyToManyField(
        Filiere, related_name="professeurs", db_table="Enseigner"
    )


# ==========================================
# 3. SECOND & THIRD-LEVEL CHILD TABLES
# ==========================================
class Etudiant(models.Model):
    utilisateur = models.OneToOneField(
        Utilisateur,
        on_delete=models.CASCADE,
        primary_key=True,
        db_column="id_utilisateur",
    )
    code_apogee = models.CharField(max_length=50, unique=True)
    filiere = models.ForeignKey(
        Filiere, on_delete=models.CASCADE, db_column="id_filiere"
    )


class Club(models.Model):
    id_club = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nom = models.CharField(max_length=25, unique=True)
    logo_url = models.URLField(max_length=255, null=True, blank=True)
    professeur = models.ForeignKey(
        Professeur, on_delete=models.CASCADE, db_column="id_utilisateur"
    )
    membres = models.ManyToManyField(
        Etudiant, related_name="clubs_rejoints", db_table="Rejoindre"
    )


class Evenement(models.Model):
    id_evenement = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    titre = models.CharField(max_length=50)
    description = models.CharField(max_length=50, null=True, blank=True)
    datedebut = models.DateTimeField(null=True, blank=True)
    datefin = models.DateTimeField(null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    capacite = models.IntegerField(null=True, blank=True)
    status = models.CharField(max_length=50, null=True, blank=True)
    organisateur = models.ForeignKey(
        Organisateur, on_delete=models.PROTECT, null=True, db_column="id_utilisateur"
    )

    # Association Tables (Many-to-Many)
    categories = models.ManyToManyField(
        Categorie, related_name="evenements", db_table="Appartenir"
    )
    clubs_gestionnaires = models.ManyToManyField(
        Club, related_name="evenements_geres", db_table="Gerer"
    )
    inscrits = models.ManyToManyField(
        Utilisateur, related_name="evenements_inscrits", db_table="inscrire"
    )


class Notification(models.Model):
    id_notification = models.UUIDField(
        primary_key=True, default=uuid.uuid4, editable=False
    )
    message = models.CharField(max_length=255)
    lu = models.BooleanField(default=False)
    datecreation = models.DateTimeField(auto_now_add=True)
    utilisateur = models.ForeignKey(
        Utilisateur, on_delete=models.CASCADE, db_column="id_utilisateur"
    )
    evenements = models.ManyToManyField(
        Evenement, related_name="notifications", db_table="Concerner_Notif"
    )


class Favori(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    datecreation = models.DateTimeField(auto_now_add=True)
    evenement = models.ForeignKey(
        Evenement, on_delete=models.CASCADE, db_column="id_evenement"
    )
    utilisateur = models.ForeignKey(
        Utilisateur, on_delete=models.CASCADE, db_column="id_utilisateur"
    )
