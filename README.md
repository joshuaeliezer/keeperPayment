<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="200" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://coveralls.io/github/nestjs/nest?branch=master" target="_blank"><img src="https://coveralls.io/repos/github/nestjs/nest/badge.svg?branch=master#9" alt="Coverage" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

# Microservice de Paiements

Ce microservice NestJS gère les paiements pour une application de réservation d'espaces, utilisant Stripe comme processeur de paiement.

## Fonctionnalités

- Création de paiements via Stripe PaymentIntent
- Calcul automatique de commission (10%)
- Stockage des paiements dans PostgreSQL
- Webhook Stripe pour la gestion des événements de paiement
- Transfert automatique vers les comptes Stripe des keepers
- Notification via RabbitMQ des paiements réussis

## Prérequis

- Node.js (v14+)
- Docker et Docker Compose
- Compte Stripe

## Installation et Démarrage

### Option 1 : Installation Locale

1. Cloner le repository
2. Installer les dépendances :
```bash
npm install
```

3. Configurer les variables d'environnement :
Créez un fichier `.env` à la racine du projet avec les variables suivantes :
```
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=payments

# Stripe
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# Environment
NODE_ENV=development
```

4. Démarrer l'application :
```bash
# Développement
npm run start:dev

# Production
npm run build
npm run start:prod
```

### Option 2 : Installation avec Docker

1. Cloner le repository
2. Créer un fichier `.env` avec les variables d'environnement (voir ci-dessus)
3. Démarrer les services avec Docker Compose :
```bash
docker-compose up -d
```

Les services seront disponibles aux adresses suivantes :
- Application : http://localhost:3000
- PostgreSQL : localhost:5432
- RabbitMQ Management : http://localhost:15672 (guest/guest)

Pour arrêter les services :
```bash
docker-compose down
```

Pour voir les logs :
```bash
docker-compose logs -f
```

## API Endpoints

### Créer un paiement
```http
POST /payments
Content-Type: application/json

{
  "reservationId": "uuid",
  "amountTotal": 1000
}
```

### Webhook Stripe
```http
POST /payments/webhooks/stripe
```

## Structure de la base de données

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY,
  reservation_id UUID NOT NULL,
  stripe_payment_id TEXT,
  amount_total INTEGER,
  commission_amount INTEGER,
  keeper_amount INTEGER,
  status TEXT CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  paid_at TIMESTAMP,
  keeper_stripe_account_id TEXT
);
```

## Configuration Stripe

1. Créez un compte Stripe
2. Obtenez vos clés API dans le dashboard Stripe
3. Configurez le webhook dans le dashboard Stripe pour pointer vers `/payments/webhooks/stripe`
4. Ajoutez la clé secrète du webhook dans votre fichier `.env`

## Configuration RabbitMQ

1. L'interface de gestion RabbitMQ est disponible sur http://localhost:15672
2. Identifiants par défaut : guest/guest
3. Le service utilise la queue `payment_notifications` pour les notifications

## Tests

```bash
# Tests unitaires
npm run test

# Tests e2e
npm run test:e2e
```

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://kamilmysliwiec.com)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](LICENSE).
