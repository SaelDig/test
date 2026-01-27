// Background service worker for JIRA Time Logger

// Listen for extension installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Open options page on first install
    chrome.runtime.openOptionsPage();
  }
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getSettings') {
    chrome.storage.sync.get([
      'jiraDomain',
      'jiraEmail',
      'jiraToken',
      'defaultProject',
      'rememberLastIssue',
      'showNotifications'
    ]).then(sendResponse);
    return true; // Keep message channel open for async response
  }

  if (request.action === 'testConnection') {
    testJiraConnection(request.settings).then(sendResponse);
    return true;
  }

  if (request.action === 'searchIssues') {
    searchJiraIssues(request.query, request.settings).then(sendResponse);
    return true;
  }

  if (request.action === 'logWork') {
    logWorkToJira(request.issueKey, request.worklog, request.settings).then(sendResponse);
    return true;
  }
});

// Test JIRA connection
async function testJiraConnection(settings) {
  try {
    const response = await fetch(`https://${settings.jiraDomain}/rest/api/3/myself`, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${settings.jiraEmail}:${settings.jiraToken}`),
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const user = await response.json();
      return { success: true, user };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Search JIRA issues
async function searchJiraIssues(query, settings) {
  try {
    const isIssueKey = /^[A-Z]+-\d+$/i.test(query);
    let jql;

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

    const response = await fetch(`https://${settings.jiraDomain}/rest/api/3/search/jql`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${settings.jiraEmail}:${settings.jiraToken}`),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        jql,
        maxResults: 10,
        fields: ['summary', 'issuetype', 'status', 'project']
      })
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, issues: data.issues };
    } else {
      return { success: false, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Log work to JIRA issue
async function logWorkToJira(issueKey, worklog, settings) {
  try {
    const response = await fetch(`https://${settings.jiraDomain}/rest/api/3/issue/${issueKey}/worklog`, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${settings.jiraEmail}:${settings.jiraToken}`),
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(worklog)
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, worklog: data };
    } else {
      const errorText = await response.text();
      let errorMessage;
      try {
        const errorJson = JSON.parse(errorText);
        errorMessage = errorJson.errorMessages?.join(', ') || errorJson.message || `HTTP ${response.status}`;
      } catch {
        errorMessage = `HTTP ${response.status}`;
      }
      return { success: false, error: errorMessage };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Optional: Context menu for quick logging from JIRA pages
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'log-time-jira',
    title: 'Logger du temps sur cette issue',
    contexts: ['page'],
    documentUrlPatterns: ['https://*.atlassian.net/browse/*']
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'log-time-jira') {
    // Extract issue key from URL
    const match = tab.url.match(/\/browse\/([A-Z]+-\d+)/i);
    if (match) {
      const issueKey = match[1].toUpperCase();
      // Store the issue key and open popup
      chrome.storage.local.set({ quickLogIssue: issueKey }, () => {
        chrome.action.openPopup();
      });
    }
  }
});
