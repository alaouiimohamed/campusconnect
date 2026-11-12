from django.db import models


# ==========================================
# 1. INDEPENDENT PARENT TABLES
# ==========================================
class Departement(models.Model):
    id_departement = models.BigAutoField(primary_key=True)
    nom = models.CharField(max_length=100)

    def __str__(self):
        return self.nom


class Utilisateur(models.Model):
    id_utilisateur = models.BigAutoField(primary_key=True)
    prenom = models.CharField(max_length=100)
    nom = models.CharField(max_length=100)
    email = models.EmailField(max_length=100, unique=True)
    motdepasse = models.CharField(max_length=255)
    role = models.CharField(max_length=50)
    datecreation = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.prenom} {self.nom} ({self.role})"


class Categorie(models.Model):
    id_categorie = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")
    abrv = models.CharField(max_length=50, blank=True, default="")

    def __str__(self):
        return self.name


# ==========================================
# 2. FIRST-LEVEL CHILD TABLES & ROLES
# ==========================================
class Filiere(models.Model):
    id_filiere = models.BigAutoField(primary_key=True)
    abrv = models.CharField(max_length=50, unique=True, blank=True, default="")
    nom = models.CharField(max_length=100)
    departement = models.ForeignKey(
        Departement, on_delete=models.RESTRICT, db_column='id_departement'
    )

    def __str__(self):
        return self.nom


class Admin(models.Model):
    utilisateur = models.OneToOneField(
        Utilisateur,
        on_delete=models.CASCADE,
        primary_key=True,
        db_column='id_utilisateur',
    )
    passkey = models.CharField(max_length=100)

    def __str__(self):
        return f"Admin: {self.utilisateur.prenom} {self.utilisateur.nom}"


class Organisateur(models.Model):
    utilisateur = models.OneToOneField(
        Utilisateur,
        on_delete=models.CASCADE,
        primary_key=True,
        db_column='id_utilisateur',
    )
    telephone = models.CharField(max_length=50, blank=True, default="")

    def __str__(self):
        return f"Organisateur: {self.utilisateur.prenom} {self.utilisateur.nom}"


class Professeur(models.Model):
    utilisateur = models.OneToOneField(
        Utilisateur,
        on_delete=models.CASCADE,
        primary_key=True,
        db_column='id_utilisateur',
    )
    code_prof = models.CharField(max_length=50, unique=True)
    departement = models.ForeignKey(
        Departement, on_delete=models.RESTRICT, db_column='id_departement'
    )
    filieres_enseignees = models.ManyToManyField(
        Filiere, related_name='professeurs', db_table='Enseigner'
    )

    def __str__(self):
        return f"Pr. {self.utilisateur.prenom} {self.utilisateur.nom}"


# ==========================================
# 3. SECOND & THIRD-LEVEL CHILD TABLES
# ==========================================
class Etudiant(models.Model):
    utilisateur = models.OneToOneField(
        Utilisateur,
        on_delete=models.CASCADE,
        primary_key=True,
        db_column='id_utilisateur',
    )
    code_apogee = models.CharField(max_length=50, unique=True)
    filiere = models.ForeignKey(
        Filiere, on_delete=models.RESTRICT, db_column='id_filiere'
    )

    def __str__(self):
        return f"Etudiant: {self.utilisateur.prenom} {self.utilisateur.nom}"


class Club(models.Model):
    id_club = models.BigAutoField(primary_key=True)
    nom = models.CharField(max_length=100, unique=True)
    logo_url = models.URLField(max_length=255, blank=True, default="")
    professeur = models.ForeignKey(
        Professeur, on_delete=models.CASCADE, db_column='id_utilisateur'
    )
    membres = models.ManyToManyField(
        Etudiant, related_name='clubs_rejoints', db_table='Rejoindre'
    )

    def __str__(self):
        return self.nom


class Evenement(models.Model):
    id_evenement = models.BigAutoField(primary_key=True)
    titre = models.CharField(max_length=150)
    description = models.TextField(blank=True, default="")
    lieu = models.TextField()
    datedebut = models.DateTimeField(null=True, blank=True)
    datefin = models.DateTimeField(null=True, blank=True)
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    capacite = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=50, blank=True, default="")

    organisateur = models.ForeignKey(
        Organisateur, on_delete=models.RESTRICT, db_column='id_utilisateur'
    )

    categories = models.ManyToManyField(
        Categorie, related_name='evenements', db_table='Appartenir'
    )
    clubs_gestionnaires = models.ManyToManyField(
        Club, related_name='evenements_geres', db_table='Gerer'
    )
    inscrits = models.ManyToManyField(
        Utilisateur, through='Inscription', related_name='evenements_inscrits'
    )

    def __str__(self):
        return self.titre


class Notification(models.Model):
    id_notification = models.BigAutoField(primary_key=True)
    message = models.CharField(max_length=255)
    lu = models.BooleanField(default=False)
    datecreation = models.DateTimeField(auto_now_add=True)
    utilisateur = models.ForeignKey(
        Utilisateur, on_delete=models.CASCADE, db_column='id_utilisateur'
    )
    evenements = models.ManyToManyField(
        Evenement, related_name='notifications', db_table='Concerner_Notif'
    )

    def __str__(self):
        return f"Notif to {self.utilisateur.nom}: {self.message[:20]}..."


class Favori(models.Model):
    id = models.BigAutoField(primary_key=True)
    datecreation = models.DateTimeField(auto_now_add=True)
    evenement = models.ForeignKey(
        Evenement, on_delete=models.CASCADE, db_column='id_evenement'
    )
    utilisateur = models.ForeignKey(
        Utilisateur, on_delete=models.CASCADE, db_column='id_utilisateur'
    )

    def __str__(self):
        return f"Favori: {self.utilisateur.nom} -> {self.evenement.titre}"


# ==========================================
# 4. CUSTOM INTERMEDIATE TABLES (Many-to-Many with extra fields)
# ==========================================
class Inscription(models.Model):
    STATUT_CHOICES = [
        ('CONFIRMEE', 'Confirmée'),
        ('LISTE_ATTENTE', 'Liste d\'attente'),
        ('ANNULEE', 'Annulée'),
    ]

    utilisateur = models.ForeignKey(
        Utilisateur, on_delete=models.CASCADE, db_column='id_utilisateur'
    )
    evenement = models.ForeignKey(
        Evenement, on_delete=models.CASCADE, db_column='id_evenement'
    )
    date_inscription = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(
        max_length=20, choices=STATUT_CHOICES, default='LISTE_ATTENTE'
    )

    class Meta:
        db_table = 'inscrire'

    def __str__(self):
        return f"{self.utilisateur.nom} in {self.evenement.titre} ({self.statut})"
