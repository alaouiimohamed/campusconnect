# Images de l'interface

Images attendues pour la page d'inscription (US01), d'après la maquette.
Elles ne sont pas encore fournies : `AuthPanel.jsx` affiche un emplacement vide
(`.auth-panel__slot`) à la place de chacune.

| Fichier attendu    | Contenu                              | Emplacement dans `AuthPanel.jsx` |
| ------------------ | ------------------------------------ | -------------------------------- |
| `logo-synapse.png` | Logo Synapse (utilisé sans retouche) | `.auth-panel__slot--logo`        |
| `campus-fpk.jpg`   | Photo du campus FPK                  | `.auth-panel__slot--photo`       |
| `logo-fpk.png`     | Logo de la FPK                       | `.auth-panel__slot--partner` (1) |
| `logo-usms.png`    | Logo de l'USMS                       | `.auth-panel__slot--partner` (2) |

Quand une image arrive : l'importer dans `AuthPanel.jsx`
(`import logo from "../../assets/logo-synapse.png"`) et remplacer
l'emplacement par une balise `<img>` avec un texte alternatif.
