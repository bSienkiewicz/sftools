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

const checkForUpdate = async () => {
  // Get current version from the extension's manifest.json
  const currentVersion = chrome.runtime.getManifest().version;

  // Fetch the latest version from GitHub
  const repoManifestUrl =
    `https://raw.githubusercontent.com/${GH_USERNAME}/${GH_REPO}/refs/heads/master/manifest.json`;

  try {
    const response = await fetch(repoManifestUrl);
    if (!response.ok) {
      throw new Error("Failed to fetch manifest.json from GitHub");
    }

    const data = await response.json();
    const latestVersion = data.version;

    // Compare versions
    if (currentVersion !== latestVersion) {
      console.log(
        `New version available: ${latestVersion}. Current version: ${currentVersion}.`,
      );
      chrome.storage.local.set({
        latest_version: latestVersion,
        update_available: true,
      });
    } else {
      console.log("You have the latest version.");
      chrome.storage.local.set({
        latest_version: latestVersion,
        update_available: false,
      });
    }
  } catch (error) {
    console.error("Error checking for updates:", error);
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
}

// ----- PagerDuty incident title fetch (for New Case: Incident) -----
const PD_INCIDENT_URL_REGEX = /^https:\/\/auctane\.pagerduty\.com\/incidents\/[a-zA-Z0-9]{14}$/;
const PD_H1_SELECTOR = 'h1[class^="IncidentTitle_incidentTitle__"]';
const PD_TITLE_WAIT_MS = 15000;

/** Injected into PagerDuty tab: observes for h1 and sends title back. Args passed so serialization works. */
function observePagerDutyIncidentTitle(tabId, selector, timeoutMs) {
  const send = (title) => {
    chrome.runtime.sendMessage({ type: "PD_INCIDENT_TITLE_RESULT", tabId, title });
  };

  const el = document.querySelector(selector);
  if (el) {
    send(el.textContent.trim());
    return;
  }

  const obs = new MutationObserver(() => {
    const found = document.querySelector(selector);
    if (found) {
      obs.disconnect();
      clearTimeout(timeoutId);
      send(found.textContent.trim());
    }
  });

  obs.observe(document.body, { childList: true, subtree: true });

  const timeoutId = setTimeout(() => {
    obs.disconnect();
    send(null);
  }, timeoutMs);
}

const pendingPagerDutyRequests = new Map();

function onPagerDutyTabUpdated(tabId, changeInfo) {
  if (changeInfo.status !== "complete") return;
  const pending = pendingPagerDutyRequests.get(tabId);
  if (!pending) return;

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

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  onPagerDutyTabUpdated(tabId, changeInfo);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
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
  pendingPagerDutyRequests.delete(tabId);

  chrome.tabs.remove(tabId).catch(() => {});

  if (pending) {
    pending.sendResponse({ ok: true, title: title ?? null });
  }
});

initialSetup();
checkForUpdate();