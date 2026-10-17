# InternFlow

Suivi personnel des candidatures de stage. Monorepo React TypeScript / NestJS / PostgreSQL / Prisma.

## État

Socle applicatif, page d'accueil et endpoints de santé disponibles. Authentification JWT validée ; CRUD, dashboard et Kanban planifiés : voir [PROJECT_STATUS.md](PROJECT_STATUS.md).

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
