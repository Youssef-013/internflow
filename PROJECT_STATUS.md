# InternFlow — état du projet

## État au 17 octobre 2026
- Socle terminé : React TypeScript/Vite, NestJS, Prisma et PostgreSQL, endpoints de santé et page d'accueil.
- JWT terminé et validé : inscription/connexion, hachage scrypt salé, jetons HS256 de 15 minutes, protection globale des routes et GET /api/auth/me. Les comptes supprimés perdent l'accès immédiatement.
- Sécurité : DTO stricts et email normalisé, erreurs de connexion génériques, aucun hash retourné, limitation des tentatives et du hachage simultané, Cache-Control no-store. JWT_SECRET privé dans .env ignoré ; jamais le publier.
- Livraison JWT en trois lots : services de sécurité/dépendances ; routes et protection globale ; tests/documentation. Consulter l'historique distant pour les identifiants. Ne pas refaire JWT.

## Vérifications réussies — 17 octobre
Dans le terminal utilisateur : npm run check (schéma Prisma, types et builds API/web, 13 tests API dont 10 d'authentification, 4 React) puis npm run test:db (2 tests PostgreSQL réel). Total : 19 tests réussis. Le parcours réel inscription, doublon, connexion, profil protégé et suppression de compte passe. Aucun nouveau changement fonctionnel depuis ces vérifications ; ne pas les répéter sans motif.
Dépendances installées : jsonwebtoken 9.0.3 et @types/jsonwebtoken 9.0.10, lockfile actualisé ; Prisma 6.12.0 et Vitest 5.0.4 conservés. L'audit historique du 14 octobre précède les dépendances JWT ; ne pas le présenter comme un nouvel audit.

## Prochaine tâche
CRUD des candidatures : DTO et endpoints limités au propriétaire, tests API incluant les tentatives d'accès entre utilisateurs. Réutiliser PrismaService, CredentialsDto si pertinent, AuthRequest.user et la garde globale existante. Toute nouvelle route est protégée par défaut ; seuls inscription, connexion et santé sont publics.

## Environnement et limites
- PostgreSQL sain après redémarrage Docker sur 127.0.0.1:15432 ; 5432 refusé par Windows. Ne pas supprimer le volume ni modifier le mot de passe existant.
- Ici : connexions réseau, y compris HTTP local, parfois refusées (EACCES), API Docker et identifiants Git restreints. Le terminal normal de l'utilisateur a validé les tests ; ne pas attribuer à un bug les refus d'accès déjà diagnostiqués. Utiliser le connecteur GitHub pour publier au besoin.
- Les autorisations d'écriture/réseau ne sont pas garanties pour les prochaines sessions. Aucun contournement ; intervention humaine uniquement si indispensable.
- Avant reprise, comparer HEAD local et distant : publication par connecteur possible alors que le réseau du terminal empêche la synchronisation Git locale. Préserver tous les fichiers et ne pas recréer les commits déjà distants. Ancienne base locale avant JWT : df964da.
- Déploiement externe : cible et identifiants toujours nécessaires. La limitation des tentatives est en mémoire par processus ; prévoir une limite partagée avant un déploiement multi-instance. Aucun refresh token dans ce jalon.

## Planning — Africa/Casablanca, 22h00
| Date 2026 | Jalon |
| --- | --- |
| 15 octobre | Socle React TS/NestJS/PostgreSQL/Prisma — terminé et publié. |
| 16 octobre | Inscription/connexion JWT, protection et tests — terminé le 17 octobre. |
| 17 octobre | CRUD des candidatures, DTO, isolation utilisateur et tests API. |
| 18 octobre | Interface CRUD connectée, formulaires, erreurs et chargement. |
| 19 octobre | Dashboard et Kanban, persistance et tests ciblés. |
| 20 octobre | Tests d'intégration, GitHub Actions et préparation du déploiement. |
| 21 octobre | Vérifications globales, corrections, documentation et livraison. |
Adapter au réalisé ; environ 3 commits cohérents/session et 21 au total, sans quota artificiel. Conserver les sessions à 22h00, heure du Maroc, jusqu'au 21 octobre.

## Continuité
Lire ce fichier, l'état Git et les seuls fichiers concernés. Travail par lots, réutilisation, tests ciblés puis contrôles globaux aux jalons. Pas de dépendance, recherche, refactorisation ou sous-agent inutile. Préserver les changements humains et les secrets. Pas de force push, commit cosmétique ou publication de code non vérifié. Mettre cet état à jour dans les commits fonctionnels. Checkout work/internflow ; si nécessaire, safe.directory ponctuel limité au chemin absolu exact, sans changer la confiance globale.
Rapport : fonctionnalités ; commits créés/poussés ; tests ; prochaine étape ; blocages éventuels.
