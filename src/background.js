import { STORAGE_KEYS } from "./constants/storage";
import { getCaseInfoFromPdTitle } from "./content/new-incident/incidentAlertTypes/index.js";

const uuidv4 = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// GitHub API endpoints
const GH_USERNAME = "bSienkiewicz";
const GH_REPO = "sftools";

function defaultMessagesRender() {
  return [
    {
      id: uuidv4(),
      messages: [
        {
          id: uuidv4(),
          message:
            "Hi team,\n\nThank you for your ticket. We have started working on your request, and we'll keep you updated on the progress.",
          position: 0,
          title: "Started working",
          alias: "sw",
        },
        {
          id: uuidv4(),
          message:
            "Hello Team,\n\nPlease note that I will be closing this case due to the absence of feedback for more than 5 days.\nShould any further investigation be required, kindly open a new case instead of reopening the current one.",
          posiiton: 1,
          title: "7 days inactive",
          alias: "7d",
        },
        {
          id: uuidv4(),
          message: "Hello Team,\n\n",
          posiiton: 2,
          title: "Hello Team",
          alias: "elo",
        },
        {
          id: uuidv4(),
          message:
            "Hello Team,\n\nThank you for raising a case with us. \nYour query was categorized as Sev 3. \nWe will analyze the issue and provide more information. \nPlease wait for our feedback.",
          position: 3,
          title: "Severity 3",
          alias: "s3",
        },
      ],
      position: 0,
      title: "Comment templates",
    },
  ];
}

// Rate limiting: only check once per hour
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
let isCheckingUpdate = false;

function compareVersions(v1, v2) {
  const parts1 = v1.split(".").map(Number);
  const parts2 = v2.split(".").map(Number);
  const maxLength = Math.max(parts1.length, parts2.length);

  for (let i = 0; i < maxLength; i++) {
    const num1 = parts1[i] || 0;
    const num2 = parts2[i] || 0;
    if (num1 < num2) return -1;
    if (num1 > num2) return 1;
  }
  return 0;
}

