import { STORAGE_KEYS } from "../../constants/storage";

const INTERVAL_MS = 4 * 60 * 1000;

let intervalId = null;
let visibilityOverrideActive = false;

function simulateActivity() {
  document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: Math.random() * 100, clientY: Math.random() * 100 }));
  document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Shift", code: "ShiftLeft" }));
  document.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Shift", code: "ShiftLeft" }));
}

function overrideVisibility() {
  if (visibilityOverrideActive) return;
  visibilityOverrideActive = true;

  Object.defineProperty(document, "hidden", { get: () => false, configurable: true });
  Object.defineProperty(document, "visibilityState", { get: () => "visible", configurable: true });
  document.hasFocus = () => true;

  document.addEventListener("visibilitychange", (e) => {
    e.stopImmediatePropagation();
  }, true);
}

function restoreVisibility() {
  if (!visibilityOverrideActive) return;
  visibilityOverrideActive = false;

  delete document.hidden;
  delete document.visibilityState;
  delete document.hasFocus;
}

function start() {
  if (intervalId) return;
  overrideVisibility();
  intervalId = setInterval(simulateActivity, INTERVAL_MS);
}

function stop() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  restoreVisibility();
}

function init() {
  chrome.storage.local.get(STORAGE_KEYS.ANTI_IDLE_TOGGLE, (result) => {
    if (result[STORAGE_KEYS.ANTI_IDLE_TOGGLE] === true) {
      start();
    }
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[STORAGE_KEYS.ANTI_IDLE_TOGGLE]) return;
    if (changes[STORAGE_KEYS.ANTI_IDLE_TOGGLE].newValue === true) {
      start();
    } else {
      stop();
    }
  });
}

init();
