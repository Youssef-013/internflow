# Préparation du déploiement

La CI vérifie chaque PR et push sur main : installation reproductible via npm ci, génération Prisma, migrations sur PostgreSQL 17 temporaire, schéma/types/builds/tests, puis intégration réelle. Le build web validé est conservé 7 jours. Les actions sont épinglées à des commits, le jeton est en lecture seule et aucun secret de production n’est utilisé. Activer « CI / verify » comme contrôle obligatoire dans les règles de branche si souhaité.

Aucune publication vers un hébergeur n’est configurée. Avant de créer une étape CD, choisir la cible, obtenir les accès et définir la procédure de retour arrière. Une CI verte ne constitue pas un déploiement.

## Configuration de production

- Node.js compatible avec engines ; npm ci puis npm run db:generate et npm run build. Ne pas copier node_modules depuis Windows vers Linux. Pour cette première livraison, conserver les dépendances requises par la génération/migration Prisma.
- PostgreSQL privé, sauvegardes restaurables et DATABASE_URL fourni par le gestionnaire de secrets. La configuration compose locale n’est pas une configuration de production.
- JWT_SECRET privé aléatoire, au moins 32 octets ; NODE_ENV=production, PORT défini. HOST=0.0.0.0 seulement si nécessaire pour le réseau de la cible. Ne jamais publier .env ou injecter ces valeurs dans le bundle web.
- Démarrer avec npm run start -w @internflow/api. Servir apps/web/dist avec un serveur statique et un reverse proxy /api vers NestJS, sous la même origine HTTPS. Préserver Authorization ; ne pas mettre en cache /api ni journaliser les mots de passe/jetons. Prévoir le fallback index.html pour le web.
- Exécuter npm run db:migrate une seule fois par livraison, avec les variables injectées et un .env vide local si les scripts l’exigent. Sauvegarder avant migration ; ne pas utiliser migrate dev en production.
- Vérifier GET /api/health puis GET /api/health/ready avant d’envoyer du trafic. Prévoir les signaux d’arrêt, la supervision et les journaux filtrés.
- Avant plusieurs instances, rendre la limite des tentatives de connexion partagée. L’API actuelle ne fait pas confiance aux IP transmises par un proxy : dimensionner la protection au niveau de la passerelle et valider ce point sur la cible.

## Validation et retour arrière

Sur une base de test uniquement : npm run check puis npm run test:db. Les tests d’intégration écrivent et nettoient leurs comptes temporaires. Valider ensuite dans un navigateur inscription/connexion, CRUD, changement de statut, reconnexion et isolation entre deux comptes, sur ordinateur et mobile.

Conserver les artefacts et le commit de la version précédente. Revenir au build précédent seulement si le schéma est compatible ; sinon appliquer un correctif de migration ou la procédure de restauration testée. Aucune migration destructive n’est ajoutée par ce jalon.
