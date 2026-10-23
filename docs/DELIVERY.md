# Livraison InternFlow — 23 octobre 2026

Le jalon final prévu le 21 a été repris le 23 sur demande explicite. Application locale livrée : React TypeScript, NestJS, PostgreSQL/Prisma, JWT, CRUD privé, dashboard et Kanban persistants. Aucun hébergement de production n’est configuré.

## Preuves de validation

- [CI du code livré](https://github.com/Youssef-013/internflow/actions/runs/39519638725), commit 4937672 : installation propre sur Linux, génération Prisma, migration PostgreSQL 17, schéma, types, builds et 49 tests réussis (20 API, 25 React, 4 PostgreSQL). Artefact web enregistré par la CI ; conservation limitée à 7 jours.
- Le 23 : contrôle réel dans un onglet dédié sur http://127.0.0.1:5173, avec API et PostgreSQL locaux. Santé API et base : HTTP 200. Connexion, liste, ouverture du formulaire, création d’une candidature, compteurs et déplacement Kanban vérifiés. Après déconnexion, l’espace privé disparaît ; après reconnexion, la candidature et le statut modifié sont conservés.
- Compte de validation temporaire et ses trois candidatures supprimés après contrôle. Aucun compte existant utilisé. Aucun changement du code applicatif depuis la CI verte ; pas de répétition des tests inchangés.
- Accueil et dashboard inspectés visuellement dans le navigateur intégré à largeur réduite (650 px). Cela ne constitue pas une validation exhaustive sur tous les téléphones et navigateurs. Les autres scénarios CRUD et l’isolation entre deux comptes sont couverts par les tests API/React/PostgreSQL, sans les présenter comme tous rejoués manuellement.

## Reprendre localement

Suivre le [README](../README.md) pour une nouvelle installation. Sur cette installation déjà préparée, garder Docker Desktop lancé, puis utiliser trois terminaux à la racine : `npm run db:up`, `npm run dev:api` et `npm run dev:web`. Le build API doit exister avant dev:api. Ouvrir http://127.0.0.1:5173. PostgreSQL local est exposé sur 127.0.0.1:15432.

Les secrets restent dans .env ignoré ; ne jamais les copier dans un ticket ou un commit. Après une modification API TypeScript, compiler avec `npm run build -w @internflow/api` ou lancer `npm run build:watch -w @internflow/api` dans un terminal séparé.

## Limites connues et suites possibles

- JWT en mémoire, expiration après 15 minutes, reconnexion après rechargement ; pas de refresh token ni de révocation individuelle à la déconnexion. La suppression du compte invalide ses accès protégés.
- Déplacement Kanban via le sélecteur de statut ; pas de glisser-déposer ni d’ordre manuel. Totaux lus séparément ; actualiser après une modification depuis un autre client.
- Avant une mise en production : choisir l’hébergeur, fournir les accès, configurer HTTPS/proxy, sauvegardes et supervision, puis valider les formats mobile/desktop et les navigateurs ciblés. Pour plusieurs instances, remplacer la limitation des tentatives en mémoire par une limite partagée.
- Voir [DEPLOYMENT.md](DEPLOYMENT.md) pour migrations, contrôles de santé et retour arrière. La CI fournit un build vérifié ; elle ne déploie rien.
- La période automatique est terminée. Toute nouvelle fonctionnalité ou mise en ligne nécessite une nouvelle demande ; aucun quota de commits artificiel.
