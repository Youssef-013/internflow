# InternFlow — état du projet

## État au 13 octobre 2026
- Dépôt vérifié : Youssef-013/internflow, public, initialement vide.
- Compte GitHub connecté : Youssef-013 ; droits admin et push.
- Réalisé : cadrage de l'architecture et des sept jalons ; aucun code applicatif.
- Architecture : monorepo npm, apps/web (React TypeScript), apps/api (NestJS), PostgreSQL et Prisma.
- Domaine initial : candidatures de stage privées par utilisateur (entreprise, poste, statut, dates, notes).
- Sécurité : mots de passe hachés, JWT à durée limitée, validation DTO, isolation par propriétaire, secrets hors Git.
- Tests applicatifs : non exécutés, application pas encore créée.

## Planning — Africa/Casablanca, 22h00
| Date 2026 | Jalon |
| --- | --- |
| 14 octobre | Initialiser React TS et NestJS, PostgreSQL local, Prisma, scripts de vérification et test de démarrage. |
| 15 octobre | Inscription/connexion JWT, protection des routes et tests d'authentification. |
| 16 octobre | CRUD des candidatures, DTO, isolation des utilisateurs et tests API. |
| 17 octobre | Interface CRUD connectée, formulaires, erreurs et états de chargement. |
| 18 octobre | Dashboard et Kanban avec persistance des statuts et tests ciblés. |
| 19 octobre | Tests d'intégration, GitHub Actions et préparation du déploiement. |
| 20 octobre | Vérifications globales, corrections, documentation et livraison. |

Objectif : environ 3 commits cohérents par session, environ 21 au total, sans quota artificiel.

## Prochaine tâche — premier jalon
Créer les deux applications et la base locale, établir le schéma Prisma User/Application et vérifier types, builds et démarrage. Regrouper en lots : structure et scripts ; base et Prisma ; test de démarrage et documentation. Adapter au travail déjà réalisé.

## Règles de session
Lire uniquement ce fichier, le dernier état Git et les fichiers concernés ; réutiliser le code ; ne pas refaire une opération réussie. Modifications par lots, tests ciblés, vérifications globales aux jalons. Dépendances nécessaires uniquement, pas de refactorisation ou recherche sans besoin. Maintenir cet état concis dans les commits fonctionnels. Messages de commit courts ; aucun push de code échouant aux contrôles essentiels. Ne pas exposer de secrets, écraser des changements humains ni forcer un push.

## Blocages et limites
- Écriture GitHub et exécution planifiée à confirmer par les opérations réelles ; les droits du compte ne prouvent pas toutes les permissions du connecteur.
- Accès réseau du terminal restreint ; installation des dépendances et publication Git du terminal non vérifiés.
- Autonomie complète non garantie ; les sessions utilisent leurs permissions effectives et signalent tout blocage réel.
- Déploiement externe en attente d'une cible et d'identifiants ; ne pas inventer un déploiement réussi.

## Rapport de session
Fonctionnalités réalisées ; commits créés et poussés ; résultat des tests ; prochaine étape ; blocages éventuels.
