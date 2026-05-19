import { STORAGE_KEYS } from "../../constants/storage";

const ACTIVITY_INTERVAL_MS = 4 * 60 * 1000;
const MODAL_POLL_MS = 2000;

let activityIntervalId = null;
let modalObserver = null;

function simulateActivity() {
  document.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: Math.random() * 100, clientY: Math.random() * 100 }));
  document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Shift", code: "ShiftLeft" }));
  document.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true, key: "Shift", code: "ShiftLeft" }));
}

function dismissIdleModal() {
  const buttons = document.querySelectorAll("div.modal-footer button.uiButton");
  for (const btn of buttons) {
    const label = btn.querySelector(".label");
    if (label && label.textContent.trim() === "Continue Working") {
      btn.click();
      console.log("Dismissed idle modal");
      return true;
    }
  }
  return false;
}

function startModalWatcher() {
  if (modalObserver) return;
  modalObserver = new MutationObserver(() => {
    dismissIdleModal();
  });
  modalObserver.observe(document.body, { childList: true, subtree: true });
}

function stopModalWatcher() {
  if (modalObserver) {
    modalObserver.disconnect();
    modalObserver = null;
  }
}

function start() {
  if (activityIntervalId) return;
  activityIntervalId = setInterval(simulateActivity, ACTIVITY_INTERVAL_MS);
  startModalWatcher();
}

function stop() {
  if (activityIntervalId) {
    clearInterval(activityIntervalId);
    activityIntervalId = null;
  }
  stopModalWatcher();
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
