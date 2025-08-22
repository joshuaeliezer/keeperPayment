# 📚 Documentation Complète - Keeper Payment

## 🎯 Vue d'ensemble

**Keeper Payment** est un microservice de paiement développé avec NestJS qui gère les transactions financières pour une application de réservation d'espaces. Le service utilise Stripe comme processeur de paiement et PostgreSQL pour le stockage des données.

### 🚀 Fonctionnalités principales

- ✅ Création de paiements via Stripe PaymentIntent
- ✅ Calcul automatique de commission (10%)
- ✅ Gestion des comptes Stripe pour les "keepers" (propriétaires)
- ✅ Webhooks Stripe pour les événements de paiement
- ✅ Transfert automatique vers les comptes des keepers
- ✅ Notifications via RabbitMQ
- ✅ API REST complète
- ✅ Tests unitaires et d'intégration
- ✅ Déploiement automatisé sur Render

## 🏗️ Architecture

### Structure du projet
```
payments/
├── src/
│   ├── payments/           # Module principal des paiements
│   │   ├── dto/           # Data Transfer Objects
│   │   ├── entities/      # Entités TypeORM
│   │   ├── payments.controller.ts
│   │   ├── payments.service.ts
│   │   └── payments.module.ts
│   ├── stripe/            # Module Stripe
│   │   ├── dto/
│   │   ├── stripe.service.ts
│   │   └── stripe.module.ts
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── app.module.ts
│   └── main.ts
├── test/                  # Tests d'intégration
├── scripts/              # Scripts utilitaires
├── docker-compose.yml    # Configuration Docker
├── Dockerfile           # Image Docker
└── package.json
```

### Technologies utilisées

| Composant | Technologie | Version |
|-----------|-------------|---------|
| **Framework** | NestJS | ^10.0.0 |
| **Base de données** | PostgreSQL | 15-alpine |
| **ORM** | TypeORM | ^0.3.0 |
| **Processeur de paiement** | Stripe | ^14.0.0 |
| **Message Broker** | RabbitMQ | 3-management |
| **Tests** | Jest + Supertest | ^29.5.0 |
| **Containerisation** | Docker | 3.8 |
| **Déploiement** | Render | - |

## 🛠️ Installation et Configuration

### Prérequis

- **Node.js** : v18+ (recommandé)
- **Docker** : v20+ et Docker Compose
- **Git** : Pour cloner le repository
- **Compte Stripe** : Pour les paiements en production

### Option 1 : Installation Locale

#### 1. Cloner le repository
```bash
git clone <repository-url>
cd keeperPayment/payments
```

#### 2. Installer les dépendances
```bash
npm install
```

#### 3. Configuration des variables d'environnement

Créez un fichier `.env` à la racine du projet :

```env
# ===== BASE DE DONNÉES =====
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=payments

# ===== STRIPE =====
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret

# ===== RABBITMQ =====
RABBITMQ_URL=amqp://localhost:5672

# ===== APPLICATION =====
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000

# ===== OPTIONNEL =====
LOG_LEVEL=debug
CORS_ORIGIN=*
```

#### 4. Démarrer les services externes

**Avec Docker Compose (recommandé) :**
```bash
# Démarrer PostgreSQL et RabbitMQ
docker-compose up -d postgres rabbitmq

# Vérifier que les services sont démarrés
docker-compose ps
```

**Ou installation manuelle :**
```bash
# PostgreSQL
sudo apt-get install postgresql postgresql-contrib
sudo -u postgres createdb payments

# RabbitMQ
sudo apt-get install rabbitmq-server
sudo systemctl start rabbitmq-server
```

#### 5. Démarrer l'application
```bash
# Mode développement
npm run start:dev

# Mode production
npm run build
npm run start:prod
```

### Option 2 : Installation avec Docker

#### 1. Cloner et configurer
```bash
git clone <repository-url>
cd keeperPayment/payments
cp .env.example .env
# Éditer .env avec vos variables
```

#### 2. Démarrer tous les services
```bash
docker-compose up -d
```

#### 3. Vérifier le statut
```bash
docker-compose ps
docker-compose logs -f app
```

## 🔧 Configuration Stripe

