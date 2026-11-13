# CampusConnect

Plateforme web intelligente de vie étudiante : centralisation des événements, conférences, ateliers et activités associatives de l'université.

Projet réalisé dans le cadre du module **Projet réel et management d'équipe** (filière SIIA, S9), Faculté Polydisciplinaire de Khouribga, Université Sultan Moulay Slimane. Encadrant : Pr. H. El Hamdaoui. Année 2026–2027.

## Équipe 6

| Membre | Rôle |
|---|---|
| EL Atoui Taha | Chef de projet |
| Salima Nacir | Product Owner |
| Habyby Zahira | Marketing |
| Salma Zair | UX/UI |
| Moussaif Wassim | Data/AI |
| Mohamed Alaoui | Developer |

## Versions

- **MVP 1** (03/11/2026 – 01/12/2026) : authentification, rôles, catalogue d'événements, recherche, inscriptions, tableaux de bord.
- **MVP 2** (08/12/2026 – 12/01/2027) : Campus AI Assistant (LLM + RAG), recherche intelligente, recommandations.
- **Démonstration finale** : 19/01/2027.

## Structure du dépôt

```
campusconnect/
├── backend/      # API Django + Django REST Framework
├── frontend/     # Interface web React + Vite
├── ai/           # Module d'intelligence artificielle (MVP 2)
├── docs/         # Charte de cadrage, UML, maquettes
└── .github/      # Modèles de Pull Request
```

## Installation

- Backend : **Python 3.12**, **Django 5.2 LTS + Django REST Framework**, **PostgreSQL 16 + pgvector**.
- Frontend : **Node.js 24 LTS**, **React + Vite** (JavaScript), ESLint, Prettier, Vitest + Testing Library.

### 1. Cloner le dépôt

```bash
git clone https://github.com/alaouiimohamed/campusconnect.git
cd campusconnect
git checkout develop
```

### 2. Base de données (au choix)

**Option A – Neon (cloud, sans Docker)**

1. Créer un projet sur [neon.tech](https://neon.tech) (PostgreSQL 16).
2. Copier l'URL de connexion (*Connection string*), qui doit contenir `?sslmode=require`.
3. La coller dans `DATABASE_URL` du fichier `backend/.env` (étape 3).

pgvector est disponible sur Neon : la migration `core.0001_enable_pgvector` l'active.
Les tests créent une base temporaire `test_<nom>` sur Neon : le rôle utilisé doit avoir le droit `CREATEDB` (c'est le cas du rôle par défaut de Neon).

**Option B – Docker**

```bash
docker compose up -d          # PostgreSQL 16 + pgvector sur localhost:5432
```

URL à mettre dans `backend/.env` :
`DATABASE_URL=postgres://campusconnect:campusconnect@localhost:5432/campusconnect`

### 3. Backend

```bash
cd backend
py -3.12 -m venv .venv                  # macOS/Linux : python3.12 -m venv .venv
.venv\Scripts\activate                  # macOS/Linux : source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env                    # puis renseigner SECRET_KEY et DATABASE_URL
python manage.py migrate                # pgvector + tables (utilisateurs, auth, admin...)
python manage.py createsuperuser        # optionnel : compte ADMIN pour /admin/
python manage.py runserver
```

Vérifier : <http://localhost:8000/api/health/> doit renvoyer `{"status": "ok"}`.
Si la base est injoignable, l'endpoint répond `503` avec `{"status": "error", ...}`.

> ℹ️ Depuis la US01, le modèle utilisateur personnalisé (`AUTH_USER_MODEL = "accounts.User"`)
> est en place : `python manage.py migrate` **sans argument** est désormais possible et
> recommandé.

### Modèle utilisateur (US01)

- App `accounts`, modèle `accounts.User` (hérite de `AbstractUser`, sans `username`).
- Identifiant de connexion : `email` (unique, enregistré en minuscules).
- Champs : `first_name`, `last_name`, `email`, `role`, `date_joined`.
- `role` : `ETUDIANT` (défaut), `ORGANISATEUR`, `PROFESSEUR`, `ADMIN`.
- Les tables de profil (Etudiant, Organisateur, Professeur...) doivent pointer vers
  l'utilisateur avec `settings.AUTH_USER_MODEL`, jamais en important `User` directement :

```python
from django.conf import settings
from django.db import models

class Etudiant(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, primary_key=True
    )
```

Endpoints : voir [docs/api.md](docs/api.md).

### 4. Frontend

```bash
cd frontend
npm ci                                  # installe les versions exactes du package-lock.json
cp .env.example .env                    # VITE_API_URL=http://localhost:8000
npm run dev
```

Ouvrir <http://localhost:5173> : la carte « État de l'API » affiche **ok** quand le backend répond,
ou un message d'erreur s'il est injoignable.

Les couleurs, la police (Poppins) et les espacements sont définis uniquement dans
`frontend/src/styles/tokens.css` : les composants utilisent toujours ces variables.

### 5. Lancer backend et frontend ensemble

Dans deux terminaux :

```bash
# Terminal 1 – API sur http://localhost:8000
cd backend
.venv\Scripts\activate                  # macOS/Linux : source .venv/bin/activate
python manage.py runserver

# Terminal 2 – interface sur http://localhost:5173
cd frontend
npm run dev
```

Le backend autorise l'origine `http://localhost:5173` (CORS) ; le frontend appelle l'API via `VITE_API_URL`.

### 6. Tests et qualité

```bash
# Backend
cd backend
ruff check .
black --check .
pytest

# Frontend
cd frontend
npm run lint
npm run format:check                    # npm run format pour corriger
npm test
npm run build
```

La CI GitHub Actions (`.github/workflows/ci.yml`) exécute ces vérifications sur chaque PR
vers `develop` ou `main` : un job `backend` (avec un service PostgreSQL pgvector) et un job `frontend`.

## Contribuer

Les règles de branches, de commits et de Pull Requests sont décrites dans [CONTRIBUTING.md](CONTRIBUTING.md).
