from django.db import migrations


class Migration(migrations.Migration):
    """Active l'extension pgvector (embeddings du MVP 2).

    Pas de DROP EXTENSION au retour arrière : d'autres objets pourraient
    dépendre de l'extension.
    """

    initial = True

    dependencies = []

    operations = [
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS vector;",
            reverse_sql=migrations.RunSQL.noop,
        ),
    ]
