# InternFlow

Suivi personnel des candidatures de stage. Monorepo React TypeScript / NestJS / PostgreSQL / Prisma.

## État

Socle applicatif, page d'accueil et endpoints de santé disponibles. JWT, CRUD, dashboard et Kanban sont planifiés : voir [PROJECT_STATUS.md](PROJECT_STATUS.md).

## Démarrage local

Prérequis : Node.js 22.14+ (branche 22) ou 24+, npm et Docker avec son moteur lancé.

1. Copier `.env.example` vers `.env`. Remplacer le mot de passe dans `POSTGRES_PASSWORD` **et** `DATABASE_URL` (encoder les caractères spéciaux dans l'URL). Ne jamais publier `.env`.
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
