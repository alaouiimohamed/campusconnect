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
| POST | `/api/evenements/` | **Oui** (ORGANISATEUR, PROFESSEUR) | Création d'un événement (US07) |
| GET | `/api/categories/` | Non | Liste des catégories |
| POST | `/api/categories/` | **Oui** (ADMIN) | Créer une catégorie (US15) |
| GET | `/api/categories/<id>/` | Non | Consulter une catégorie |
| PATCH/PUT | `/api/categories/<id>/` | **Oui** (ADMIN) | Modifier une catégorie (US15) |
| DELETE | `/api/categories/<id>/` | **Oui** (ADMIN) | Supprimer une catégorie (US15) |

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

Crée un compte depuis l'espace étudiant (`/inscription`) ou l'espace organisateur
(`/organisateur/inscription`). Accessible **sans authentification**.

### Corps de la requête

| Champ | Type | Obligatoire | Règles |
|---|---|---|---|
| `first_name` | string | oui | Prénom, non vide, 150 caractères max. |
| `last_name` | string | oui | Nom, non vide, 150 caractères max. |
| `email` | string | oui | Email valide, **unique sans tenir compte des majuscules**, enregistré en minuscules. Sert d'identifiant de connexion. |
| `password` | string | oui | Validé par les `AUTH_PASSWORD_VALIDATORS` de Django : 8 caractères min., pas trop courant, pas uniquement numérique, pas trop proche du nom ou de l'email. |
| `password_confirm` | string | oui | Doit être identique à `password`. |
| `role` | string | non | `ETUDIANT` (par défaut) ou `ORGANISATEUR`. Toute autre valeur (y compris `PROFESSEUR`, `ADMIN`, minuscules, chaîne vide, `null`) → `400`. |
| `organisation` | string | si `role` = `ORGANISATEUR` | Nom de l'organisation ou de l'université, non vide, 150 caractères max., espaces autour retirés. Ignoré pour un étudiant. Jamais renvoyé dans la réponse. |

Règles de sécurité :

- Le mot de passe est haché (`set_password`, PBKDF2) et **n'est jamais renvoyé**.
- Seuls les rôles `ETUDIANT` et `ORGANISATEUR` peuvent être choisis à l'inscription.
  `PROFESSEUR` et `ADMIN` ne sont attribués que par un administrateur (US03).
- Pour un `ORGANISATEUR`, le compte et son profil `core.Organisateur` (champ `organisation`)
  sont créés **dans la même transaction** : si l'un échoue, rien n'est enregistré.
  Les événements d'un organisateur ne sont publiés qu'après validation par l'administrateur.
- Limite de **10 inscriptions par heure et par adresse IP** (variable `REGISTER_THROTTLE_RATE`).
  Au-delà : `429 Too Many Requests`.

Rôles possibles : `ETUDIANT` (défaut), `ORGANISATEUR`, `PROFESSEUR`, `ADMIN`.

### Exemple de requête (étudiant)

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

Sans `role`, le compte est `ETUDIANT`.

### Exemple de requête (organisateur)

