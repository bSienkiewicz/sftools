import React from "react";
import ReactDOM from "react-dom/client";
import NewIncidentGeneratorControls from "./NewIncidentGeneratorControls";
import { querySelectorAllDeep } from "./domUtils";
import { STORAGE_KEYS } from "../../constants/storage";
import { ensureToaster } from "../shared/toaster";

const MODAL_TITLE_SELECTOR = "h2.slds-modal__title";
const NEW_INCIDENT_TEXT = "New Case: Incident";
const FORM_LEGEND_SELECTOR = ".form-legend-desktop";
const INJECTED_MARKER = "data-sftools-incident-injected";
const THROTTLE_MS = 150;
const RETRY_DELAYS_MS = [400, 1000]; // retry when enabled but modal not in DOM yet

// Walk up to find the modal that contains the full form
function findModalContainer(formLegend) {
  let el = formLegend?.parentElement;
  while (el) {
    if (el.matches?.(".slds-modal, [role='dialog'], .slds-modal__container, [class*='modal']")) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}

// Smallest ancestor that contains only this form legend (one tab's content). Ensures we fill
// fields in the same tab as the clicked Build/Generate, not the first tab in the modal.
function getTabScope(formLegend) {
  let el = formLegend;
  while (el?.parentElement) {
    const parent = el.parentElement;
    const legends = querySelectorAllDeep(parent, FORM_LEGEND_SELECTOR);
    if (legends.length === 1) return parent;
    el = parent;
  }
  return findModalContainer(formLegend) || document.body;
}

let wasOnNewIncidentPage = false;
let lastCheck = 0;
let timeoutId = null;
const injectedRoots = new Map();

function injectFormLegendControls(formLegend) {
  if (formLegend.getAttribute(INJECTED_MARKER) === "true") return;
  formLegend.setAttribute(INJECTED_MARKER, "true");

  const root = document.createElement("div");
  root.className = "sftools-incident-legend-actions";
  formLegend.insertBefore(root, formLegend.firstChild);

  const reactRoot = ReactDOM.createRoot(root);
  const modalScope = getTabScope(formLegend);
  reactRoot.render(
    <React.StrictMode>
      <NewIncidentGeneratorControls containerElement={root} modalScope={modalScope} />
    </React.StrictMode>,
  );

  injectedRoots.set(formLegend, { root, reactRoot });
}

function removeFormLegendControls(formLegend) {
  const entry = injectedRoots.get(formLegend);
  if (!entry) return;
  const { root, reactRoot } = entry;
  try {
    reactRoot.unmount();
  } catch (_) {}
  root.remove();
  formLegend.removeAttribute(INJECTED_MARKER);
  injectedRoots.delete(formLegend);
}

function removeAllFormLegendControls() {
  for (const formLegend of [...injectedRoots.keys()]) {
    removeFormLegendControls(formLegend);
  }
}

function checkNewIncidentPage() {
  lastCheck = Date.now();
  chrome.storage.local.get(STORAGE_KEYS.NEW_INCIDENT_HELPER_TOGGLE, (result) => {
    const raw = result[STORAGE_KEYS.NEW_INCIDENT_HELPER_TOGGLE];
    if (raw === undefined) {
      chrome.storage.local.set({ [STORAGE_KEYS.NEW_INCIDENT_HELPER_TOGGLE]: false });
      removeAllFormLegendControls();
      wasOnNewIncidentPage = false;
      return;
    }
    const enabled = raw === true;
    if (!enabled) {
      removeAllFormLegendControls();
      wasOnNewIncidentPage = false;
      return;
    }
    runCheckWithRetry();
  });
}

function runCheck() {
  const allFormLegends = querySelectorAllDeep(document.body, FORM_LEGEND_SELECTOR);
  const seenFormLegends = new Set();

  for (const formLegend of allFormLegends) {
    const scope = findModalContainer(formLegend) || document.body;
    const titlesInScope = querySelectorAllDeep(scope, MODAL_TITLE_SELECTOR);
    const hasIncidentTitle = titlesInScope.some((el) =>
      el.textContent.trim().includes(NEW_INCIDENT_TEXT),
    );
    if (hasIncidentTitle) {
      seenFormLegends.add(formLegend);
      injectFormLegendControls(formLegend);
    }
  }

  const toRemove = [];
  for (const formLegend of injectedRoots.keys()) {
    if (!document.contains(formLegend) || !seenFormLegends.has(formLegend)) {
      toRemove.push(formLegend);
    }
  }
  for (const formLegend of toRemove) {
    removeFormLegendControls(formLegend);
  }

  wasOnNewIncidentPage = seenFormLegends.size > 0;
  return seenFormLegends.size;
}

function runCheckWithRetry(retryIndex = 0) {
  const injected = runCheck();
  if (injected > 0 || retryIndex >= RETRY_DELAYS_MS.length) return;
  const delay = RETRY_DELAYS_MS[retryIndex];
  setTimeout(() => {
    chrome.storage.local.get(STORAGE_KEYS.NEW_INCIDENT_HELPER_TOGGLE, (result) => {
      if (result[STORAGE_KEYS.NEW_INCIDENT_HELPER_TOGGLE] !== true) return;
      runCheckWithRetry(retryIndex + 1);
    });
  }, delay);
}

// Throttle: avoid running on every DOM mutation
function throttledCheck() {
  const now = Date.now();
  if (now - lastCheck < THROTTLE_MS) {
    if (timeoutId == null) {
      timeoutId = setTimeout(() => {
        timeoutId = null;
        checkNewIncidentPage();
      }, THROTTLE_MS - (now - lastCheck));
    }
    return;
  }
  if (timeoutId != null) {
    clearTimeout(timeoutId);
    timeoutId = null;
  }
  checkNewIncidentPage();
}

const observer = new MutationObserver(throttledCheck);
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes[STORAGE_KEYS.NEW_INCIDENT_HELPER_TOGGLE]) {
    throttledCheck();
  }
});

function start() {
  ensureToaster();
  checkNewIncidentPage();
  if (document.readyState !== "complete") {
    window.addEventListener("load", () => checkNewIncidentPage(), { once: true });
  }
}
start();
