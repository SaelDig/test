// Popup script for JIRA Time Logger

// State
let settings = null;
let selectedIssue = null;
let searchTimeout = null;
let recentLogs = [];

// DOM Elements
const elements = {};

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  cacheElements();
  await loadSettings();
  setupEventListeners();
  setDefaultDate();
  await loadRecentLogs();
}

function cacheElements() {
  elements.notConfigured = document.getElementById('not-configured');
  elements.mainContent = document.getElementById('main-content');
  elements.loadingState = document.getElementById('loading-state');
  elements.statusMessage = document.getElementById('status-message');
  elements.settingsBtn = document.getElementById('settings-btn');
  elements.openSettings = document.getElementById('open-settings');
  elements.issueSearch = document.getElementById('issue-search');
  elements.searchSpinner = document.getElementById('search-spinner');
  elements.searchResults = document.getElementById('search-results');
  elements.selectedIssue = document.getElementById('selected-issue');
  elements.selectedIssueKey = document.getElementById('selected-issue-key');
  elements.selectedIssueSummary = document.getElementById('selected-issue-summary');
  elements.clearIssue = document.getElementById('clear-issue');
  elements.timeHours = document.getElementById('time-hours');
  elements.timeMinutes = document.getElementById('time-minutes');
  elements.workDate = document.getElementById('work-date');
  elements.workComment = document.getElementById('work-comment');
  elements.submitLog = document.getElementById('submit-log');
  elements.recentLogsList = document.getElementById('recent-logs-list');
  elements.refreshLogs = document.getElementById('refresh-logs');
  elements.quickTimeBtns = document.querySelectorAll('.quick-time-btn');
}

