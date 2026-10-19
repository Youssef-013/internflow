# InternFlow — état du projet

## Terminé — jalon interface du 18 octobre 2026
- Socle React TypeScript/Vite, NestJS, PostgreSQL/Prisma et endpoints de santé livrés.
- JWT livré : inscription/connexion, scrypt, jetons HS256 de 15 minutes, protection globale, profil et limitation des tentatives. Secrets uniquement dans .env ignoré.
- API CRUD livrée : DTO stricts, propriétaire authentifié, filtres/pagination, isolation et mutations atomiques.
- Interface connectée : inscription/connexion, liste filtrée et paginée, détail, création/modification, suppression confirmée, validation, chargement et erreurs réessayables. JWT en mémoire uniquement ; déconnexion, expiration et HTTP 401 effacent les données privées. Requêtes abandonnées et réponses tardives ignorées.

## Vérifications
- API inchangée : le 17 octobre, npm run check et npm run test:db ont validé schéma, types/builds, 20 tests API et 3 tests PostgreSQL réel dans le terminal utilisateur.
- Interface : types et build web réussis ; 17 tests React réussis ici (authentification, CRUD, filtres/pagination, erreurs, annulation et expiration). Ces tests simulent fetch ; pas de nouveau parcours navigateur/API réel validé.
- Aucune nouvelle dépendance ni migration. Aperçu navigateur local inaccessible (timeout) ; vérification visuelle restant à effectuer.

## Prochaine tâche
19 octobre à 22h00, Africa/Casablanca : dashboard et Kanban avec persistance des statuts et tests ciblés. Réutiliser api.ts, les composants et les endpoints existants. Ne pas refaire JWT/CRUD/interface.

## Problèmes et environnement
- PostgreSQL : 127.0.0.1:15432 ; garder Docker lancé, ne pas supprimer le volume ni changer les identifiants.
- Terminal restreint : réseau/HTTP local parfois refusés, Docker et Git natif limités. Publication par connecteur GitHub ; comparer le distant avant toute reprise. HEAD local ancien df964da : ne pas recréer les commits distants ; préserver les fichiers humains.
- Les autorisations temporaires ne garantissent pas les sessions suivantes. Aucun contournement ; demander une intervention seulement en cas de blocage réel.
- Déploiement : cible et accès nécessaires. Limitation auth en mémoire par processus ; prévoir une limite partagée avant plusieurs instances. Pas de refresh token ; rechargement de page = reconnexion.

## Planning — Africa/Casablanca, 22h00
| Date 2026 | Jalon |
| --- | --- |
| 15 octobre | Socle — terminé et publié. |
| 16 octobre | JWT — terminé le 17. |
| 17 octobre | API CRUD — terminé et publié. |
| 18 octobre | Interface CRUD connectée — terminée, tests réussis. |
| 19 octobre | Dashboard/Kanban persistants et tests ciblés. |
| 20 octobre | Intégration, GitHub Actions et préparation du déploiement. |
| 21 octobre | Vérifications globales, corrections, documentation et livraison. |

## Continuité
Lire cet état, le dernier état Git et les seuls fichiers concernés. Travail par lots ; tests ciblés puis contrôles globaux aux jalons. Aucun sous-agent, dépendance ou refactoring inutile. Environ 3 commits/session et 21 au total sans quota artificiel. Publier seulement après vérifications essentielles, confirmer le SHA distant, sans force push. Aucun travail après le 21 octobre.
Rapport : fonctionnalités ; commits créés/poussés ; tests ; prochaine étape ; blocages éventuels.
