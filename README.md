# JIRA Time Logger - Extension Chrome/Edge

Extension de navigateur permettant de logger rapidement le temps de travail sur les issues JIRA Cloud.

## Fonctionnalités

- **Recherche d'issues** : Recherchez par clé (ex: PROJ-123) ou par texte dans le résumé
- **Saisie rapide du temps** : Boutons de temps rapide (15m, 30m, 1h, 2h, 4h, 8h) ou saisie manuelle
- **Sélection de la date** : Loggez sur la date de votre choix
- **Commentaire optionnel** : Ajoutez une description du travail effectué
- **Historique des logs récents** : Consultez vos 10 derniers logs
- **Mémorisation** : Option pour se souvenir de la dernière issue utilisée
- **Menu contextuel** : Clic droit sur une page JIRA pour logger directement

## Installation

### Mode développeur (Chrome)

1. Téléchargez ou clonez ce repository
2. Ouvrez Chrome et allez dans `chrome://extensions/`
3. Activez le "Mode développeur" en haut à droite
4. Cliquez sur "Charger l'extension non empaquetée"
5. Sélectionnez le dossier `src/` de ce projet

### Mode développeur (Edge)

1. Téléchargez ou clonez ce repository
2. Ouvrez Edge et allez dans `edge://extensions/`
3. Activez le "Mode développeur" dans le menu latéral
4. Cliquez sur "Charger l'extension décompressée"
5. Sélectionnez le dossier `src/` de ce projet

## Configuration

1. Après l'installation, cliquez sur l'icône de l'extension
2. Vous serez redirigé vers la page de configuration (ou cliquez sur l'engrenage)
3. Renseignez :
   - **Domaine JIRA** : votre-entreprise.atlassian.net
   - **Email JIRA** : votre email Atlassian
   - **Token API** : votre token API (voir ci-dessous)
4. Cliquez sur "Tester la connexion" pour vérifier
5. Sauvegardez les paramètres

### Obtenir un Token API Atlassian

1. Connectez-vous à [Atlassian Account](https://id.atlassian.com/manage-profile/security/api-tokens)
2. Cliquez sur "Create API token"
3. Donnez un nom au token (ex: "JIRA Time Logger")
4. Copiez le token généré (il ne sera affiché qu'une seule fois)

## Utilisation

1. Cliquez sur l'icône de l'extension dans la barre d'outils
2. Recherchez une issue par sa clé ou son résumé
3. Sélectionnez l'issue dans les résultats
4. Entrez le temps passé (heures et/ou minutes)
5. Optionnel : modifiez la date et ajoutez un commentaire
6. Cliquez sur "Logger le temps"

## Structure du projet

```
src/
├── manifest.json       # Configuration de l'extension
├── popup.html          # Interface principale (popup)
├── options.html        # Page de configuration
├── css/
│   ├── popup.css       # Styles du popup
│   └── options.css     # Styles de la configuration
├── js/
│   ├── popup.js        # Logique du popup
│   ├── options.js      # Logique de la configuration
│   └── background.js   # Service worker
└── icons/
    ├── icon.svg        # Icône source (vectorielle)
    ├── icon16.png      # Icône 16x16
    ├── icon32.png      # Icône 32x32
    ├── icon48.png      # Icône 48x48
    └── icon128.png     # Icône 128x128
```

## Permissions requises

- **storage** : Sauvegarde des paramètres et de l'historique
- **activeTab** : Détection de l'onglet actif pour le menu contextuel
- **contextMenus** : Menu clic droit sur les pages JIRA
- **host_permissions** (*.atlassian.net) : Communication avec l'API JIRA

## Sécurité

- Les credentials sont stockés localement dans le navigateur (chrome.storage.sync)
- Les tokens ne sont jamais transmis à des serveurs tiers
- Toutes les communications avec JIRA utilisent HTTPS
- Le token API a des permissions limitées contrairement au mot de passe

## Personnalisation des icônes

Les icônes placeholder peuvent être remplacées par des icônes personnalisées :

1. Modifiez `src/icons/icon.svg`
2. Convertissez en PNG aux tailles requises (16, 32, 48, 128)
3. Ou utilisez le script : `node scripts/generate-icons.js` (nécessite sharp)

## Développement

```bash
# Structure
git clone <repo>
cd jira-time-logger

# Génération des icônes (optionnel, nécessite Node.js + sharp)
npm install sharp
node scripts/generate-icons.js

# Ou avec Python (placeholder icons)
python3 scripts/create-placeholder-icons.py
```

## Limitations connues

- L'extension nécessite JIRA Cloud (pas de support pour JIRA Server/Data Center)
- Le token API doit avoir les permissions de lecture des issues et d'écriture des worklogs

## Licence

MIT License
