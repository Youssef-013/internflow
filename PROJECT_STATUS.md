# InternFlow — état du projet

## État au 15 octobre 2026
Jalon 1 validé : monorepo React TypeScript/Vite et NestJS, accueil avec vérification API, endpoints de santé, service Prisma, schéma User/Application, migration initiale et PostgreSQL local. JWT/CRUD/dashboard/Kanban restent à développer.

## Vérifications réussies
- Dans le terminal utilisateur : npm ci, génération Prisma 6.12.0, migration PostgreSQL, validation du schéma, types et builds API/web.
- 8 tests réussis : 3 HTTP API, 4 React, 1 intégration réelle PostgreSQL (relations, unicité, cascade).
- Dans cette conversation : démarrage NestJS avec Prisma réel ; /api/health et /api/health/ready répondent 200, base connectée.
- Audit du lockfile sans vulnérabilité signalée le 14 octobre. Vitest 5.0.4 ; versions verrouillées à conserver.
- Livraison du socle : consulter l'historique Git. Ne pas refaire les installations, migrations ou contrôles réussis sans modification les justifiant.

## Prochaine tâche
JWT : inscription avec mot de passe haché, connexion, configuration secrète hors Git, expiration des jetons, protection des routes et tests. Puis CRUD des candidatures limitées au propriétaire. Réutiliser le service Prisma, les pipes de validation et les tests existants.

## Environnement et limites
- PostgreSQL sain sur 127.0.0.1:15432 (5432 refusé par Windows). .env local ignoré, mot de passe préservé ; Compose et exemple alignés sur 15432. Ne pas supprimer le volume.
- Le terminal normal de l'utilisateur a débloqué installation, génération Prisma et Docker. L'API Docker et le gestionnaire d'identifiants Git restent restreints dans cette conversation ; publier via le connecteur GitHub au besoin.
- Les permissions temporaires ne garantissent pas l'autonomie des prochaines sessions. Ne pas répéter une opération bloquée si rien n'a changé ; demander uniquement l'intervention indispensable.
- Déploiement externe : cible et accès encore nécessaires.

## Planning — Africa/Casablanca, 22h00
Jalon du 14 terminé le 15 : socle. Le 15 : JWT ; 16 : CRUD privé/tests API ; 17 : interface CRUD ; 18 : dashboard/Kanban ; 19 : intégration/CI/CD ; 20 : vérifications globales/documentation/livraison. Adapter au réalisé ; environ 3 commits cohérents/session et 21 au total, sans quota artificiel.

## Règles de continuité
Lire ce fichier, le dernier état Git et les seuls fichiers nécessaires. Travailler par lots, réutiliser, tests ciblés puis vérifications globales aux jalons ; aucune dépendance, recherche ou refactorisation inutile, ni sous-agent. Secrets hors Git, validation DTO et isolation propriétaire. Ne pas écraser les changements humains, forcer un push, pousser du code non vérifié ou créer des commits cosmétiques. Mettre cet état à jour avec les commits fonctionnels. Checkout work/internflow ; si Git refuse le propriétaire, utiliser -c safe.directory limité au chemin absolu exact, sans changer la confiance globale.

Rapport : fonctionnalités ; commits créés/poussés ; tests ; prochaine étape ; blocages éventuels.
