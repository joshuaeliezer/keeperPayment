# 🚀 Guide de Démarrage Rapide - Keeper Payment

## ⚡ Installation Express (5 minutes)

### 1. Prérequis
```bash
# Vérifier que vous avez Node.js 18+
node --version

# Vérifier que Docker est installé
docker --version
docker-compose --version
```

### 2. Cloner et installer
```bash
# Cloner le projet
git clone <repository-url>
cd keeperPayment/payments

# Installer les dépendances
npm install
```

### 3. Configuration rapide
```bash
# Copier le fichier d'exemple
cp env.example .env

# Éditer les variables essentielles
# Ouvrir .env et modifier :
# - STRIPE_SECRET_KEY (obtenir sur stripe.com)
# - STRIPE_WEBHOOK_SECRET (obtenir sur stripe.com)
```

### 4. Démarrer les services
```bash
# Démarrer PostgreSQL et RabbitMQ
docker-compose up -d postgres rabbitmq

# Vérifier que les services sont démarrés
docker-compose ps
```

### 5. Lancer l'application
```bash
# Mode développement
npm run start:dev

# L'application sera disponible sur http://localhost:3000
```

## 🧪 Test rapide

### 1. Vérifier que l'API fonctionne
```bash
# Test de santé
curl http://localhost:3000/health

# Réponse attendue :
# {"status":"ok","timestamp":"...","uptime":...}
```

### 2. Créer un paiement de test
```bash
curl -X POST http://localhost:3000/payments \
  -H "Content-Type: application/json" \
  -d '{
    "reservationId": "123e4567-e89b-12d3-a456-426614174000",
    "amountTotal": 1000,
    "keeperId": "acct_test_keeper_id"
  }'
```

## 🔧 Configuration Stripe (Obligatoire)

### 1. Créer un compte Stripe
- Allez sur [stripe.com](https://stripe.com)
- Créez un compte développeur (gratuit)

### 2. Obtenir les clés API
```bash
# Dans le dashboard Stripe > Developers > API keys
# Copiez la "Secret key" (commence par sk_test_...)
# Ajoutez-la dans votre .env :
STRIPE_SECRET_KEY=sk_test_votre_cle_secrete
```

### 3. Configurer le webhook
```bash
# Dans le dashboard Stripe > Developers > Webhooks
# Cliquez "Add endpoint"
# URL : http://localhost:3000/payments/webhooks/stripe
# Événements : payment_intent.succeeded, payment_intent.payment_failed
# Copiez le "Signing secret" (commence par whsec_...)
# Ajoutez-le dans votre .env :
STRIPE_WEBHOOK_SECRET=whsec_votre_secret_webhook
```

## 📱 Utilisation de base

### Endpoints principaux

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| `GET` | `/health` | Vérifier la santé de l'API |
| `POST` | `/payments` | Créer un nouveau paiement |
| `GET` | `/payments` | Lister tous les paiements |
| `GET` | `/payments/{id}` | Récupérer un paiement |
| `POST` | `/payments/keeper/account` | Créer un compte keeper |

### Exemple de création de paiement
```javascript
// Frontend JavaScript
const response = await fetch('http://localhost:3000/payments', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    reservationId: 'uuid-de-la-reservation',
    amountTotal: 1000, // 10.00 EUR en centimes
    keeperId: 'acct_stripe_keeper_id'
  })
});

const payment = await response.json();
console.log(payment.clientSecret); // Pour Stripe Elements
```

## 🐛 Problèmes courants

### L'application ne démarre pas
```bash
# Vérifier les variables d'environnement
cat .env

# Vérifier que PostgreSQL est démarré
docker-compose ps postgres

# Vérifier les logs
docker-compose logs postgres
```

### Erreur Stripe
```bash
# Vérifier que la clé API est correcte
echo $STRIPE_SECRET_KEY

# Tester la connexion Stripe
curl -H "Authorization: Bearer $STRIPE_SECRET_KEY" \
  https://api.stripe.com/v1/account
```

### Base de données non accessible
```bash
# Redémarrer PostgreSQL
docker-compose restart postgres

# Vérifier la connexion
docker-compose exec postgres psql -U postgres -d payments
```

## 📚 Prochaines étapes

1. **Lire la documentation complète** : `docs.md`
2. **Configurer les tests** : `TESTING.md`
3. **Déployer en production** : `DEPLOYMENT.md`
4. **Configurer CI/CD** : `CI-CD.md`

## 🆘 Besoin d'aide ?

- **Documentation complète** : `docs.md`
- **Tests** : `npm test`
- **Logs** : `docker-compose logs -f`
- **Issues** : Créez une issue sur GitHub

---

**🎉 Félicitations ! Votre API de paiement est maintenant opérationnelle !**
