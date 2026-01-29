import { STORAGE_KEYS } from "./constants/storage";

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
const PD_INCIDENT_URL_REGEX = /^https?:\/\/auctane\.pagerduty\.com\/incidents\/[a-zA-Z0-9]{14}$/;
const PD_H1_SELECTOR = 'h1[class^="IncidentTitle_incidentTitle__"]';
const PD_TITLE_WAIT_MS = 30000;
const BATCH_PD_INJECT_DELAY_MS = 8000; // Fallback: inject if "complete" never fires (e.g. tab in background)

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
const batchPdTabToSfTab = new Map();

function onPagerDutyTabUpdated(tabId, changeInfo) {
  if (changeInfo.status !== "complete") return;
  const pending = pendingPagerDutyRequests.get(tabId);
  const batch = batchPdTabToSfTab.get(tabId);

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
    return;
  }
  if (batch) {
    injectBatchPdTitleScript(tabId);
  }
}

function injectBatchPdTitleScript(pdTabId) {
  chrome.scripting
    .executeScript({
      target: { tabId: pdTabId },
      func: observePagerDutyIncidentTitle,
      args: [pdTabId, PD_H1_SELECTOR, PD_TITLE_WAIT_MS],
    })
    .catch(() => {
      const batch = batchPdTabToSfTab.get(pdTabId);
      batchPdTabToSfTab.delete(pdTabId);
      if (batch?.sfTabId) {
        pendingFillBySfTab.set(batch.sfTabId, { title: null, url: batch.url });
      }
    });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  onPagerDutyTabUpdated(tabId, changeInfo);
});

// Tab ID → data for New Case tab: string (single URL) or JSON { url, batch: true }
const tabIdToPdUrl = new Map();
// SF tab ID → { title, url } when batch PD title is ready (tab can poll if it missed the message)
const pendingFillBySfTab = new Map();

chrome.tabs.onRemoved.addListener((tabId) => {
  tabIdToPdUrl.delete(tabId);
  batchPdTabToSfTab.delete(tabId);
  pendingFillBySfTab.delete(tabId);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Batch: open 1 SF tab + 1 PD tab per URL (each pair gets PD title → SF form)
  if (message.action === "openBatchNewCaseTabs") {
    const pdUrls = Array.isArray(message.pdUrls) ? message.pdUrls : [];
    const newCaseUrl = message.newCaseUrl || "https://stampsdotcom.lightning.force.com/lightning/o/Case/new?count=1";
    if (pdUrls.length === 0) {
      sendResponse({ ok: false, error: "No PD URLs provided" });
      return true;
    }
    sendResponse({ ok: true });

    const tabIds = [];
    let index = 0;
    function openNextPair() {
      if (index >= pdUrls.length) {
        chrome.storage.local.get(STORAGE_KEYS.BATCH_TAB_GROUPING, (result) => {
          const enableGrouping = result[STORAGE_KEYS.BATCH_TAB_GROUPING] === true;
          if (enableGrouping && tabIds.length > 0 && chrome.tabs.group) {
            chrome.tabs.group({ tabIds }, () => {
              if (chrome.runtime.lastError) {
                console.warn("[SF Tools] Tab group failed:", chrome.runtime.lastError.message);
              }
            });
          }
        });
        return;
      }
      const pdUrl = pdUrls[index];
      index += 1;
      chrome.tabs.create({ url: newCaseUrl }, (sfTab) => {
        if (sfTab?.id) {
          tabIds.push(sfTab.id);
          tabIdToPdUrl.set(sfTab.id, JSON.stringify({ url: pdUrl, batch: true }));
        }
        chrome.tabs.create({ url: pdUrl, active: false }, (pdTab) => {
          if (pdTab?.id) {
            tabIds.push(pdTab.id);
            batchPdTabToSfTab.set(pdTab.id, { sfTabId: sfTab?.id, url: pdUrl });
            // Fallback: if "complete" never fires (e.g. tab in background), try injecting after delay
            setTimeout(() => {
              if (batchPdTabToSfTab.has(pdTab.id)) {
                injectBatchPdTitleScript(pdTab.id);
              }
            }, BATCH_PD_INJECT_DELAY_MS);
          }
          setTimeout(openNextPair, 60);
        });
      });
    }
    openNextPair();
    return true;
  }

  if (message.action === "getPdUrlForMyTab") {
    const tabId = sender.tab?.id;
    const stored = tabId != null ? tabIdToPdUrl.get(tabId) : null;
    if (stored != null) {
      tabIdToPdUrl.delete(tabId);
      try {
        const parsed = JSON.parse(stored);
        if (parsed.batch === true && parsed.url) {
          sendResponse({ url: parsed.url, batch: true });
        } else {
          sendResponse({ url: stored });
        }
      } catch {
        sendResponse({ url: stored });
      }
    } else {
      sendResponse({ url: null });
    }
    return true;
  }
  if (message.action === "getPendingFillForMyTab") {
    const tabId = sender.tab?.id;
    const data = tabId != null ? pendingFillBySfTab.get(tabId) : null;
    if (data) pendingFillBySfTab.delete(tabId);
    sendResponse(data || null);
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
  const batch = batchPdTabToSfTab.get(tabId);

  if (pending) {
    pendingPagerDutyRequests.delete(tabId);
    pending.sendResponse({ ok: true, title: title ?? null });
    chrome.storage.local.get(STORAGE_KEYS.AUTO_CLOSE_PD_PAGES, (result) => {
      const autoClose = result[STORAGE_KEYS.AUTO_CLOSE_PD_PAGES] === true;
      if (autoClose) {
        setTimeout(() => chrome.tabs.remove(tabId).catch(() => {}), 100);
      }
    });
    return;
  }
  if (batch) {
    batchPdTabToSfTab.delete(tabId);
    pendingFillBySfTab.set(batch.sfTabId, { title: title ?? null, url: batch.url });
    chrome.storage.local.get(STORAGE_KEYS.AUTO_CLOSE_PD_PAGES, (result) => {
      const autoClose = result[STORAGE_KEYS.AUTO_CLOSE_PD_PAGES] === true;
      if (autoClose) {
        setTimeout(() => chrome.tabs.remove(tabId).catch(() => {}), 100);
      }
    });
  }
});

initialSetup();
checkForUpdate();