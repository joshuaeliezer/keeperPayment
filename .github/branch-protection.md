# Configuration des Branches Protégées

Ce guide explique comment configurer les branches protégées pour maintenir la qualité du code.

## 🛡️ Branches à protéger

### Branche `main`
- **Protection requise** : ✅
- **Reviews requises** : ✅ (2 reviewers minimum)
- **Status checks requis** : ✅
- **Conversation résolue** : ✅
- **Mise à jour des branches** : ✅

### Branche `develop`
- **Protection requise** : ✅
- **Reviews requises** : ✅ (1 reviewer minimum)
- **Status checks requis** : ✅
- **Conversation résolue** : ✅
- **Mise à jour des branches** : ✅

## ⚙️ Configuration GitHub

### 1. Aller dans les paramètres du repository
1. Allez dans votre repository GitHub
2. Cliquez sur **Settings**
3. Dans le menu de gauche, cliquez sur **Branches**

### 2. Ajouter une règle de protection
1. Cliquez sur **Add rule**
2. Dans **Branch name pattern**, entrez `main`
3. Configurez les options suivantes :

#### Options de base
- ✅ **Require a pull request before merging**
- ✅ **Require approvals** : 2
- ✅ **Dismiss stale PR approvals when new commits are pushed**
- ✅ **Require review from code owners**

#### Status checks
- ✅ **Require status checks to pass before merging**
- ✅ **Require branches to be up to date before merging**
- Sélectionnez les checks suivants :
  - `ci / test (18.x)`
  - `ci / test (20.x)`
  - `code-quality / quality`

#### Autres options
- ✅ **Require conversation resolution before merging**
- ✅ **Require signed commits**
- ✅ **Require linear history**
- ✅ **Include administrators**

### 3. Répéter pour `develop`
1. Créez une nouvelle règle pour `develop`
2. Même configuration mais avec 1 reviewer au lieu de 2

## 📋 Status Checks requis

### Checks obligatoires
- `ci / test (18.x)` - Tests sur Node.js 18
- `ci / test (20.x)` - Tests sur Node.js 20
- `code-quality / quality` - Qualité de code
- `security / security` - Scan de sécurité

### Checks optionnels
- `deploy / deploy` - Déploiement (seulement pour main)

## 🔒 Code Owners

Créez un fichier `.github/CODEOWNERS` :

```markdown
# Code Owners
# Ces personnes seront automatiquement assignées aux PRs

# Tous les fichiers
* @your-username

# Backend spécifique
/src/ @backend-team

# Tests
/test/ @qa-team

# Configuration
*.yml @devops-team
*.yaml @devops-team
```

## 📝 Workflow de développement

### 1. Créer une feature branch
```bash
git checkout develop
git pull origin develop
git checkout -b feature/nouvelle-fonctionnalite
```

### 2. Développer et tester
```bash
# Développer votre fonctionnalité
npm run lint
npm test
npm run format:check
```

### 3. Committer et pousser
```bash
git add .
git commit -m "feat: ajouter nouvelle fonctionnalité"
git push origin feature/nouvelle-fonctionnalite
```

### 4. Créer une Pull Request
1. Allez sur GitHub
2. Cliquez sur **Compare & pull request**
3. Remplissez le template
4. Assignez les reviewers
5. Ajoutez les labels appropriés

### 5. Review et merge
1. Attendez les reviews
2. Corrigez les commentaires si nécessaire
3. Une fois approuvé, mergez dans `develop`

### 6. Release vers main
1. Créez une PR de `develop` vers `main`
2. Attendez les reviews (2 minimum)
3. Mergez dans `main` (déclenche le déploiement)

## 🚨 Gestion des urgences

### Hotfix
```bash
git checkout main
git pull origin main
git checkout -b hotfix/correction-urgente
# Corriger le problème
git commit -m "fix: correction urgente"
git push origin hotfix/correction-urgente
# Créer PR vers main
```

### Bypass temporaire
- Seuls les administrateurs peuvent bypasser les protections
- Utilisez uniquement en cas d'urgence
- Documentez la raison du bypass

## 📊 Monitoring

### Métriques à surveiller
- **Temps moyen de review** : < 24h
- **Taux d'approbation** : > 95%
- **Temps de merge** : < 48h
- **Taux d'échec des checks** : < 5%

### Rapports disponibles
- **Insights** > **Pulse** : Vue d'ensemble des PRs
- **Insights** > **Contributors** : Statistiques des contributeurs
- **Actions** : Historique des workflows

## 🔧 Configuration avancée

### Webhooks
Configurez des webhooks pour :
- Notifications Slack/Discord
- Intégration avec Jira/Linear
- Déploiement automatique

### Actions automatiques
- Auto-assign des reviewers
- Auto-label des PRs
- Auto-merge des dépendances (Dependabot)

## 📚 Ressources

- [GitHub Branch Protection](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/about-protected-branches)
- [GitHub Code Owners](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners)
- [GitHub Status Checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/defining-the-mergeability-of-pull-requests/troubleshooting-required-status-checks) 