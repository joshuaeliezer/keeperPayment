# Guide de Déploiement - Render

## 🚀 Déploiement sur Render

Ce guide explique comment déployer l'application de paiements Keeper Payment sur Render.

## 📋 Prérequis

- Compte Render (gratuit)
- Clés API Stripe (production)
- Variables d'environnement configurées

## 🔧 Configuration

### 1. Variables d'Environnement Requises

Configurez ces variables dans votre dashboard Render :

#### Variables Obligatoires
```bash
NODE_ENV=production
PORT=3000
DATABASE_URL=<fourni automatiquement par Render>
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
API_URL=https://votre-app.onrender.com
JWT_SECRET=<généré automatiquement>
```

#### Variables Optionnelles
```bash
RABBITMQ_URL=amqp://localhost
JWT_EXPIRES_IN=24h
CORS_ORIGIN=*
LOG_LEVEL=info
```

### 2. Configuration de la Base de Données

La base de données PostgreSQL est automatiquement créée par Render avec :
- **Nom** : `keeper_payment`
- **Utilisateur** : `keeper_payment_user`
- **Plan** : Free (limité à 1GB)

## 🛠️ Déploiement

### Méthode 1 : Via Git (Recommandée)

1. **Connectez votre repository GitHub**
   - Allez sur [render.com](https://render.com)
   - Cliquez "New" → "Web Service"
   - Connectez votre repo GitHub

2. **Configuration du service**
   - **Name** : `keeper-payment-api`
   - **Environment** : `Node`
   - **Build Command** : `npm install && npm run build`
   - **Start Command** : `npm run start:prod`
   - **Plan** : Free

3. **Variables d'environnement**
   - Ajoutez toutes les variables listées ci-dessus
   - `DATABASE_URL` est automatiquement fourni

### Méthode 2 : Via render.yaml (Blue/Green)

1. **Déployez avec le fichier render.yaml**
   ```bash
   # Dans votre dashboard Render
   New → Blueprint
   # Connectez votre repo et déployez
   ```

2. **Configuration automatique**
   - Base de données créée automatiquement
   - Variables d'environnement configurées
   - Health checks activés

## 🔍 Monitoring et Health Checks

### Endpoint de Health Check
```
GET /health
```

**Réponse attendue :**
```json
{
  "status": "ok",
  "timestamp": "2025-08-16T14:00:00.000Z",
  "uptime": 3600
}
```

### Logs
- Accessibles via le dashboard Render
- Niveau de log configurable via `LOG_LEVEL`
- Rotation automatique des logs

## 🔒 Sécurité

### Headers de Sécurité Configurés
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy` (configuré pour Stripe)

### Variables Sensibles
- `STRIPE_SECRET_KEY` : Clé secrète Stripe
- `STRIPE_WEBHOOK_SECRET` : Secret webhook Stripe
- `JWT_SECRET` : Clé JWT (générée automatiquement)

## 📊 Métriques et Performance

### Plan Free Limitations
- **CPU** : 0.1 vCPU
- **RAM** : 512 MB
- **Stockage** : 1 GB
- **Base de données** : 1 GB
- **Bandwidth** : 100 GB/mois

### Optimisations
- **Auto-scaling** : 0-1 instances
- **Sleep mode** : Après 15 minutes d'inactivité
- **Cold start** : ~30 secondes

## 🔄 Mise à Jour

### Déploiement Automatique
- Activé par défaut
- Déploie à chaque push sur `main`
- Rollback automatique en cas d'échec

### Déploiement Manuel
```bash
# Via dashboard Render
# Ou via CLI Render
render deploy
```

## 🐛 Dépannage

### Problèmes Courants

#### 1. Build Failed
```bash
# Vérifiez les logs de build
# Assurez-vous que package.json est correct
# Vérifiez les dépendances
```

#### 2. Application ne démarre pas
```bash
# Vérifiez les variables d'environnement
# Consultez les logs d'application
# Testez localement avec les mêmes variables
```

#### 3. Base de données non connectée
```bash
# Vérifiez DATABASE_URL
# Assurez-vous que la DB est créée
# Vérifiez les migrations
```

#### 4. Health Check Failed
```bash
# Vérifiez que l'endpoint /health répond
# Consultez les logs d'application
# Vérifiez la configuration du port
```

### Commandes Utiles

```bash
# Vérifier les logs
render logs

# Redémarrer le service
render restart

# Vérifier le statut
render status
```

## 📞 Support

- **Documentation Render** : [docs.render.com](https://docs.render.com)
- **Support** : Via dashboard Render
- **Community** : [Discord Render](https://discord.gg/render)

## 🎯 Prochaines Étapes

1. **Monitoring avancé** : Intégrer des outils comme Sentry
2. **CI/CD** : Configurer GitHub Actions
3. **Backup** : Configurer les sauvegardes automatiques
4. **Scaling** : Passer au plan payant si nécessaire

---

**🎉 Votre application est maintenant déployée sur Render !**