```http
POST /api/auth/register/
Content-Type: application/json

{
  "first_name": "Youssef",
  "last_name": "Alami",
  "email": "contact@bde-fpk.org",
  "password": "Campus-Connect-2026!",
  "password_confirm": "Campus-Connect-2026!",
  "role": "ORGANISATEUR",
  "organisation": "BDE de la FPK"
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

Pour un organisateur, `role` vaut `"ORGANISATEUR"` ; `organisation` n'est pas renvoyé.

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

Rôle non autorisé ou inconnu :

```json
{ "role": ["Rôle invalide : choisissez ETUDIANT ou ORGANISATEUR."] }
```

Organisateur sans organisation : `{"organisation": ["Ce champ est obligatoire."]}`
(ou `"Ce champ ne peut pas être vide."` si la valeur est vide, `"Ce champ ne doit pas dépasser 150 caractères."` au-delà).

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

---

## Catégories (US15)

Les catégories sont utilisées pour classifier les événements. La migration initiale crée
automatiquement cinq catégories par défaut :

- Conférence
- Atelier
- Compétition
- Culture
- Associatif

La liste complète est accessible publiquement. La création, la modification et la suppression
sont réservées aux utilisateurs ayant le rôle `ADMIN`.

### Modèle d'une catégorie

| Champ | Type | Obligatoire | Règles |
|---|---|---|---|
| `nom` | string | oui | Entre 1 et 100 caractères, unique sans tenir compte de la casse. |
| `description` | string | non | 255 caractères maximum ; chaîne vide autorisée. |
| `abrv` | string | non | 50 caractères maximum ; chaîne vide autorisée. |

Les espaces autour de `nom`, `description` et `abrv` sont supprimés.

### `GET /api/categories/`

Accessible sans authentification. Retourne les catégories triées par nom.

```json
[
  {
    "id": 1,
    "nom": "Conférence",
    "description": "",
    "abrv": "CONF"
  }
]
```

### `POST /api/categories/`

Réservé aux administrateurs.

```http
POST /api/categories/
Authorization: Bearer <access>
Content-Type: application/json

