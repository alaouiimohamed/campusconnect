# Synapse : design tokens

Ce document décrit les couleurs, jetons et règles d'accessibilité du site Synapse. Il sert de référence commune entre le design et le code.

- **Source de vérité du design :** le canvas de maquettes (lien dans `docs/`), validé par Salma Zair (UX/UI).
- **Source de vérité du code :** `frontend/src/styles/tokens.css`. Les composants n'utilisent que des variables CSS, jamais une couleur écrite en dur.
- **Quand une valeur change :** on modifie le design et `tokens.css` dans la même Pull Request, puis ce fichier.

## 1. Palette principale

Trois couleurs, plus le blanc.

| Couleur | Hex | Rôle |
|---|---|---|
| Teal | `#1e847f` | Boutons principaux, liens, texte de marque, piliers de capacité, panneau de connexion |
| Sable | `#ecc19c` | Étiquettes, bannière d'accueil, boutons sur fond noir, décors |
| Noir | `#000000` | Texte, panneaux sombres, vignettes |
| Blanc | `#ffffff` | Cartes, texte sur teal |

Le logo Synapse contient aussi du bleu et de l'or. Il est utilisé tel quel, sans recoloration, sur fond blanc.

## 2. Jetons

### Existants dans `tokens.css`

| Jeton | Valeur | Remarque |
|---|---|---|
| `--color-primary` | `#1e847f` | Teal |
| `--color-accent` | `#ecc19c` | Sable |
| `--color-dark` | `#000000` | Noir |
| `--color-surface` | `#ffffff` | Cartes |
| `--color-text` | `var(--color-dark)` | Texte |
| `--color-success` | `var(--color-primary)` | Succès |
| `--color-danger` | `#b42318` | Erreur, à confirmer (voir section 7) |

### À aligner sur le design

| Jeton | Valeur actuelle | Valeur du design |
|---|---|---|
| `--color-bg` | `#faf3eb` | `#faf4ec` |
| `--color-border` | `#eadfd3` | `#eadccb` |
| `--color-text-muted` | `#5c5c5c` | `#4a4a4a` |
| `--shadow-card` | `0 4px 24px rgb(0 0 0 / 6%)` | `0 8px 24px rgb(120 84 48 / 14%)` |

### Jetons par rôle (proposés)

Les composants utilisent ces jetons plutôt que `--color-primary` directement : cela permet le thème sombre sans réécrire les composants.

| Jeton | Thème clair | Thème sombre | Usage |
|---|---|---|---|
| `--color-bg` | `#faf4ec` | `#000000` | Fond de page |
| `--color-surface` | `#ffffff` | `#1a1a1a` | Cartes |
| `--color-text` | `#000000` | `#ffffff` | Texte |
| `--color-text-muted` | `#4a4a4a` | `#d0d0d0` | Texte secondaire |
| `--color-border` | `#eadccb` | `#3a3a3a` | Bordures, pistes |
| `--color-action` | `#1e847f` | `#ecc19c` | Fond des boutons |
| `--color-on-action` | `#ffffff` | `#000000` | Texte des boutons |
| `--color-brand-text` | `#1e847f` | `#ecc19c` | Liens, logo texte, grands chiffres |
| `--shadow-card` | `0 8px 24px rgb(120 84 48 / 14%)` | `0 8px 24px rgb(0 0 0 / 40%)` | Ombre des cartes |

```css
:root {
  --color-bg: #faf4ec;
  --color-text-muted: #4a4a4a;
  --color-border: #eadccb;
  --shadow-card: 0 8px 24px rgb(120 84 48 / 14%);

  --color-action: var(--color-primary);
  --color-on-action: #ffffff;
  --color-brand-text: var(--color-primary);
}

:root[data-theme="dark"] {
  --color-bg: #000000;
  --color-surface: #1a1a1a;
  --color-text: #ffffff;
  --color-text-muted: #d0d0d0;
  --color-border: #3a3a3a;
  --color-action: #ecc19c;
  --color-on-action: #000000;
  --color-brand-text: #ecc19c;
  --shadow-card: 0 8px 24px rgb(0 0 0 / 40%);
}
```

## 3. Règles de contraste

| Combinaison | Contraste | Règle |
|---|---|---|
| Blanc sur teal | environ 4,5:1 | Juste au seuil : pas de texte sous 16 px, pas de graisse légère sur un bouton teal |
| Noir sur sable | environ 12,7:1 | Très bon |
| Teal sur blanc (carte) | environ 4,5:1 | Accepté pour le texte sur une carte |
| Teal sur le fond crème | environ 4,1:1 | Réservé aux grands titres ; pas de petit texte ni de lien directement sur le fond de page |
| Blanc sur sable | environ 1,7:1 | **Interdit** : texte noir uniquement |
| Sable sur noir (thème sombre) | environ 12,7:1 | Très bon |
| `#b42318` sur blanc | environ 6,5:1 | Bon |

Autres règles d'accessibilité :
- Cible tactile minimale : 44 px de côté.
- Une erreur ne repose jamais sur la couleur seule : bordure épaisse et message écrit « Erreur : … ».
- Chaque champ de formulaire a une étiquette visible.
- Le focus clavier doit rester visible.

## 4. Éléments de marque

- **Colonnade :** la capacité d'un événement s'affiche en piliers (écho des piliers de l'ancien logo), pas en barre lisse. Piliers remplis : couleur d'action ; piliers vides : couleur de bordure.
- **Fronton et piliers :** sélecteur de jour de l'accueil étudiant.
- **Formulaires d'événement :** colonne de progression (un pilier par champ obligatoire), aperçu en direct de la carte, champs adaptés au type (conférence, compétition, atelier).

## 5. Typographie

| Usage | Design | Code actuel |
|---|---|---|
| Titres | Poppins (600 à 700) | Poppins |
| Texte | Inter (400 à 600) | Poppins, **à aligner** |
| Arabe | Noto Sans Arabic | Non chargée, **à ajouter** pour la version droite-gauche |

## 6. Formes

| Élément | Design | Code actuel |
|---|---|---|
| Cartes | 20 px | `--radius-card: 16px`, **à aligner** |
| Boutons | 14 px (formulaires) ou pilule (connexion) | `--radius-pill: 999px` |
| Champs de formulaire | 16 px | À définir |

## 7. Décisions en attente

Rouge d'erreur `#b42318`  Le garder comme couleur fonctionnelle, réservée aux erreurs et toujours accompagnée d'un message écrit ?


## 8. Garde-fous proposés

- Revue de Pull Request : toute couleur hexadécimale en dehors de `tokens.css` est refusée.
- Facultatif : une règle de lint pour interdire les couleurs écrites en dur dans les fichiers `.css` et `.jsx`.
