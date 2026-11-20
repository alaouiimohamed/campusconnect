from django.db import migrations

DEFAULT_CATEGORIES = [
    ("Conférence", "CONF"),
    ("Atelier", "ATEL"),
    ("Compétition", "COMP"),
    ("Culture", "CULT"),
    ("Associatif", "ASSO"),
]


def ajouter_categories(apps, schema_editor):
    categorie = apps.get_model("core", "Categorie")
    for nom, abrv in DEFAULT_CATEGORIES:
        categorie.objects.get_or_create(
            nom=nom,
            defaults={
                "description": "",
                "abrv": abrv,
            },
        )


def supprimer_categories(apps, schema_editor):
    categorie = apps.get_model("core", "Categorie")
    categorie.objects.filter(nom__in=[nom for nom, _ in DEFAULT_CATEGORIES]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("core", "0003_organisateur_organisation"),
    ]

    operations = [
        migrations.RunPython(ajouter_categories, supprimer_categories),
    ]
