# InternFlow — état du projet

## Terminé — 19 octobre 2026
- Socle React TS/Vite, NestJS, PostgreSQL/Prisma, santé ; JWT, scrypt et protection globale ; API CRUD avec DTO stricts, propriétaire authentifié et mutations atomiques.
- Interface : inscription/connexion, liste filtrée/paginée, détail, formulaires et suppression confirmée. JWT en mémoire ; déconnexion, expiration et HTTP 401 ferment la session. Réponses tardives ignorées.
- Dashboard/Kanban : totaux globaux/par statut sur toutes les pages, cinq colonnes avec lots de 20, PATCH limité au statut et rechargement après confirmation. Échecs réessayables, annulation à la fermeture. Sélecteur accessible au clavier ; aucun ordre manuel ni glisser-déposer. Aucune dépendance, route API ou migration ajoutée.

## Vérifications
- 19 octobre : build et types web réussis ; 25 tests React réussis, dont 8 nouveaux tests dashboard/Kanban : totaux multi-pages, chargement, PATCH du statut, persistance après remontage, échecs, 401, annulation, retour à la liste.
- Fetch simulé : aucun nouveau parcours navigateur/API/PostgreSQL réel validé. API et schéma inchangés. Le 17 octobre : schéma, types/builds, 20 tests API et 3 tests PostgreSQL réel validés dans le terminal utilisateur.
- Aperçu navigateur local inaccessible lors de la session précédente (timeout) ; vérification visuelle restante. Aucun nouvel audit de dépendances.

## Prochaine tâche
20 octobre à 22h00, Africa/Casablanca : intégration, GitHub Actions et préparation du déploiement. Le jalon du 19 a été effectué manuellement sur demande ; ne pas le refaire lors de la session automatique du 19 à 22h00. Réutiliser les composants et endpoints existants.

## Problèmes et environnement
- PostgreSQL : 127.0.0.1:15432 ; garder Docker lancé, ne pas supprimer le volume ni changer les identifiants. Secrets uniquement dans .env ignoré.
- Terminal restreint : réseau/HTTP local parfois refusés, Docker et Git natif limités. Publication par connecteur GitHub ; comparer le distant avant reprise. HEAD local ancien df964da : ne pas recréer les commits distants et préserver les fichiers humains.
- Les autorisations temporaires ne garantissent pas les sessions suivantes. Intervention uniquement en cas de blocage réel ; aucun contournement.
- Déploiement : cible et accès nécessaires. Limitation auth en mémoire par processus ; limite partagée nécessaire avant plusieurs instances. Pas de refresh token ; rechargement = reconnexion.
- Les compteurs Kanban sont lus séparément : pas de snapshot transactionnel entre clients. Actualiser après un changement externe.

## Planning — Africa/Casablanca, 22h00
| Date 2026 | Jalon |
| --- | --- |
| 15 octobre | Socle — terminé et publié. |
| 16 octobre | JWT — terminé le 17. |
| 17 octobre | API CRUD — terminé et publié. |
| 18 octobre | Interface connectée — terminée et publiée. |
| 19 octobre | Dashboard/Kanban persistants — terminés et validés. |
| 20 octobre | Intégration, GitHub Actions et préparation du déploiement. |
| 21 octobre | Vérifications globales, corrections, documentation et livraison. |

## Continuité
Lire cet état, Git et les seuls fichiers concernés. Lots cohérents, tests ciblés puis contrôles globaux aux jalons. Aucun sous-agent, dépendance ou refactoring inutile. Environ 3 commits/session et 21 au total sans quota artificiel. Publier après vérifications essentielles, confirmer le SHA distant, sans force push. Aucun travail après le 21 octobre.
Rapport : fonctionnalités ; commits créés/poussés ; tests ; prochaine étape ; blocages éventuels.
