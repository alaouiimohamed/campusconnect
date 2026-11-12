# Règles de collaboration – CampusConnect

## 1. Branches

| Branche | Rôle | Qui peut y pousser ? |
|---|---|---|
| `main` | Version stable, démontrable (fin de chaque MVP) | Personne directement – uniquement via PR depuis `develop` |
| `develop` | Intégration du travail en cours | Via PR uniquement |
| `feature/USxx-description` | Une user story ou une tâche | Le développeur assigné |
| `fix/description` | Correction d'un bug | Le développeur assigné |
| `docs/description` | Documentation, UML | Tout membre |

Exemples : `feature/US01-inscription-compte`, `feature/US09-inscription-evenement`, `fix/filtre-categories`.

## 2. Cycle de travail

1. Mettre à jour `develop` : `git checkout develop && git pull`
2. Créer sa branche : `git checkout -b feature/US04-catalogue-evenements`
3. Committer régulièrement en respectant la convention ci-dessous.
4. Pousser : `git push -u origin feature/US04-catalogue-evenements`
5. Ouvrir une **Pull Request vers `develop`** et remplir le modèle.
6. Au moins **1 revue approuvée** et une **CI verte** avant la fusion.
7. Supprimer la branche après la fusion.
8. À la fin d'un MVP : PR `develop` → `main` + tag (`v1.0.0` pour MVP 1, `v2.0.0` pour MVP 2).

## 3. Convention de commits (Conventional Commits)

Format : `type(portée): description courte`

| Type | Usage |
|---|---|
| `feat` | Nouvelle fonctionnalité |
| `fix` | Correction de bug |
| `docs` | Documentation |
| `style` | Mise en forme sans changement de logique |
| `refactor` | Restructuration du code |
| `test` | Ajout ou modification de tests |
| `chore` | Configuration, dépendances, outillage |

Exemples :

```
feat(auth): ajouter la connexion par email
fix(events): corriger le filtre par date
docs(uml): ajouter le diagramme de classes
```

Pour lier un commit à une tâche ClickUp, ajouter son identifiant : `feat(events): créer la page détail #CU-abc123`.

## 4. Pull Requests

- Une PR = une user story ou une tâche.
- Titre au format des commits.
- Remplir le modèle (description, tâche ClickUp, tests).
- Le code doit fonctionner localement avant la demande de revue.
- Le fichier `.gitattributes` force les fins de ligne LF : sous Windows, `core.autocrlf` convertit sinon les fichiers en CRLF, ce qui fait échouer `npm run format:check` (Prettier exige `endOfLine: lf`).
- **La CI doit être verte avant toute fusion** (ruff, black, pytest). Une PR dont la CI échoue ne peut pas être fusionnée.

## 5. Lien avec ClickUp

Le tableau Scrumban suit les colonnes : Product Backlog → Ready → In Progress → Review → Testing → Done.
Une tâche passe en **Review** quand sa PR est ouverte, et en **Done** quand la PR est fusionnée et testée.