{
  "nom": "Informatique",
  "description": "Événements liés aux technologies",
  "abrv": "IT"
}
```

`201 Created` :

```json
{
  "id": 6,
  "nom": "Informatique",
  "description": "Événements liés aux technologies",
  "abrv": "IT"
}
```

### `GET /api/categories/<id>/`

Accessible sans authentification.

```json
{
  "id": 6,
  "nom": "Informatique",
  "description": "Événements liés aux technologies",
  "abrv": "IT"
}
```

### `PATCH /api/categories/<id>/`

Réservé aux administrateurs. Permet une modification partielle.

```json
{
  "description": "Conférences, ateliers et compétitions autour de l'informatique"
}
```

### `PUT /api/categories/<id>/`

Réservé aux administrateurs. Tous les champs modifiables doivent être fournis.

### `DELETE /api/categories/<id>/`

Réservé aux administrateurs. Retourne `204 No Content`.

### Erreurs

- `400 Bad Request` pour un nom vide :
  `{"nom": ["Ce champ ne peut pas être vide."]}`
- `400 Bad Request` pour un nom déjà utilisé, avec ou sans majuscules :
  `{"nom": ["Une catégorie existe déjà avec ce nom."]}`
- `400 Bad Request` pour un champ trop long :
  `{"nom": ["Ce champ ne doit pas dépasser 100 caractères."]}`
- `401 Unauthorized` pour une modification ou suppression sans jeton valide.
- `403 Forbidden` pour un utilisateur authentifié qui n'est pas administrateur :
  `{"detail": "Seuls les administrateurs peuvent gérer les catégories."}`
- `404 Not Found` lorsque l'identifiant de catégorie n'existe pas.

---

## POST `/api/evenements/` – Créer un événement (US07)

**Authentification requise**, avec le rôle `ORGANISATEUR` ou `PROFESSEUR` (le professeur utilise
l'espace organisateur).

Règles :

- l'**organisateur** est toujours l'utilisateur connecté : un champ `organisateur` envoyé dans le
  corps est **ignoré** ;
- un professeur (ou un compte sans profil organisateur) reçoit automatiquement son profil
  `core.Organisateur` à sa première création, dans la même transaction que l'événement ;
- `statut` : `BROUILLON` (« Enregistrer le brouillon », par défaut) ou `EN_ATTENTE`
  (« Soumettre pour validation »). Toute autre valeur (`PUBLIE`, `COMPLET`…) est refusée :
  **seul l'administrateur publie** un événement ;
- la photo de couverture n'est pas encore gérée (tâche séparée).

### Corps de la requête

| Champ | Type | Obligatoire | Règles |
|---|---|---|---|
| `titre` | string | oui | Non vide, 150 caractères max. |
| `categories` | liste d'entiers | oui | Au moins un identifiant de `Categorie` existant. |
| `description` | string | oui | Non vide. |
| `date_debut` | date-heure ISO 8601 | oui | Dans le futur. Sans fuseau, l'heure est lue dans `Africa/Casablanca`. |
| `date_fin` | date-heure ISO 8601 | oui | Strictement après `date_debut`. |
| `lieu` | string | oui | Non vide, 150 caractères max. |
| `capacite` | entier | oui | Supérieur à 0. |
| `statut` | string | non | `BROUILLON` (défaut) ou `EN_ATTENTE`. |

Les espaces autour des textes sont retirés.

### Exemple de requête

```http
POST /api/evenements/
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "titre": "Journée de l'intelligence artificielle",
  "categories": [1, 3],
  "description": "Conférences et ateliers autour de l'IA.",
  "date_debut": "2026-12-15T09:00:00+01:00",
  "date_fin": "2026-12-15T17:00:00+01:00",
  "lieu": "Amphi A, FPK",
  "capacite": 120,
  "statut": "EN_ATTENTE"
}
```

### `201 Created`

```json
{
  "id": 7,
  "titre": "Journée de l'intelligence artificielle",
  "description": "Conférences et ateliers autour de l'IA.",
  "date_debut": "2026-12-15T09:00:00+01:00",
  "date_fin": "2026-12-15T17:00:00+01:00",
  "lieu": "Amphi A, FPK",
  "capacite": 120,
  "categories": [
    { "id": 1, "nom": "Conférence" },
    { "id": 3, "nom": "Informatique" }
  ],
  "statut": "EN_ATTENTE",
  "organisateur": {
    "id": 2,
    "first_name": "Youssef",
    "last_name": "Alami",
    "organisation": "BDE de la FPK"
  }
}
```

`organisateur.id` est l'identifiant de l'utilisateur ; `organisation` est vide pour un professeur.

### `400 Bad Request`

Erreurs regroupées par champ :

```json
{
  "titre": ["Ce champ est obligatoire."],
  "categories": ["Choisissez au moins une catégorie."],
  "description": ["Ce champ est obligatoire."],
  "date_debut": ["Ce champ est obligatoire."],
  "date_fin": ["Ce champ est obligatoire."],
  "lieu": ["Ce champ est obligatoire."],
  "capacite": ["Ce champ est obligatoire."]
}
```

Autres messages :

| Cas | Réponse |
|---|---|
| Texte vide | `{"lieu": ["Ce champ ne peut pas être vide."]}` |
| Texte trop long | `{"titre": ["Ce champ ne doit pas dépasser 150 caractères."]}` |
| Liste de catégories vide | `{"categories": ["Choisissez au moins une catégorie."]}` |
| Catégorie inconnue | `{"categories": ["Catégorie introuvable : 999."]}` |
| Date de début passée | `{"date_debut": ["La date de début doit être dans le futur."]}` |
| Fin avant (ou égale à) la date de début | `{"date_fin": ["La date de fin doit être après la date de début."]}` |
| Date mal formée | `{"date_debut": ["Date invalide : utilisez le format ISO 8601, par exemple 2026-12-15T14:00:00+01:00."]}` |
| Capacité nulle ou négative | `{"capacite": ["La capacité doit être supérieure à 0."]}` |
| Statut non autorisé | `{"statut": ["Statut invalide : choisissez BROUILLON ou EN_ATTENTE. Seul l'administrateur publie un événement."]}` |

### `401 Unauthorized`

Sans jeton, ou jeton invalide ou expiré : mêmes réponses que pour `/api/auth/me/`.

### `403 Forbidden`

Rôle `ETUDIANT` ou `ADMIN` :

```json
{ "detail": "Seuls les organisateurs et les professeurs peuvent créer un événement." }
```
