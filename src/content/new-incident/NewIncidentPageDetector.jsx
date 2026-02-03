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

const processedElements = new Set();

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

// Smallest ancestor that contains only this form legend.
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

function isNewCasePage() {
  const url = window.location.href;
  return /\/lightning\/o\/Case\/new/.test(url);
}

function checkForElementsAndRender() {
  // Only process on the new case page
  if (!isNewCasePage()) return;

  // Check if feature is enabled
  chrome.storage.local.get(STORAGE_KEYS.NEW_INCIDENT_HELPER_TOGGLE, (result) => {
    const raw = result[STORAGE_KEYS.NEW_INCIDENT_HELPER_TOGGLE];
    if (raw === undefined) {
      chrome.storage.local.set({ [STORAGE_KEYS.NEW_INCIDENT_HELPER_TOGGLE]: false });
      return;
    }
    if (raw !== true) return;

    const allFormLegends = querySelectorAllDeep(document.body, FORM_LEGEND_SELECTOR);

    allFormLegends.forEach((formLegend) => {
      // Skip if already processed
      if (processedElements.has(formLegend) || formLegend.getAttribute(INJECTED_MARKER) === "true") {
        return;
      }

      // Check if this form legend is in a modal with "New Case: Incident" title
      const scope = findModalContainer(formLegend) || document.body;
      const titlesInScope = querySelectorAllDeep(scope, MODAL_TITLE_SELECTOR);
      const hasIncidentTitle = titlesInScope.some((el) =>
        el.textContent.trim().includes(NEW_INCIDENT_TEXT),
      );

      if (hasIncidentTitle) {
        formLegend.setAttribute(INJECTED_MARKER, "true");
        processedElements.add(formLegend);

        const root = document.createElement("div");
        root.className = "sftools-incident-legend-actions";
        formLegend.insertBefore(root, formLegend.firstChild);

        const modalScope = getTabScope(formLegend);
        ReactDOM.createRoot(root).render(
          <React.StrictMode>
            <NewIncidentGeneratorControls containerElement={root} modalScope={modalScope} />
          </React.StrictMode>,
        );
      }
    });
  });
}

const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

const observeDOM = debounce(checkForElementsAndRender, 300);

const observer = new MutationObserver(observeDOM);
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "local" && changes[STORAGE_KEYS.NEW_INCIDENT_HELPER_TOGGLE]) {
    checkForElementsAndRender();
  }
});

function start() {
  ensureToaster();
  checkForElementsAndRender();
  if (document.readyState !== "complete") {
    window.addEventListener("load", () => checkForElementsAndRender(), { once: true });
  }
}
start();