async function loadSettings() {
  try {
    settings = await chrome.storage.sync.get([
      'jiraDomain',
      'jiraEmail',
      'jiraToken',
      'defaultProject',
      'rememberLastIssue',
      'showNotifications'
    ]);

    if (!settings.jiraDomain || !settings.jiraEmail || !settings.jiraToken) {
      showNotConfigured();
    } else {
      showMainContent();

      // Load last issue if enabled
      if (settings.rememberLastIssue) {
        const lastIssue = await chrome.storage.local.get('lastIssue');
        if (lastIssue.lastIssue) {
          selectIssue(lastIssue.lastIssue);
        }
      }
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showNotConfigured();
  }
}

function showNotConfigured() {
  elements.notConfigured.classList.remove('hidden');
  elements.mainContent.classList.add('hidden');
  elements.loadingState.classList.add('hidden');
}

function showMainContent() {
  elements.notConfigured.classList.add('hidden');
  elements.mainContent.classList.remove('hidden');
  elements.loadingState.classList.add('hidden');
}

function setupEventListeners() {
  // Settings buttons
  elements.settingsBtn.addEventListener('click', openOptionsPage);
  elements.openSettings?.addEventListener('click', openOptionsPage);

  // Issue search
  elements.issueSearch.addEventListener('input', handleSearchInput);
  elements.issueSearch.addEventListener('focus', () => {
    if (elements.searchResults.children.length > 0) {
      elements.searchResults.classList.remove('hidden');
    }
  });

  // Clear issue
  elements.clearIssue.addEventListener('click', clearSelectedIssue);

  // Quick time buttons
  elements.quickTimeBtns.forEach(btn => {
    btn.addEventListener('click', () => handleQuickTime(btn));
  });

  // Time inputs
  elements.timeHours.addEventListener('input', updateSubmitButton);
  elements.timeMinutes.addEventListener('input', updateSubmitButton);

  // Submit
  elements.submitLog.addEventListener('click', submitWorkLog);

  // Refresh logs
  elements.refreshLogs.addEventListener('click', loadRecentLogs);

  // Close search results when clicking outside
  document.addEventListener('click', (e) => {
    if (!elements.issueSearch.contains(e.target) && !elements.searchResults.contains(e.target)) {
      elements.searchResults.classList.add('hidden');
    }
  });
}

function openOptionsPage() {
  chrome.runtime.openOptionsPage();
}

function setDefaultDate() {
  const today = new Date().toISOString().split('T')[0];
  elements.workDate.value = today;
}

// Search functionality
function handleSearchInput(e) {
  const query = e.target.value.trim();

  if (searchTimeout) {
    clearTimeout(searchTimeout);
  }

  if (query.length < 2) {
    elements.searchResults.classList.add('hidden');
    elements.searchSpinner.classList.add('hidden');
    return;
  }

  elements.searchSpinner.classList.remove('hidden');

  searchTimeout = setTimeout(() => {
    searchIssues(query);
  }, 300);
}

async function searchIssues(query) {
  try {
    // Build JQL query
    let jql;
    const isIssueKey = /^[A-Z]+-\d+$/i.test(query);

    if (isIssueKey) {
      jql = `key = "${query.toUpperCase()}"`;
    } else {
      const searchTerms = query.replace(/"/g, '\\"');
      if (settings.defaultProject) {
        jql = `project = "${settings.defaultProject}" AND (summary ~ "${searchTerms}" OR key ~ "${searchTerms}") ORDER BY updated DESC`;
      } else {
        jql = `summary ~ "${searchTerms}" OR key ~ "${searchTerms}" ORDER BY updated DESC`;
      }
    }

    const response = await jiraRequest('/rest/api/3/search/jql', {
      method: 'POST',
      body: JSON.stringify({
        jql,
        maxResults: 10,
        fields: ['summary', 'issuetype', 'status', 'project']
      })
    });

    if (response.issues && response.issues.length > 0) {
      displaySearchResults(response.issues);
    } else {
      elements.searchResults.innerHTML = '<div class="empty-text">Aucune issue trouvée</div>';
      elements.searchResults.classList.remove('hidden');
    }
  } catch (error) {
    console.error('Search error:', error);
    elements.searchResults.innerHTML = '<div class="empty-text">Erreur de recherche</div>';
    elements.searchResults.classList.remove('hidden');
  } finally {
    elements.searchSpinner.classList.add('hidden');
  }
}

function displaySearchResults(issues) {
  elements.searchResults.innerHTML = '';

  issues.forEach(issue => {
    const item = document.createElement('div');
    item.className = 'search-result-item';
    item.innerHTML = `
      <span class="issue-key">${issue.key}</span>
      <span class="issue-summary">${escapeHtml(issue.fields.summary)}</span>
      <span class="issue-type">${issue.fields.issuetype?.name || ''} • ${issue.fields.status?.name || ''}</span>
    `;
    item.addEventListener('click', () => selectIssue({
      key: issue.key,
      summary: issue.fields.summary,
      id: issue.id
    }));
    elements.searchResults.appendChild(item);
  });

  elements.searchResults.classList.remove('hidden');
}

function selectIssue(issue) {
  selectedIssue = issue;
  elements.selectedIssueKey.textContent = issue.key;
  elements.selectedIssueSummary.textContent = issue.summary;
  elements.selectedIssue.classList.remove('hidden');
  elements.issueSearch.value = '';
  elements.searchResults.classList.add('hidden');

  // Save last issue if enabled
  if (settings.rememberLastIssue) {
    chrome.storage.local.set({ lastIssue: issue });
  }

  updateSubmitButton();
}

function clearSelectedIssue() {
  selectedIssue = null;
  elements.selectedIssue.classList.add('hidden');
  elements.issueSearch.value = '';
  elements.issueSearch.focus();

  if (settings.rememberLastIssue) {
    chrome.storage.local.remove('lastIssue');
  }

  updateSubmitButton();
}

// Quick time selection
function handleQuickTime(btn) {
  const time = btn.dataset.time;

  // Reset all buttons
  elements.quickTimeBtns.forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  // Parse time
  const match = time.match(/^(\d+)(h|m)$/);
  if (match) {
    const value = parseInt(match[1]);
    const unit = match[2];

    if (unit === 'h') {
      elements.timeHours.value = value;
      elements.timeMinutes.value = 0;
    } else {
      elements.timeHours.value = 0;
      elements.timeMinutes.value = value;
    }
  }

  updateSubmitButton();
}

function updateSubmitButton() {
  const hours = parseInt(elements.timeHours.value) || 0;
  const minutes = parseInt(elements.timeMinutes.value) || 0;
  const hasTime = hours > 0 || minutes > 0;
  const hasIssue = selectedIssue !== null;

  elements.submitLog.disabled = !hasTime || !hasIssue;
}

// Submit work log
async function submitWorkLog() {
  if (!selectedIssue) {
    showStatus('Veuillez sélectionner une issue', 'error');
    return;
  }

  const hours = parseInt(elements.timeHours.value) || 0;
  const minutes = parseInt(elements.timeMinutes.value) || 0;
  const totalSeconds = (hours * 3600) + (minutes * 60);

  if (totalSeconds === 0) {
    showStatus('Veuillez entrer un temps valide', 'error');
    return;
  }

  const workDate = elements.workDate.value;
  const comment = elements.workComment.value.trim();

  // Disable button during submission
  elements.submitLog.disabled = true;
  elements.submitLog.textContent = '⏳ Envoi en cours...';

  try {
    const payload = {
      timeSpentSeconds: totalSeconds,
      started: formatDateForJira(workDate)
    };

    if (comment) {
      payload.comment = {
        type: 'doc',
        version: 1,
        content: [{
          type: 'paragraph',
          content: [{
            type: 'text',
            text: comment
          }]
        }]
      };
    }

    await jiraRequest(`/rest/api/3/issue/${selectedIssue.key}/worklog`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    // Success
    const timeStr = formatTimeDisplay(hours, minutes);
    showStatus(`✅ ${timeStr} loggé sur ${selectedIssue.key}`, 'success');

    // Save to recent logs
    await saveToRecentLogs({
      issueKey: selectedIssue.key,
      issueSummary: selectedIssue.summary,
      timeSpent: timeStr,
      date: workDate,
      timestamp: Date.now()
    });

    // Reset form
    elements.timeHours.value = 0;
    elements.timeMinutes.value = 0;
    elements.workComment.value = '';
    elements.quickTimeBtns.forEach(b => b.classList.remove('active'));

    // Reload recent logs
    await loadRecentLogs();

  } catch (error) {
    console.error('Submit error:', error);
    showStatus(`❌ Erreur: ${error.message || 'Échec de l\'envoi'}`, 'error');
  } finally {
    elements.submitLog.disabled = false;
    elements.submitLog.textContent = '📝 Logger le temps';
    updateSubmitButton();
  }
}

// Recent logs
async function loadRecentLogs() {
  try {
    const data = await chrome.storage.local.get('recentLogs');
    recentLogs = data.recentLogs || [];
    displayRecentLogs();
  } catch (error) {
    console.error('Error loading recent logs:', error);
  }
}

async function saveToRecentLogs(logEntry) {
  recentLogs.unshift(logEntry);
  // Keep only last 10 logs
  recentLogs = recentLogs.slice(0, 10);
  await chrome.storage.local.set({ recentLogs });
}

function displayRecentLogs() {
  if (recentLogs.length === 0) {
    elements.recentLogsList.innerHTML = '<p class="empty-text">Aucun log récent</p>';
    return;
  }

  elements.recentLogsList.innerHTML = recentLogs.map(log => `
    <div class="log-item">
      <div>
        <span class="log-issue">${log.issueKey}</span>
        <span class="log-date">${formatDisplayDate(log.date)}</span>
      </div>
      <span class="log-time">${log.timeSpent}</span>
    </div>
  `).join('');
}

// JIRA API helper
async function jiraRequest(endpoint, options = {}) {
  const url = `https://${settings.jiraDomain}${endpoint}`;
  const auth = btoa(`${settings.jiraEmail}:${settings.jiraToken}`);

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    }
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage;

    try {
      const errorJson = JSON.parse(errorText);
      errorMessage = errorJson.errorMessages?.join(', ') || errorJson.message || `HTTP ${response.status}`;
    } catch {
      errorMessage = `HTTP ${response.status}`;
    }

    throw new Error(errorMessage);
  }

  // Handle empty responses
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

// Utility functions
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDateForJira(dateStr) {
  // JIRA expects format: 2024-01-15T09:00:00.000+0000
  const date = new Date(dateStr);
  date.setHours(9, 0, 0, 0); // Set to 9 AM
  return date.toISOString().replace('Z', '+0000');
}

function formatTimeDisplay(hours, minutes) {
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  return parts.join(' ') || '0m';
}

function formatDisplayDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Aujourd'hui";
  } else if (date.toDateString() === yesterday.toDateString()) {
    return 'Hier';
  } else {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }
}

function showStatus(message, type) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${type}`;

  // Auto-hide after 3 seconds
  setTimeout(() => {
    elements.statusMessage.classList.add('hidden');
  }, 3000);
}
