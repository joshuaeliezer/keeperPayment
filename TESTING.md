# Testing Guide - Keeper Payment Application

Ce document décrit la stratégie de tests pour l'application Keeper Payment, incluant les tests unitaires, d'intégration et les bonnes pratiques.

## 📋 Table des matières

- [Types de tests](#types-de-tests)
- [Structure des tests](#structure-des-tests)
- [Exécution des tests](#exécution-des-tests)
- [Couverture de code](#couverture-de-code)
- [Bonnes pratiques](#bonnes-pratiques)
- [Dépannage](#dépannage)

## 🧪 Types de tests

### Tests unitaires
- **Localisation**: `src/**/*.spec.ts`
- **Objectif**: Tester les fonctions et méthodes individuelles
- **Framework**: Jest + NestJS Testing Module
- **Exécution**: `npm test`

### Tests d'intégration (E2E)
- **Localisation**: `test/*.e2e-spec.ts`
- **Objectif**: Tester les endpoints API et l'intégration des composants
- **Framework**: Jest + Supertest
- **Exécution**: `npm run test:e2e`

### Tests de validation DTO
- **Localisation**: `src/**/dto/*.spec.ts`
- **Objectif**: Valider les schémas de données d'entrée
- **Framework**: class-validator
- **Exécution**: `npm test`

## 📁 Structure des tests

```
payments/
├── src/
│   ├── payments/
│   │   ├── payments.service.spec.ts      # Tests unitaires du service
│   │   ├── payments.controller.spec.ts   # Tests unitaires du contrôleur
│   │   └── dto/
│   │       └── create-payment.dto.spec.ts # Tests de validation DTO
│   ├── stripe/
│   │   ├── stripe.service.spec.ts        # Tests unitaires du service Stripe
│   │   └── dto/
│   │       └── create-keeper-account.dto.spec.ts
│   └── app.controller.spec.ts            # Tests du contrôleur principal
├── test/
│   ├── payments.e2e-spec.ts              # Tests d'intégration
│   ├── jest-e2e.json                     # Configuration Jest E2E
│   └── test-setup.ts                     # Configuration des tests
└── scripts/
    └── test.sh                           # Script d'exécution des tests
```

## 🚀 Exécution des tests

### Commandes disponibles

```bash
# Tests unitaires
npm test

# Tests unitaires en mode watch
npm run test:watch

# Tests unitaires avec couverture
npm run test:cov

# Tests d'intégration
npm run test:e2e

# Tests de debug
npm run test:debug

# Exécution complète avec script personnalisé
chmod +x scripts/test.sh
./scripts/test.sh
```

### Variables d'environnement pour les tests

Créez un fichier `.env.test` avec les configurations suivantes :

```env
NODE_ENV=test
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USERNAME=test_user
DATABASE_PASSWORD=test_password
DATABASE_NAME=keeper_payment_test
STRIPE_SECRET_KEY=sk_test_dummy_key_for_testing
STRIPE_WEBHOOK_SECRET=whsec_test_dummy_secret
RABBITMQ_URL=amqp://localhost:5672
API_URL=http://localhost:3000
PORT=3001
LOG_LEVEL=error
```

## 📊 Couverture de code

### Objectifs de couverture
- **Lignes de code**: ≥ 80%
- **Branches**: ≥ 70%
- **Fonctions**: ≥ 90%
- **Statements**: ≥ 80%

### Génération du rapport
```bash
npm run test:cov
```

Le rapport de couverture sera généré dans `coverage/lcov-report/index.html`

## ✅ Bonnes pratiques

### Tests unitaires

1. **Nommage des tests**
   ```typescript
   describe('PaymentsService', () => {
     describe('createPayment', () => {
       it('should create a payment successfully', async () => {
         // test implementation
       });
       
       it('should handle Stripe API errors', async () => {
         // test implementation
       });
     });
   });
   ```

2. **Structure AAA (Arrange, Act, Assert)**
   ```typescript
   it('should create payment successfully', async () => {
     // Arrange
     const createPaymentDto = { /* ... */ };
     const expectedResult = { /* ... */ };
     
     // Act
     const result = await service.createPayment(createPaymentDto);
     
     // Assert
     expect(result).toEqual(expectedResult);
   });
   ```

3. **Mocking des dépendances**
   ```typescript
   const mockStripeService = {
     createPaymentIntent: jest.fn(),
     createKeeperAccount: jest.fn(),
   };
   ```

### Tests d'intégration

1. **Nettoyage de la base de données**
   ```typescript
   beforeEach(async () => {
     await paymentsRepository.clear();
   });
   ```

2. **Validation des réponses HTTP**
   ```typescript
   const response = await request(app.getHttpServer())
     .post('/payments')
     .send(createPaymentDto)
     .expect(201);
   ```

3. **Test des cas d'erreur**
   ```typescript
   it('should return 400 for invalid data', async () => {
     const response = await request(app.getHttpServer())
       .post('/payments')
       .send(invalidDto)
       .expect(400);
   });
   ```

### Tests de validation DTO

1. **Test des contraintes de validation**
   ```typescript
   it('should fail validation with invalid UUID', async () => {
     const dto = new CreatePaymentDto();
     dto.reservationId = 'invalid-uuid';
     
     const errors = await validate(dto);
     expect(errors).toHaveLength(1);
   });
   ```

2. **Test des cas limites**
   ```typescript
   it('should pass validation with zero amount', async () => {
     const dto = new CreatePaymentDto();
     dto.amountTotal = 0;
     
     const errors = await validate(dto);
     expect(errors).toHaveLength(0);
   });
   ```

## 🔧 Dépannage

### Problèmes courants

1. **Erreur de connexion à la base de données**
   ```bash
   # Vérifiez que PostgreSQL est démarré
   sudo service postgresql start
   
   # Créez la base de données de test
   createdb keeper_payment_test
   ```

2. **Erreur de timeout dans les tests E2E**
   ```typescript
   // Augmentez le timeout dans test-setup.ts
   jest.setTimeout(30000);
   ```

3. **Erreur de mock Stripe**
   ```typescript
   // Assurez-vous que le mock est correctement configuré
   jest.mock('stripe', () => {
     return jest.fn(() => mockStripe);
   });
   ```

### Debug des tests

```bash
# Mode debug pour les tests unitaires
npm run test:debug

# Mode debug pour les tests E2E
node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand --config ./test/jest-e2e.json
```

## 📈 Métriques de qualité

### Indicateurs de qualité
- **Temps d'exécution des tests**: < 30 secondes
- **Couverture de code**: ≥ 80%
- **Tests qui échouent**: 0
- **Tests en attente**: 0

### Intégration continue
Les tests sont automatiquement exécutés dans le pipeline CI/CD avec les vérifications suivantes :
- Tests unitaires
- Tests d'intégration
- Couverture de code
- Linting
- Build de production

## 🤝 Contribution

Lors de l'ajout de nouvelles fonctionnalités :

1. **Écrivez les tests en premier** (TDD)
2. **Assurez une couverture de 80% minimum**
3. **Testez les cas d'erreur**
4. **Documentez les nouveaux tests**
5. **Vérifiez que tous les tests passent**

### Template pour nouveaux tests

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { YourService } from './your.service';

describe('YourService', () => {
  let service: YourService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [YourService],
    }).compile();

    service = module.get<YourService>(YourService);
  });

  describe('yourMethod', () => {
    it('should do something successfully', async () => {
      // Arrange
      
      // Act
      
      // Assert
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      
      // Act & Assert
    });
  });
});
```
