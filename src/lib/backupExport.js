import { BACKUP_SETTINGS_KEYS, STORAGE_KEYS } from "../constants/storage";

export const BACKUP_VERSION = 3;

export function processImportedTemplates(jsonData) {
  const templates = Array.isArray(jsonData) ? jsonData : jsonData?.templates;
  if (!Array.isArray(templates)) {
    throw new Error("Invalid backup: missing templates array");
  }
  return templates.map((category) => ({
    ...category,
    messages: category.messages.map((msg) => ({
      ...msg,
      ...(msg.alias && { alias: msg.alias }),
    })),
  }));
}

/** v3 `settings`, or legacy v2 `pagerDuty` nested object. */
function extractSettingsFromBackup(jsonData) {
  if (!jsonData || typeof jsonData !== "object" || Array.isArray(jsonData)) {
    return null;
  }
  if (jsonData.settings && typeof jsonData.settings === "object") {
    return { ...jsonData.settings };
  }
  if (jsonData.pagerDuty && typeof jsonData.pagerDuty === "object") {
    return { ...jsonData.pagerDuty };
  }
  return null;
}

export function parseBackupFile(jsonData) {
  if (Array.isArray(jsonData)) {
    return {
      templates: processImportedTemplates(jsonData),
      settings: null,
    };
  }
  if (jsonData && typeof jsonData === "object" && Array.isArray(jsonData.templates)) {
    return {
      templates: processImportedTemplates(jsonData),
      settings: extractSettingsFromBackup(jsonData),
    };
  }
  throw new Error("Invalid backup file format");
}

export function buildBackupPayload(templates, settings) {
  const settingsPayload = {};
  for (const key of BACKUP_SETTINGS_KEYS) {
    if (settings[key] !== undefined) {
      settingsPayload[key] = settings[key];
    }
  }
  return {
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    templates,
    settings: settingsPayload,
  };
}

/** Apply only keys present in the backup; omit null settings to leave storage unchanged. */
export function settingsToStorage(settings) {
  if (!settings || typeof settings !== "object") return {};

  const out = {};
  for (const key of BACKUP_SETTINGS_KEYS) {
    if (settings[key] === undefined) continue;
    if (key === STORAGE_KEYS.SEVEN_DAYS_AMOUNT) {
      out[key] = settings[key];
      continue;
    }
    if (key === STORAGE_KEYS.PD_API_TOKEN) {
      out[key] = String(settings[key] ?? "");
      continue;
    }
    if (typeof settings[key] === "boolean") {
      out[key] = settings[key];
      continue;
    }
    out[key] = settings[key];
  }
  return out;
}

export function readSettingsFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(BACKUP_SETTINGS_KEYS, (result) => resolve(result));
  });
}

export function readTemplatesFromStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(STORAGE_KEYS.BUTTON_MESSAGES, (result) => {
      resolve(result[STORAGE_KEYS.BUTTON_MESSAGES] || []);
    });
  });
}
