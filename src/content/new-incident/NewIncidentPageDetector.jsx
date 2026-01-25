/**
 * Detects when the "New Case: Incident" modal is visible and injects
 * a React UI (input + button) into .form-legend-desktop.
 */

import React from "react";
import ReactDOM from "react-dom/client";
import PDIncidentGeneratorControls from "./PDIncidentGeneratorControls";

const MODAL_TITLE_SELECTOR = "h2.slds-modal__title";
const NEW_INCIDENT_TEXT = "New Case: Incident";
const FORM_LEGEND_SELECTOR = ".form-legend-desktop";
const INJECTED_MARKER = "data-sftools-incident-injected";
const THROTTLE_MS = 150;

let wasOnNewIncidentPage = false;
let lastCheck = 0;
let timeoutId = null;
/** @type {Map<Element, { root: HTMLElement; reactRoot: import("react-dom/client").Root }>} */
const injectedRoots = new Map();

function injectFormLegendControls(formLegend) {
  if (formLegend.getAttribute(INJECTED_MARKER) === "true") return;
  formLegend.setAttribute(INJECTED_MARKER, "true");

  const root = document.createElement("div");
  root.className = "sftools-incident-legend-actions";
  formLegend.insertBefore(root, formLegend.firstChild);

  const reactRoot = ReactDOM.createRoot(root);
  reactRoot.render(
    <React.StrictMode>
      <PDIncidentGeneratorControls />
    </React.StrictMode>,
  );

  injectedRoots.set(formLegend, { root, reactRoot });
}

function removeFormLegendControls() {
  injectedRoots.forEach(({ root, reactRoot }, formLegend) => {
    reactRoot.unmount();
    root.remove();
    formLegend.removeAttribute(INJECTED_MARKER);
  });
  injectedRoots.clear();
}

function checkNewIncidentPage() {
  lastCheck = Date.now();
  const titleEl = document.querySelector(MODAL_TITLE_SELECTOR);
  const isOnNewIncidentPage =
    titleEl && titleEl.textContent.trim().includes(NEW_INCIDENT_TEXT);

  if (isOnNewIncidentPage) {
    if (!wasOnNewIncidentPage) {
      wasOnNewIncidentPage = true;
    }
    const modal = titleEl?.closest(".slds-modal");
    const scope = modal || document;
    const formLegend = scope.querySelector(FORM_LEGEND_SELECTOR);
    if (formLegend) injectFormLegendControls(formLegend);
  } else {
    if (wasOnNewIncidentPage) {
      removeFormLegendControls();
      wasOnNewIncidentPage = false;
    }
  }
}

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
});

checkNewIncidentPage();
