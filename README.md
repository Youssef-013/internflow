# InternFlow

Suivi personnel des candidatures de stage. Monorepo React TypeScript / NestJS / PostgreSQL / Prisma.

## État

Socle applicatif, page d'accueil et endpoints de santé disponibles. Authentification JWT validée ; API CRUD des candidatures validée. Interface CRUD, dashboard et Kanban connectés disponibles : voir [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Démarrage local

Prérequis : Node.js 22.14+ (branche 22) ou 24+, npm et Docker avec son moteur lancé.

1. Copier `.env.example` vers `.env`. Remplacer le mot de passe dans `POSTGRES_PASSWORD` **et** `DATABASE_URL` (encoder les caractères spéciaux dans l'URL). Définir un `JWT_SECRET` privé et aléatoire d'au moins 32 octets ; le serveur refuse un secret absent ou le texte d'exemple. Générer une valeur avec `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`, puis la copier dans `.env`. Ne jamais publier `.env`.
2. À la racine :

```sh
npm ci
npm run db:generate
npm run db:up
npm run db:migrate
npm run build
```

3. Dans deux terminaux à la racine :

```sh
npm run dev:api
```

```sh
npm run dev:web
```

Ouvrir http://127.0.0.1:5173. Vite transmet `/api` au serveur local sur le port 3000. L'API écoute sur `127.0.0.1` par défaut ; définir `HOST=0.0.0.0` uniquement si l'environnement le nécessite. Si le port API change, adapter aussi la cible proxy de Vite.

Le serveur de développement API surveille les fichiers compilés : après une modification TypeScript, lancer `npm run build -w @internflow/api` ou son script `build:watch` dans un autre terminal.

## Vérifications

```sh
npm run check
npm run test:db
```

`check` valide Prisma, vérifie les types, compile les deux applications et exécute les tests HTTP API et React. Les tests HTTP utilisent un substitut de base : ils ne prouvent pas la connexion à PostgreSQL. `test:db` exige une base locale/test migrée, crée ses données temporaires et les nettoie ; ne pas le lancer contre une base de production.

- `GET /api/health` : processus en vie, sans dépendance à la base.
- `GET /api/health/ready` : requête PostgreSQL, HTTP 503 si indisponible, sans détail de connexion exposé.
- `npm run db:down` : arrête PostgreSQL en conservant le volume de données.

Les builds web statiques exigent un reverse proxy `/api` en production. Aucun hébergement ni déploiement de production n'est encore configuré.

## Authentification

- `POST /api/auth/register` : corps JSON `{ "email": "vous@example.com", "password": "un mot de passe long" }` ; email normalisé, mot de passe de 12 à 128 caractères, hachage scrypt salé. Retour HTTP 201 ; doublon HTTP 409.
- `POST /api/auth/login` : mêmes champs ; HTTP 200 ou 401 avec erreur générique.
- Réponse d'authentification : `accessToken`, `tokenType: "Bearer"`, `expiresIn: 900`, `user` (id, email, date de création). Aucun mot de passe ou hash n'est retourné.
- `GET /api/auth/me` : profil courant avec l'en-tête `Authorization: Bearer <accessToken>`.
- Les routes sont protégées par défaut ; seuls inscription, connexion et santé sont explicitement publics. Les jetons HS256 sont limités à 15 minutes et vérifiés avec l'émetteur et le destinataire attendus. Un compte supprimé ne peut plus accéder aux routes protégées.
- Inscription et connexion partagent une limite de 10 tentatives/minute/adresse IP, en mémoire dans chaque processus. Un déploiement à plusieurs instances nécessitera une limitation partagée. Le hachage est également limité à deux opérations simultanées par processus ; HTTP 503 invite à réessayer en cas de saturation.
- Aucun refresh token n'est fourni dans ce jalon. Une déconnexion côté client efface son jeton ; les jetons déjà émis restent valides jusqu'à expiration. Conserver les jetons en mémoire côté navigateur ; utiliser HTTPS pour un déploiement externe.

Les tests HTTP d'authentification utilisent un substitut de persistance ; `npm run test:db` inclut aussi le parcours inscription/connexion/profil sur PostgreSQL réel avec nettoyage de ses seules données temporaires.

## Candidatures

Toutes les routes `/api/applications` exigent `Authorization: Bearer <accessToken>`. Le propriétaire vient du compte authentifié ; `userId`, `id`, `createdAt` et `updatedAt` ne sont jamais acceptés dans un corps JSON.

| Méthode | Route | Résultat |
| --- | --- | --- |
| POST | `/api/applications` | Crée une candidature, HTTP 201. |
| GET | `/api/applications` | Liste uniquement les candidatures du compte, avec pagination et filtre de statut. |
| GET | `/api/applications/:id` | Consulte une candidature du compte. |
| PATCH | `/api/applications/:id` | Modifie les champs fournis, HTTP 200. |
| DELETE | `/api/applications/:id` | Supprime une candidature du compte, HTTP 204 sans corps. |

Création : `company` et `position` obligatoires (1 à 200 caractères après suppression des espaces aux extrémités). Champs facultatifs : `status` (`DRAFT` par défaut, `APPLIED`, `INTERVIEW`, `OFFER`, `REJECTED`), `appliedAt` et `deadline` (dates ISO 8601), `notes` (10 000 caractères maximum). Dates et notes peuvent être effacées avec `null` ; entreprise, poste et statut ne peuvent pas être nuls. Un PATCH vide et les champs inconnus sont refusés (HTTP 400).

Exemple de liste : `/api/applications?status=APPLIED&page=1&pageSize=20`. Réponse : `{ "items": [], "total": 0, "page": 1, "pageSize": 20 }`. Taille maximale 100 ; tri par date de création décroissante puis identifiant pour un ordre stable. Le total porte uniquement sur le compte et le filtre demandés.

Une candidature absente ou appartenant à un autre compte retourne le même HTTP 404, y compris lors d'une modification ou suppression. Les écritures vérifient le propriétaire dans leur opération SQL. Les réponses privées portent `Cache-Control: no-store`. Le modèle existant suffit : aucune migration supplémentaire pour ce jalon.

Les tests HTTP CRUD utilisent un substitut de persistance ; `npm run test:db` vérifie aussi le CRUD réel et les tentatives d'accès entre deux comptes PostgreSQL temporaires, nettoyés en fin de test.

## Interface web

L’accueil permet de créer un compte ou de se connecter. L’espace personnel propose la liste (20 candidatures/page), un filtre de statut, le détail, la création, la modification et la suppression avec confirmation. Les formulaires valident les champs, conservent les valeurs après une erreur et empêchent les doubles soumissions. Dates et notes peuvent être effacées ; une date inchangée conserve son horodatage d’origine.

Le JWT reste uniquement en mémoire : un rechargement impose une reconnexion. La déconnexion, l’expiration et une réponse HTTP 401 ferment la session et effacent l’affichage privé. Les requêtes abandonnées et les réponses tardives ne rétablissent pas les données d’une ancienne session. Les erreurs réseau/serveur permettent de réessayer ; les requêtes ont un délai de 10 secondes.

Vérifications ciblées : `npm run typecheck -w @internflow/web`, `npm run build -w @internflow/web`, `npm run test -w @internflow/web`. Les tests React simulent les réponses HTTP et ne remplacent pas les tests PostgreSQL ni un parcours complet navigateur/API.
## Dashboard et Kanban

Depuis l’espace personnel, choisir **Dashboard et Kanban**. Les totaux (global et par statut) viennent des comptes renvoyés par l’API pour les cinq statuts : ils incluent toutes les pages. Chaque colonne charge 20 cartes, puis propose « Charger plus ». La liste reste accessible pour consulter ou modifier les autres champs.

Le sélecteur de statut d’une carte enregistre un `PATCH /api/applications/:id` contenant uniquement `status`, via les contrôles de propriétaire existants. Le tableau est rechargé après confirmation du serveur ; en cas d’échec, la carte conserve son ancien statut et une erreur est affichée. Le déplacement se fait au clavier comme à la souris via ce sélecteur. Aucun ordre manuel des cartes n’est enregistré.

« Actualiser le suivi » recharge les colonnes et leurs totaux, notamment après un changement depuis un autre onglet. Les compteurs sont lus séparément et ne constituent pas un instantané transactionnel entre plusieurs clients. Aucun endpoint, dépendance ni migration supplémentaire.
## Intégration et CI

Le workflow [CI](.github/workflows/ci.yml) s’exécute sur les PR et les pushs vers main, avec lancement manuel possible. Il installe le lockfile, génère Prisma, applique les migrations sur PostgreSQL 17 isolé, puis lance `npm run check` et `npm run test:db`. Le build web n’est archivé qu’après réussite de tous les contrôles ; aucune donnée ni variable de production n’est requise.

Le test `journey.integration.cjs` ajoute un parcours JWT → CRUD → pagination multi-pages → changement de statut → compteurs Kanban → reconnexion, avec vérification de l’isolation entre deux comptes et nettoyage des données temporaires. Il exige une base de test migrée et le build API.

La [préparation du déploiement](docs/DEPLOYMENT.md) décrit les variables, HTTPS/proxy, migrations, contrôles de santé et retour arrière. La livraison vers un hébergeur attend le choix d’une cible et les accès correspondants.