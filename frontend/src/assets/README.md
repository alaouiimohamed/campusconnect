# Images de l'interface

> **Versions provisoires.** Ces images ont été extraites de la maquette de Salma
> (capture d'écran) : leur résolution et leur détourage sont approximatifs.
> Elles sont à remplacer par les fichiers originaux de Salma, **sous le même
> nom**, sans autre modification du code.

| Fichier                    | Contenu                                     | Utilisation                                         |
| -------------------------- | ------------------------------------------- | --------------------------------------------------- |
| `logo-synapse.png`         | Logo Synapse, pour fonds clairs             | Réservé aux fonds clairs (pas encore utilisé)       |
| `logo-synapse-inverse.png` | Logo Synapse, version claire pour fond teal | `AuthPanel.jsx` (hauteur minimale 56 px)            |
| `campus-fpk.jpg`           | Photo du campus FPK                         | `AuthPanel.jsx`, photo « Campus FPK »               |
| `logo-fpk.png`             | Logo de la FPK                              | `AuthPanel.jsx`, logos partenaires (sur fond blanc) |
| `logo-usms.png`            | Logo de l'USMS                              | `AuthPanel.jsx`, logos partenaires (sur fond blanc) |

Règles :

- chaque `<img>` porte un texte alternatif (`alt`) qui décrit l'image ;
- sur le panneau teal, utiliser uniquement `logo-synapse-inverse.png` ;
- importer les images depuis le composant
  (`import logo from "../../assets/logo-synapse-inverse.png"`) pour que Vite
  les versionne au build.
