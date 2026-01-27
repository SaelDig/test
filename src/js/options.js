// Options page script
document.addEventListener('DOMContentLoaded', init);

function init() {
  loadSettings();
  setupEventListeners();
}

function setupEventListeners() {
  // Form submission
  document.getElementById('options-form').addEventListener('submit', saveSettings);

  // Test connection button
  document.getElementById('test-connection').addEventListener('click', testConnection);

  // Toggle password visibility
  document.getElementById('toggle-token').addEventListener('click', toggleTokenVisibility);
}

async function loadSettings() {
  try {
    const settings = await chrome.storage.sync.get([
      'jiraDomain',
      'jiraEmail',
      'jiraToken',
      'defaultProject',
      'rememberLastIssue',
      'showNotifications'
    ]);

    if (settings.jiraDomain) {
      document.getElementById('jira-domain').value = settings.jiraDomain;
    }
    if (settings.jiraEmail) {
      document.getElementById('jira-email').value = settings.jiraEmail;
    }
    if (settings.jiraToken) {
      document.getElementById('jira-token').value = settings.jiraToken;
    }
    if (settings.defaultProject) {
      document.getElementById('default-project').value = settings.defaultProject;
    }

    document.getElementById('remember-last-issue').checked = settings.rememberLastIssue ?? false;
    document.getElementById('show-notifications').checked = settings.showNotifications ?? true;
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Erreur lors du chargement des paramètres', 'error');
  }
}

async function saveSettings(event) {
  event.preventDefault();

  const domain = document.getElementById('jira-domain').value.trim();
  const email = document.getElementById('jira-email').value.trim();
  const token = document.getElementById('jira-token').value.trim();
  const defaultProject = document.getElementById('default-project').value.trim().toUpperCase();
  const rememberLastIssue = document.getElementById('remember-last-issue').checked;
  const showNotifications = document.getElementById('show-notifications').checked;

  // Validation
  if (!domain || !email || !token) {
    showStatus('Veuillez remplir tous les champs obligatoires', 'error');
    return;
  }

  // Clean domain (remove https:// if present)
  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');

  try {
    await chrome.storage.sync.set({
      jiraDomain: cleanDomain,
      jiraEmail: email,
      jiraToken: token,
      defaultProject: defaultProject || '',
      rememberLastIssue,
      showNotifications
    });

    showStatus('✅ Paramètres sauvegardés avec succès !', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Erreur lors de la sauvegarde des paramètres', 'error');
  }
}

async function testConnection() {
  const domain = document.getElementById('jira-domain').value.trim();
  const email = document.getElementById('jira-email').value.trim();
  const token = document.getElementById('jira-token').value.trim();

  if (!domain || !email || !token) {
    showStatus('Veuillez d\'abord remplir tous les champs de connexion', 'error');
    return;
  }

  const cleanDomain = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  const testBtn = document.getElementById('test-connection');
  const originalText = testBtn.textContent;

  try {
    testBtn.disabled = true;
    testBtn.textContent = '⏳ Test en cours...';

    const response = await fetch(`https://${cleanDomain}/rest/api/3/myself`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${email}:${token}`),
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const user = await response.json();
      showStatus(`✅ Connexion réussie ! Connecté en tant que ${user.displayName}`, 'success');
    } else if (response.status === 401) {
      showStatus('❌ Authentification échouée. Vérifiez votre email et token.', 'error');
    } else if (response.status === 403) {
      showStatus('❌ Accès refusé. Vérifiez les permissions de votre token.', 'error');
    } else if (response.status === 404) {
      showStatus('❌ Domaine JIRA introuvable. Vérifiez l\'URL.', 'error');
    } else {
      showStatus(`❌ Erreur de connexion (${response.status})`, 'error');
    }
  } catch (error) {
    console.error('Connection test error:', error);
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      showStatus('❌ Impossible de se connecter. Vérifiez le domaine JIRA.', 'error');
    } else {
      showStatus('❌ Erreur lors du test de connexion', 'error');
    }
  } finally {
    testBtn.disabled = false;
    testBtn.textContent = originalText;
  }
}

function toggleTokenVisibility() {
  const tokenInput = document.getElementById('jira-token');
  const toggleBtn = document.getElementById('toggle-token');

  if (tokenInput.type === 'password') {
    tokenInput.type = 'text';
    toggleBtn.textContent = '🙈';
  } else {
    tokenInput.type = 'password';
    toggleBtn.textContent = '👁️';
  }
}

function showStatus(message, type) {
  const statusEl = document.getElementById('status-message');
  statusEl.textContent = message;
  statusEl.className = `status-message ${type}`;

  // Auto-hide after 5 seconds for success messages
  if (type === 'success') {
    setTimeout(() => {
      statusEl.classList.add('hidden');
    }, 5000);
  }
}
