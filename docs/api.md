# API CampusConnect

Base : `http://localhost:8000/api/` en local. Toutes les requêtes et réponses sont en JSON
(`Content-Type: application/json`). Les messages d'erreur sont en français.

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health/` | Non | État de l'API et de la base |
| POST | `/api/auth/register/` | Non | Création de compte (US01) |

---

## POST `/api/auth/register/` – Créer un compte (US01)

Crée un compte visiteur. Accessible **sans authentification**.

### Corps de la requête

| Champ | Type | Obligatoire | Règles |
|---|---|---|---|
| `first_name` | string | oui | Prénom, non vide, 150 caractères max. |
| `last_name` | string | oui | Nom, non vide, 150 caractères max. |
| `email` | string | oui | Email valide, **unique sans tenir compte des majuscules**, enregistré en minuscules. Sert d'identifiant de connexion. |
| `password` | string | oui | Validé par les `AUTH_PASSWORD_VALIDATORS` de Django : 8 caractères min., pas trop courant, pas uniquement numérique, pas trop proche du nom ou de l'email. |
| `password_confirm` | string | oui | Doit être identique à `password`. |

Règles de sécurité :

- Le mot de passe est haché (`set_password`, PBKDF2) et **n'est jamais renvoyé**.
- Le champ `role` est **ignoré** s'il est envoyé : tout nouveau compte est `ETUDIANT`.
  Seul un administrateur attribue les rôles (US03).
- Limite de **10 inscriptions par heure et par adresse IP** (variable `REGISTER_THROTTLE_RATE`).
  Au-delà : `429 Too Many Requests`.

Rôles possibles : `ETUDIANT` (défaut), `ORGANISATEUR`, `PROFESSEUR`, `ADMIN`.

### Exemple de requête

```http
POST /api/auth/register/
Content-Type: application/json

{
  "first_name": "Amina",
  "last_name": "Benali",
  "email": "Amina.Benali@example.com",
  "password": "Campus-Connect-2026!",
  "password_confirm": "Campus-Connect-2026!"
}
```

### `201 Created`

```json
{
  "id": 1,
  "first_name": "Amina",
  "last_name": "Benali",
  "email": "amina.benali@example.com",
  "role": "ETUDIANT"
}
```

### `400 Bad Request`

Les erreurs sont regroupées par champ, chaque champ ayant une liste de messages.

Champs manquants :

```json
{
  "first_name": ["Ce champ est obligatoire."],
  "last_name": ["Ce champ est obligatoire."],
  "email": ["Ce champ est obligatoire."],
  "password": ["Ce champ est obligatoire."],
  "password_confirm": ["Ce champ est obligatoire."]
}
```

Champ vide : `{"first_name": ["Ce champ ne peut pas être vide."]}`

Email invalide : `{"email": ["Saisissez une adresse email valide."]}`

Email déjà utilisé (y compris avec d'autres majuscules) :

```json
{ "email": ["Un compte existe déjà avec cette adresse email."] }
```

Mots de passe différents :

```json
{ "password_confirm": ["Les mots de passe ne correspondent pas."] }
```

Mot de passe trop faible (messages des validateurs Django) :

```json
{
  "password": [
    "Ce mot de passe est trop court. Il doit contenir au minimum 8 caractères.",
    "Ce mot de passe est trop courant.",
    "Ce mot de passe est entièrement numérique."
  ]
}
```

### `429 Too Many Requests`

```json
{ "detail": "Requête ralentie. Disponible à nouveau dans 3599 secondes." }
```

(Le texte exact est fourni par Django REST Framework.)