const checkForUpdate = async () => {
  // Prevent concurrent checks
  if (isCheckingUpdate) return;
  isCheckingUpdate = true;

  try {
    // Check if we've checked recently
    const lastCheck = await new Promise((resolve) => {
      chrome.storage.local.get("last_update_check", (result) => {
        resolve(result.last_update_check || 0);
      });
    });

    const now = Date.now();
    if (now - lastCheck < UPDATE_CHECK_INTERVAL_MS) {
      isCheckingUpdate = false;
      return;
    }

    // Get current version from the extension's manifest.json
    const currentVersion = chrome.runtime.getManifest().version;

    // Try main branch first, fallback to master
    const branches = ["main", "master"];
    let latestVersion = null;
    let error = null;

    for (const branch of branches) {
      try {
        const repoManifestUrl = `https://raw.githubusercontent.com/${GH_USERNAME}/${GH_REPO}/${branch}/manifest.json`;
        const response = await fetch(repoManifestUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        latestVersion = data.version;
        break; // Success, exit loop
      } catch (err) {
        error = err;
        continue; // Try next branch
      }
    }

    if (!latestVersion) {
      // If fetch failed, preserve last known state and log error
      console.error("Error checking for updates:", error);
      isCheckingUpdate = false;
      return;
    }

    // Update last check timestamp
    chrome.storage.local.set({ last_update_check: now });

    // Compare versions - only show update if latest > current
    const versionComparison = compareVersions(latestVersion, currentVersion);
    console.log(versionComparison);
    if (versionComparison > 0) {
      console.log(
        `New version available: ${latestVersion}. Current version: ${currentVersion}.`,
      );
      chrome.storage.local.set({
        [STORAGE_KEYS.LATEST_VERSION]: latestVersion,
        [STORAGE_KEYS.UPDATE_AVAILABLE]: true,
      });
    } else {
      console.log("You have the latest version.");
      // Only store update_available flag, clear latest_version when up to date
      chrome.storage.local.set({
        [STORAGE_KEYS.UPDATE_AVAILABLE]: false,
      });
      chrome.storage.local.remove(STORAGE_KEYS.LATEST_VERSION);
    }
  } catch (error) {
    console.error("Error checking for updates:", error);
  } finally {
    isCheckingUpdate = false;
  }
};

function initialSetup() {
  // Initialize default settings if not already done
  chrome.storage.local.get("initialized", (result) => {
    if (result.initialized) return;

    const defaultMessages = defaultMessagesRender();
    chrome.storage.local.set(
      {
        initialized: true,
        button_messages: defaultMessages,
      },
      () => {
        console.log("Default options set for all severity levels");
      },
    );
  });
  chrome.storage.local.get("showTemplates", (result) => {
    if (!result.showTemplates) {
      chrome.storage.local.set({ showTemplates: true });
    }
  });

  chrome.storage.local.get("showSevenDays", (result) => {
    if (!result.showSevenDays) {
      chrome.storage.local.set({ showSevenDays: true });
    }
  });

  chrome.storage.local.get("sevenDaysAmount", (result) => {
    if (!result.sevenDaysAmount) {
      chrome.storage.local.set({ sevenDaysAmount: 7 });
    }
  });

  chrome.storage.local.get(STORAGE_KEYS.NEW_INCIDENT_HELPER_TOGGLE, (result) => {
    if (result[STORAGE_KEYS.NEW_INCIDENT_HELPER_TOGGLE] === undefined) {
      chrome.storage.local.set({ [STORAGE_KEYS.NEW_INCIDENT_HELPER_TOGGLE]: false });
    }
  });

  chrome.storage.local.get(STORAGE_KEYS.AUTO_CLOSE_PD_PAGES, (result) => {
    if (result[STORAGE_KEYS.AUTO_CLOSE_PD_PAGES] === undefined) {
      chrome.storage.local.set({ [STORAGE_KEYS.AUTO_CLOSE_PD_PAGES]: false });
    }
  });

  chrome.storage.local.get(STORAGE_KEYS.BATCH_TAB_GROUPING, (result) => {
    if (result[STORAGE_KEYS.BATCH_TAB_GROUPING] === undefined) {
      chrome.storage.local.set({ [STORAGE_KEYS.BATCH_TAB_GROUPING]: true });
    }
  });
}

// ----- PagerDuty incident title fetch (for New Case: Incident) -----
const PD_INCIDENT_URL_REGEX = /^https:\/\/auctane\.pagerduty\.com\/incidents\/[a-zA-Z0-9]{14}$/;
const PD_H1_SELECTOR = 'h1[class^="IncidentTitle_incidentTitle__"]';
const PD_TITLE_WAIT_MS = 30000;

/** Injected into PagerDuty tab: wait for h1 with non-empty title (handles hydration). */
function observePagerDutyIncidentTitle(tabId, selector, timeoutMs) {
  const send = (title) => {
    chrome.runtime.sendMessage({ type: "PD_INCIDENT_TITLE_RESULT", tabId, title });
  };

  function readTitle(el) {
    const t = el && el.textContent ? el.textContent.trim() : "";
    return t.length > 0 ? t : null;
  }

  function trySend() {
    const el = document.querySelector(selector);
    const title = readTitle(el);
    if (title) {
      send(title);
      return true;
    }
    return false;
  }

  if (trySend()) return;

  const obs = new MutationObserver(() => {
    const el = document.querySelector(selector);
    const title = readTitle(el);
    if (title) {
      obs.disconnect();
      clearTimeout(timeoutId);
      send(title);
    }
  });

  obs.observe(document.body, { childList: true, subtree: true, characterData: true, characterDataOldValue: true });

  const timeoutId = setTimeout(() => {
    obs.disconnect();
    const el = document.querySelector(selector);
    send(readTitle(el));
  }, timeoutMs);
}

const pendingPagerDutyRequests = new Map();
// For batch fetch: tabId → { url, resolve, reject }
const batchPagerDutyRequests = new Map();

function onPagerDutyTabUpdated(tabId, changeInfo) {
  if (changeInfo.status !== "complete") return;
  const pending = pendingPagerDutyRequests.get(tabId);
  const batchPending = batchPagerDutyRequests.get(tabId);
  
  if (pending) {
    chrome.scripting
      .executeScript({
        target: { tabId },
        func: observePagerDutyIncidentTitle,
        args: [tabId, PD_H1_SELECTOR, PD_TITLE_WAIT_MS],
      })
      .catch(() => {
        pendingPagerDutyRequests.delete(tabId);
        chrome.tabs.remove(tabId).catch(() => {});
        pending.sendResponse({ ok: false, error: "Failed to run script on PagerDuty page" });
      });
  }
  
  if (batchPending) {
    chrome.scripting
      .executeScript({
        target: { tabId },
        func: observePagerDutyIncidentTitle,
        args: [tabId, PD_H1_SELECTOR, PD_TITLE_WAIT_MS],
      })
      .catch(() => {
        batchPagerDutyRequests.delete(tabId);
        chrome.tabs.remove(tabId).catch(() => {});
        batchPending.reject(new Error("Failed to run script on PagerDuty page"));
      });
  }
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  onPagerDutyTabUpdated(tabId, changeInfo);
});

