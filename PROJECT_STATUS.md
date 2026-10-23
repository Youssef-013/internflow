# InternFlow — état du projet

## Livraison locale — 23 octobre 2026
- Socle React TS/NestJS/PostgreSQL/Prisma ; JWT, scrypt et protection globale ; CRUD avec DTO stricts, propriétaire authentifié et mutations atomiques : livrés.
- Interface connectée, formulaires, filtres/pagination, détails, erreurs et suppression confirmée : livrés. JWT en mémoire, données privées retirées à la déconnexion/expiration/401.
- Dashboard et cinq colonnes Kanban : totaux sur toutes les pages, lots de 20, PATCH du statut, rechargement après confirmation et gestion des échecs. Pas de glisser-déposer ni d’ordre manuel.
- CI GitHub Actions et préparation du déploiement livrées. Aucun hébergeur/CD configuré.

## Vérifications confirmées
- CI verte sur 4937672 : https://github.com/Youssef-013/internflow/actions/runs/39519638725 ; installation Linux, génération/migration Prisma, schéma/types/builds et 49 tests (20 API, 25 React, 4 PostgreSQL) réussis. Pas de changement applicatif depuis.
- Le 23, navigateur intégré + API/PostgreSQL réels : santé, connexion, liste, formulaire/création, dashboard, déplacement Kanban, déconnexion et persistance après reconnexion vérifiés. Accueil/dashboard inspectés à 650 px ; pas de couverture visuelle exhaustive mobile/desktop. Compte temporaire et ses trois candidatures nettoyés.
- Note complète : docs/DELIVERY.md. Procédure de déploiement : docs/DEPLOYMENT.md. Aucun nouvel audit de dépendances revendiqué.

## Suite
Jalon final repris le 23 sur demande explicite, après la fin de la période automatique du 16 au 21. Ne pas relancer les anciens jalons ni les sessions quotidiennes. Nouvelle intervention uniquement sur demande : hébergement, accès de déploiement et matrice de navigateurs/formats à définir.

## Environnement et limites
- PostgreSQL local 127.0.0.1:15432 ; conserver le volume et les identifiants. Secrets seulement dans .env ignoré.
- Réseau accordé pour le tour du 23 : accès HTTP local et Git fonctionnels ; API Docker encore refusée. PostgreSQL déjà démarré et sain. Les permissions ne sont pas garanties aux tours suivants.
- Historique Git local synchronisé avec les commits distants après vérification que tous les fichiers correspondaient ; ne plus traiter df964da comme HEAD courant. Préserver les changements humains avant toute synchronisation.
- JWT 15 min, pas de refresh token ; limitation des tentatives en mémoire par processus. Limite partagée nécessaire avant plusieurs instances.
- Compteurs Kanban lus séparément, pas de snapshot transactionnel entre clients ; actualiser après modification externe.

## Continuité
Lire cet état, Git et les seuls fichiers concernés. Lots cohérents, tests ciblés puis globaux aux jalons ; ne pas répéter des contrôles inchangés. Aucun sous-agent, dépendance, refactoring ou commit cosmétique inutile. Publier seulement après contrôles essentiels, confirmer le SHA distant, sans force push.
Rapport : fonctionnalités ; commits créés/poussés ; tests ; prochaine étape ; blocages éventuels.