### 1. Créer un compte Stripe
- Allez sur [stripe.com](https://stripe.com)
- Créez un compte développeur
- Accédez au dashboard

### 2. Obtenir les clés API
```bash
# Dans le dashboard Stripe
# Clés secrètes (sk_test_... pour les tests)
# Clés publiques (pk_test_... pour le frontend)
```

### 3. Configurer le webhook
```bash
# Dans le dashboard Stripe > Webhooks
# URL : https://votre-domaine.com/payments/webhooks/stripe
# Événements : payment_intent.succeeded, payment_intent.payment_failed
```

### 4. Variables d'environnement Stripe
```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

## 📡 API Reference

### Base URL
```
http://localhost:3000
```

### Endpoints

#### 1. Créer un paiement
```http
POST /payments
Content-Type: application/json

{
  "reservationId": "uuid-de-la-reservation",
  "amountTotal": 1000,
  "keeperId": "acct_stripe_keeper_id"
}
```

**Réponse :**
```json
{
  "id": "payment-uuid",
  "reservationId": "uuid-de-la-reservation",
  "stripePaymentId": "pi_stripe_id",
  "amountTotal": 1000,
  "commissionAmount": 100,
  "keeperAmount": 900,
  "status": "pending",
  "clientSecret": "pi_stripe_client_secret"
}
```

#### 2. Récupérer un paiement
```http
GET /payments/{id}
```

#### 3. Lister tous les paiements
```http
GET /payments
```

#### 4. Filtrer par statut
```http
GET /payments/status/{status}
# status: pending, paid, failed, refunded
```

#### 5. Créer un compte keeper
```http
POST /payments/keeper/account
Content-Type: application/json

{
  "email": "keeper@example.com"
}
```

#### 6. Obtenir le lien d'onboarding
```http
GET /payments/keeper/account/{id}/link
```

#### 7. Webhook Stripe
```http
POST /payments/webhooks/stripe
```

## 🗄️ Base de données

### Schéma de la table `payments`

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL,
  stripe_payment_id TEXT,
  amount_total INTEGER NOT NULL,
  commission_amount INTEGER NOT NULL,
  keeper_amount INTEGER NOT NULL,
  status TEXT CHECK (status IN ('pending', 'paid', 'failed', 'refunded')) DEFAULT 'pending',
  paid_at TIMESTAMP,
  keeper_stripe_account_id TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Index recommandés
```sql
CREATE INDEX idx_payments_reservation_id ON payments(reservation_id);
CREATE INDEX idx_payments_status ON payments(status);
CREATE INDEX idx_payments_keeper_account ON payments(keeper_stripe_account_id);
CREATE INDEX idx_payments_created_at ON payments(created_at);
```

## 🧪 Tests

### Exécution des tests
```bash
# Tests unitaires
npm test

# Tests avec couverture
npm run test:cov

# Tests d'intégration
npm run test:e2e

# Tests de performance
npm run test:performance

# Tous les tests
npm run test:full
```

### Configuration des tests
```bash
# Variables d'environnement pour les tests
NODE_ENV=test
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/payments_test
STRIPE_SECRET_KEY=sk_test_dummy
```

### Couverture de code
- **Seuil minimum** : 80% lignes, 70% branches
- **Rapport** : Généré dans `coverage/`
- **Format** : HTML, LCOV

## 🚀 Déploiement

### Déploiement sur Render

#### 1. Préparation
```bash
# Vérifier que le code est prêt
npm run test:full
npm run build
```

#### 2. Configuration Render
- Connectez votre repository GitHub
- Créez un nouveau Web Service
- Configurez les variables d'environnement

#### 3. Variables d'environnement Render
```env
NODE_ENV=production
DATABASE_URL=<fourni par Render>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
API_URL=https://votre-app.onrender.com
```

#### 4. Déploiement automatique
- Chaque push sur `main` déclenche un déploiement
- Health checks automatiques
- Rollback en cas d'échec

### Déploiement avec Docker

#### 1. Build de l'image
```bash
docker build -t keeper-payment .
```

#### 2. Démarrage des services
```bash
docker-compose up -d
```

#### 3. Vérification
```bash
curl http://localhost:3000/health
```

## 🔒 Sécurité

### Headers de sécurité
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

### Validation des données
- Validation des DTOs avec class-validator
- Sanitisation des entrées
- Validation des UUIDs

### Gestion des erreurs
- Logs structurés
- Messages d'erreur sécurisés
- Gestion des exceptions Stripe

## 📊 Monitoring

### Health Check
```http
GET /health
```

**Réponse :**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "database": "connected",
  "stripe": "connected"
}
```

### Logs
```bash
# Voir les logs de l'application
docker-compose logs -f app

# Logs avec niveau de détail
LOG_LEVEL=debug npm run start:dev
```

### Métriques
- Temps de réponse des API
- Taux de succès des paiements
- Utilisation de la base de données
- Erreurs Stripe

## 🐛 Dépannage

### Problèmes courants

#### 1. Erreur de connexion à la base de données
```bash
# Vérifier que PostgreSQL est démarré
docker-compose ps postgres

# Vérifier les variables d'environnement
echo $DB_HOST $DB_PORT $DB_DATABASE
```

#### 2. Erreur Stripe
```bash
# Vérifier la clé API
echo $STRIPE_SECRET_KEY

# Tester la connexion Stripe
curl -H "Authorization: Bearer $STRIPE_SECRET_KEY" \
  https://api.stripe.com/v1/account
```

#### 3. Erreur RabbitMQ
```bash
# Vérifier que RabbitMQ est démarré
docker-compose ps rabbitmq

# Accéder à l'interface web
open http://localhost:15672
# guest/guest
```

#### 4. Tests qui échouent
```bash
# Nettoyer et relancer
npm run test:full

# Vérifier la base de données de test
createdb payments_test
```

### Commandes utiles

```bash
# Redémarrer les services
docker-compose restart

# Voir les logs en temps réel
docker-compose logs -f

# Nettoyer les conteneurs
docker-compose down -v

# Rebuild l'image
docker-compose build --no-cache
```

## 📚 Ressources additionnelles

### Documentation technique
- [NestJS Documentation](https://docs.nestjs.com/)
- [Stripe API Reference](https://stripe.com/docs/api)
- [TypeORM Documentation](https://typeorm.io/)
- [Docker Documentation](https://docs.docker.com/)

### Fichiers de configuration
- `package.json` : Dépendances et scripts
- `docker-compose.yml` : Services Docker
- `Dockerfile` : Image Docker
- `tsconfig.json` : Configuration TypeScript
- `.eslintrc.js` : Règles de linting

### Scripts disponibles
```bash
# Développement
npm run start:dev      # Mode développement avec hot reload
npm run start:debug    # Mode debug
npm run start:prod     # Mode production

# Tests
npm test              # Tests unitaires
npm run test:e2e      # Tests d'intégration
npm run test:cov      # Tests avec couverture

# Qualité de code
npm run lint          # Linting
npm run format        # Formatage
npm run format:check  # Vérification du formatage

# Build
npm run build         # Compilation TypeScript
```

## 🤝 Contribution

### Guidelines
1. **Tests** : Écrire des tests pour les nouvelles fonctionnalités
2. **Documentation** : Mettre à jour la documentation
3. **Linting** : Respecter les règles ESLint
4. **Commits** : Utiliser des messages de commit conventionnels

### Workflow de développement
```bash
# 1. Créer une branche
git checkout -b feature/nouvelle-fonctionnalite

# 2. Développer
npm run start:dev

# 3. Tester
npm run test:full

# 4. Commiter
git add .
git commit -m "feat: ajouter nouvelle fonctionnalité"

# 5. Pousser
git push origin feature/nouvelle-fonctionnalite
```

---

## 🎉 Conclusion

Cette documentation couvre tous les aspects du projet Keeper Payment, de l'installation à la production. Le projet est conçu pour être robuste, scalable et facilement déployable.

Pour toute question ou problème, consultez les fichiers de documentation spécifiques :
- `TESTING.md` : Guide complet des tests
- `DEPLOYMENT.md` : Guide de déploiement détaillé
- `CI-CD.md` : Configuration du pipeline CI/CD

**Bonne utilisation ! 🚀**