// Tab ID → PagerDuty URL for batch-open New Case tabs (Salesforce strips URL params)
const tabIdToPdUrl = new Map();

chrome.tabs.onRemoved.addListener((tabId) => {
  tabIdToPdUrl.delete(tabId);
});

// Group alerts by subject (same subject = same group)
function groupAlertsBySubject(results) {
  const groups = new Map();
  
  for (const { url, title } of results) {
    if (!title) continue;
    const caseInfo = getCaseInfoFromPdTitle(title);
    const subject = caseInfo?.subject ?? title;
    const key = subject;
    
    if (!groups.has(key)) {
      groups.set(key, {
        subject,
        formDefaults: caseInfo?.formDefaults ?? [],
        alertTypeName: caseInfo?.alertTypeName ?? null,
        pdUrls: [],
      });
    }
    groups.get(key).pdUrls.push(url);
  }
  
  return Array.from(groups.values());
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Fetch all titles first, group, then open SF+PD
  if (message.action === "fetchBatchPagerDutyTitles") {
    const pdUrls = Array.isArray(message.pdUrls) ? message.pdUrls : [];
    if (pdUrls.length === 0) {
      sendResponse({ ok: false, error: "No PD URLs provided" });
      return true;
    }
    
    sendResponse({ ok: true });
    
    // Open all PD pages and collect titles
    const fetchPromises = pdUrls.map((url) => {
      return new Promise((resolve, reject) => {
        if (!PD_INCIDENT_URL_REGEX.test(url)) {
          resolve({ url, title: null });
          return;
        }
        
        chrome.tabs.create({ url, active: false }, (tab) => {
          if (chrome.runtime.lastError || !tab?.id) {
            resolve({ url, title: null });
            return;
          }
          batchPagerDutyRequests.set(tab.id, { url, resolve, reject });
        });
      });
    });
    
    Promise.all(fetchPromises).then((results) => {
      // Group by subject
      const groups = groupAlertsBySubject(results);
      
      // Open grouped incidents: 1 SF page + N PD pages per group
      const newCaseUrl = message.newCaseUrl || "https://stampsdotcom.lightning.force.com/lightning/o/Case/new?count=1";
      const tabIds = [];
      let groupIndex = 0;
      let tabsCreated = 0;
      const totalTabs = groups.reduce((sum, g) => sum + 1 + g.pdUrls.length, 0); // 1 SF + N PD per group
      
      const maybeGroupTabs = () => {
        if (tabsCreated !== totalTabs || tabIds.length === 0) return;
        chrome.storage.local.get(STORAGE_KEYS.BATCH_TAB_GROUPING, (result) => {
          const enableGrouping = result[STORAGE_KEYS.BATCH_TAB_GROUPING] === true;
          if (enableGrouping && chrome.tabs.group) {
            chrome.tabs.group({ tabIds }, (groupId) => {
              if (chrome.runtime.lastError) {
                console.warn("[SF Tools] Failed to create tab group:", chrome.runtime.lastError.message);
              }
            });
          }
        });
      };
      
      const openNextGroup = () => {
        if (groupIndex >= groups.length) {
          // All groups processed, check if all tabs are created
          maybeGroupTabs();
          return;
        }
        const group = groups[groupIndex];
        groupIndex += 1;
        
        // Open Salesforce page first
        chrome.tabs.create({ url: newCaseUrl }, (sfTab) => {
          if (sfTab?.id) {
            tabIds.push(sfTab.id);
            tabsCreated += 1;
            maybeGroupTabs();
            // Store group info for content script
            tabIdToPdUrl.set(sfTab.id, JSON.stringify({
              subject: group.subject,
              formDefaults: group.formDefaults,
              alertTypeName: group.alertTypeName,
              pdUrls: group.pdUrls,
            }));
          }
          
          // Open PD pages for this group
          let pdIndex = 0;
          const openNextPd = () => {
            if (pdIndex >= group.pdUrls.length) {
              // Move to next group after a delay
              setTimeout(openNextGroup, 200);
              return;
            }
            const pdUrl = group.pdUrls[pdIndex];
            pdIndex += 1;
            chrome.tabs.create({ url: pdUrl, active: false }, (pdTab) => {
              if (pdTab?.id) {
                tabIds.push(pdTab.id);
                tabsCreated += 1;
                maybeGroupTabs();
              }
              setTimeout(openNextPd, 60);
            });
          };
          openNextPd();
        });
      };
      
      openNextGroup();
    });
    
    return true;
  }
  
  if (message.action === "openBatchNewCaseTabs") {
    const pdUrls = Array.isArray(message.pdUrls) ? message.pdUrls : [];
    const newCaseUrl = message.newCaseUrl || "";
    if (pdUrls.length === 0 || !newCaseUrl) {
      sendResponse({ ok: false, error: "Missing pdUrls or newCaseUrl" });
      return true;
    }
    // Reply immediately so popup can close without "message port closed" error; tabs open in background
    sendResponse({ ok: true });
    let index = 0;
    const createNext = () => {
      if (index >= pdUrls.length) return;
      const pdUrl = pdUrls[index];
      index += 1;
      chrome.tabs.create({ url: newCaseUrl }, (tab) => {
        if (tab?.id) tabIdToPdUrl.set(tab.id, pdUrl);
        if (chrome.runtime.lastError) {
          console.warn("[SF Tools] openBatchNewCaseTabs create failed:", chrome.runtime.lastError.message);
        }
        if (index < pdUrls.length) setTimeout(createNext, 60);
      });
    };
    createNext();
    return true;
  }
  // get PagerDuty URL/group info for batch opened tab
  if (message.action === "getPdUrlForMyTab") {
    const tabId = sender.tab?.id;
    const stored = tabId != null ? tabIdToPdUrl.get(tabId) : null;
    if (stored != null) {
      tabIdToPdUrl.delete(tabId);
      // Try to parse as JSON (new grouped format), fallback to string (old single URL format)
      try {
        const parsed = JSON.parse(stored);
        sendResponse({ groupInfo: parsed });
      } catch {
        sendResponse({ url: stored });
      }
    } else {
      sendResponse({ url: null });
    }
    return true;
  }
  if (message.action !== "fetchPagerDutyIncidentTitle") return;

  const url = (message.url || "").trim();
  const senderTabId = sender.tab?.id;

  if (!PD_INCIDENT_URL_REGEX.test(url)) {
    sendResponse({ ok: false, error: "Invalid URL. Use https://auctane.pagerduty.com/incidents/<14 characters>" });
    return true;
  }

  if (senderTabId == null) {
    sendResponse({ ok: false, error: "Sender tab not found" });
    return true;
  }

  chrome.tabs.create({ url, active: false }, (tab) => {
    if (chrome.runtime.lastError) {
      sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      return true;
    }
    pendingPagerDutyRequests.set(tab.id, { senderTabId, sendResponse });
  });

  return true;
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "PD_INCIDENT_TITLE_RESULT") return;

  const { tabId, title } = message;
  const pending = pendingPagerDutyRequests.get(tabId);
  const batchPending = batchPagerDutyRequests.get(tabId);
  
  // Handle manual fetch (with auto-close setting)
  if (pending) {
    pendingPagerDutyRequests.delete(tabId);
    pending.sendResponse({ ok: true, title: title ?? null });
    chrome.storage.local.get(STORAGE_KEYS.AUTO_CLOSE_PD_PAGES, (result) => {
      const autoClose = result[STORAGE_KEYS.AUTO_CLOSE_PD_PAGES] === true;
      if (autoClose) {
        // Close after a short delay so the response is delivered first
        setTimeout(() => chrome.tabs.remove(tabId).catch(() => {}), 100);
      }
    });
    return;
  }
  
  // Handle batch fetch (always close)
  if (batchPending) {
    batchPagerDutyRequests.delete(tabId);
    chrome.tabs.remove(tabId).catch(() => {});
    batchPending.resolve({ url: batchPending.url, title: title ?? null });
  }
});

initialSetup();
checkForUpdate();