# CI/CD Pipeline - Keeper Payment

## 🚀 Pipeline de Déploiement Continu

Ce document décrit la configuration CI/CD pour l'application Keeper Payment.

## 📋 Vue d'ensemble

### Workflow GitHub Actions
- **Tests** : Unitaires, E2E, et de sécurité
- **Linting** : ESLint + Prettier
- **Build** : Compilation TypeScript
- **Déploiement** : Automatique sur Render (main branch)

### Services Configurés
- **Base de données** : PostgreSQL 15 (CI)
- **Cache** : npm dependencies
- **Monitoring** : Codecov pour la couverture

## 🔧 Configuration

### Fichiers de Configuration

#### 1. `.github/workflows/ci.yml`
```yaml
# Pipeline principal
- Tests unitaires et E2E
- Audit de sécurité
- Build de production
- Déploiement automatique
```

#### 2. `render.yaml`
```yaml
# Configuration Render
- Base de données PostgreSQL
- Service web Node.js
- Variables d'environnement
- Health checks
```

#### 3. `package.json`
```json
# Scripts de build et test
- npm ci (installation propre)
- npm run build
- npm test
- npm run lint
```

## 🛠️ Résolution des Problèmes

### Erreur : npm ci EUSAGE

#### Problème
```
npm error `npm ci` can only install packages when your package.json and package-lock.json are in sync
```

#### Solution
```bash
# 1. Mettre à jour le lock file
npm install

# 2. Commiter les changements
git add package-lock.json
git commit -m "fix: update package-lock.json"

# 3. Pousser les changements
git push origin main
```

#### Prévention
- Toujours utiliser `npm install` après modification de `package.json`
- Ne jamais modifier `package-lock.json` manuellement
- Utiliser `npm ci` en CI/CD pour des builds reproductibles

### Erreur : Tests Failed

#### Problème
```
Tests failing due to missing environment variables
```

#### Solution
```bash
# 1. Vérifier les variables d'environnement
# 2. S'assurer que la base de données est accessible
# 3. Vérifier les mocks Stripe
```

#### Configuration des Variables
```yaml
# Dans .github/workflows/ci.yml
env:
  NODE_ENV: test
  DATABASE_URL: postgresql://postgres:postgres@localhost:5432/keeper_payment_test
  STRIPE_SECRET_KEY: sk_test_dummy
  STRIPE_WEBHOOK_SECRET: whsec_dummy
  API_URL: http://localhost:3000
  JWT_SECRET: test_secret
  RABBITMQ_URL: amqp://localhost
```

### Erreur : Build Failed

#### Problème
```
TypeScript compilation errors
```

#### Solution
```bash
# 1. Vérifier les erreurs TypeScript
npm run build

# 2. Corriger les erreurs de type
# 3. Vérifier les imports

# 4. Relancer les tests
npm test
```

## 🔍 Monitoring

### Métriques de Qualité

#### Couverture de Code
- **Seuil minimum** : 80% lignes, 70% branches
- **Rapport** : Généré automatiquement
- **Upload** : Vers Codecov

#### Tests
- **Unitaires** : Jest
- **E2E** : Supertest + PostgreSQL
- **Sécurité** : Audit npm + tests dédiés

#### Performance
- **Build time** : < 5 minutes
- **Test time** : < 3 minutes
- **Deploy time** : < 10 minutes

### Logs et Debugging

#### GitHub Actions
```bash
# Voir les logs en temps réel
# Dans l'onglet Actions de GitHub
```

#### Render
```bash
# Voir les logs de déploiement
# Dans le dashboard Render
```

## 🔒 Sécurité

### Audit Automatique
```bash
# Audit des dépendances
npm audit --audit-level=moderate

# Tests de sécurité
npm test -- --testPathPattern="security-test"
```

### Variables Sensibles
- **GitHub Secrets** : `RENDER_SERVICE_ID`, `RENDER_API_KEY`
- **Render Variables** : `STRIPE_SECRET_KEY`, `JWT_SECRET`
- **Jamais commitées** : Clés de production

## 🚀 Déploiement

### Processus Automatique
1. **Push sur main** → Déclenche le pipeline
2. **Tests** → Vérification de la qualité
3. **Build** → Compilation de production
4. **Deploy** → Déploiement sur Render

### Rollback
```bash
# Via dashboard Render
# Ou via GitHub Actions
```

### Déploiement Manuel
```bash
# Via Render CLI
render deploy

# Ou via dashboard Render
```

## 📊 Métriques de Performance

### Temps d'Exécution
- **Installation** : ~30 secondes
- **Tests** : ~2 minutes
- **Build** : ~1 minute
- **Déploiement** : ~5 minutes

### Optimisations
- **Cache npm** : Réutilisation des dépendances
- **Parallélisation** : Jobs indépendants
- **Base de données** : Service PostgreSQL dédié

## 🐛 Dépannage

### Problèmes Courants

#### 1. Cache npm corrompu
```bash
# Solution
npm cache clean --force
```

#### 2. Base de données non accessible
```bash
# Vérifier la configuration PostgreSQL
# S'assurer que le service est démarré
```

#### 3. Tests flaky
```bash
# Ajouter des timeouts
# Améliorer l'isolation des tests
```

#### 4. Déploiement échoué
```bash
# Vérifier les variables d'environnement
# Consulter les logs Render
```

### Commandes Utiles

```bash
# Tests locaux
npm test

# Build local
npm run build

# Lint local
npm run lint

# Tests E2E locaux
npm run test:e2e

# Vérifier les vulnérabilités
npm audit
```

## 📞 Support

### Ressources
- **GitHub Actions** : [docs.github.com/actions](https://docs.github.com/actions)
- **Render** : [docs.render.com](https://docs.render.com)
- **Jest** : [jestjs.io](https://jestjs.io)

### Contacts
- **Issues** : Via GitHub Issues
- **Support** : Via dashboard Render
- **Documentation** : Ce fichier et DEPLOYMENT.md

---

**🎉 Votre pipeline CI/CD est maintenant opérationnel !**
