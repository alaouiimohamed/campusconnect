# API CampusConnect

Base : `http://localhost:8000/api/` en local. Toutes les requêtes et réponses sont en JSON
(`Content-Type: application/json`). Les messages d'erreur sont en français.

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/health/` | Non | État de l'API et de la base |
| POST | `/api/auth/register/` | Non | Création de compte (US01) |
| POST | `/api/auth/login/` | Non | Connexion : jetons JWT + utilisateur (US02) |
| POST | `/api/auth/refresh/` | Non | Nouveau jeton d'accès (US02) |
| POST | `/api/auth/logout/` | Non | Déconnexion : jeton de rafraîchissement en liste noire (US02) |
| GET | `/api/auth/me/` | **Oui** | Utilisateur connecté (US02) |

## Authentification (US02)

L'API utilise des jetons **JWT** (`djangorestframework-simplejwt`) :

- **jeton d'accès** (`access`) : valable **15 minutes** (`JWT_ACCESS_TOKEN_LIFETIME_MINUTES`),
  à envoyer dans l'en-tête de chaque requête protégée :
  `Authorization: Bearer <access>` ;
- **jeton de rafraîchissement** (`refresh`) : valable **1 jour** (`JWT_REFRESH_TOKEN_LIFETIME_DAYS`),
  sert uniquement à obtenir un nouveau jeton d'accès (`/api/auth/refresh/`) ;
- **rotation** : chaque rafraîchissement renvoie aussi un nouveau `refresh` ; l'ancien passe en
  **liste noire** et ne peut plus servir. Le client doit donc toujours garder le dernier `refresh` reçu.

Sur un endpoint protégé, une requête sans jeton, avec un jeton invalide ou expiré, ou pour un
compte désactivé, reçoit `401 Unauthorized`.

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

---

## POST `/api/auth/login/` – Se connecter (US02)

Accessible **sans authentification**. L'email n'est pas sensible aux majuscules.

Règles de sécurité :

- Email inconnu, mauvais mot de passe ou **compte inactif** : même réponse `401`
  « Identifiants invalides. », pour ne pas révéler quels comptes existent.
- Limite de **5 tentatives par minute et par adresse IP** (variable `LOGIN_THROTTLE_RATE`),
  réussies ou non. Au-delà : `429 Too Many Requests`.

### Exemple de requête

```http
POST /api/auth/login/
Content-Type: application/json

{
  "email": "amina.benali@example.com",
  "password": "Campus-Connect-2026!"
}
```

### `200 OK`

```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "first_name": "Amina",
    "last_name": "Benali",
    "email": "amina.benali@example.com",
    "role": "ETUDIANT"
  }
}
```

### `401 Unauthorized`

```json
{ "detail": "Identifiants invalides." }
```

### `400 Bad Request`

Champ manquant : `{"email": ["Ce champ est obligatoire."], "password": ["Ce champ est obligatoire."]}`

### `429 Too Many Requests`

```json
{ "detail": "Requête ralentie. Disponible à nouveau dans 59 secondes." }
```

---

## POST `/api/auth/refresh/` – Nouveau jeton d'accès (US02)

Accessible **sans authentification** : le jeton de rafraîchissement sert de preuve.

### Exemple de requête

```http
POST /api/auth/refresh/
Content-Type: application/json

{ "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

### `200 OK`

Rotation : un nouveau `refresh` est renvoyé, l'ancien est mis en liste noire.

```json
{
  "access": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### `401 Unauthorized`

Jeton invalide, expiré, déjà utilisé (rotation) ou mis en liste noire (déconnexion) :

```json
{ "detail": "Token is invalid", "code": "token_not_valid" }
```

Le texte de `detail` est fourni **en anglais** par `djangorestframework-simplejwt` et varie selon
le cas (jeton invalide, expiré, en liste noire). Le client doit se fier au statut `401` et au
code `token_not_valid`, pas au texte.

---

## POST `/api/auth/logout/` – Se déconnecter (US02)

Met le jeton de rafraîchissement en liste noire : il ne peut plus servir à obtenir de jeton
d'accès. Accessible **sans authentification**, pour pouvoir se déconnecter même quand le jeton
d'accès a expiré. Le jeton d'accès en cours reste valable jusqu'à son expiration (15 minutes
au plus) : le client doit le supprimer de son côté.

### Exemple de requête

```http
POST /api/auth/logout/
Content-Type: application/json

{ "refresh": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." }
```

### `200 OK`

```json
{}
```

### Erreurs

- `400 Bad Request` si `refresh` est absent : `{"refresh": ["Ce champ est obligatoire."]}`
- `401 Unauthorized` si le jeton est invalide, expiré ou déjà en liste noire
  (même corps que pour `/api/auth/refresh/`).

---

## GET `/api/auth/me/` – Utilisateur connecté (US02)

**Authentification requise.**

### Exemple de requête

```http
GET /api/auth/me/
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### `200 OK`

```json
{
  "id": 1,
  "first_name": "Amina",
  "last_name": "Benali",
  "email": "amina.benali@example.com",
  "role": "ETUDIANT"
}
```

### `401 Unauthorized`

Sans jeton (en-tête de réponse `WWW-Authenticate: Bearer realm="api"`) :

```json
{ "detail": "Informations d'authentification non fournies." }
```

Jeton invalide ou expiré, ou jeton de rafraîchissement utilisé à la place du jeton d'accès :

```json
{
  "detail": "Le type de jeton fourni n'est pas valide",
  "code": "token_not_valid",
  "messages": [
    { "token_class": "AccessToken", "token_type": "access", "message": "Token is invalid" }
  ]
}
```

(Corps fourni par `djangorestframework-simplejwt` ; se fier au code `token_not_valid`.)
