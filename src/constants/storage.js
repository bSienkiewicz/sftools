/**
 * Chrome storage keys used across the extension (popup, content scripts, background).
 */

export const STORAGE_KEYS = {
  // Comment templates
  BUTTON_MESSAGES: "button_messages",
  SHOW_TEMPLATES: "showTemplates",
  ENABLE_TEXT_EXPANSION: "enableTextExpansion",
  SHOW_TEXT_EXPANSION_ALIAS: "showTextExpansionAlias",
  QUICK_SEND_TOGGLE: "quickSendToggle",
  // Seven days highlighting
  SHOW_SEVEN_DAYS: "showSevenDays",
  SEVEN_DAYS_AMOUNT: "sevenDaysAmount",
  // New Case: Incident helper
  NEW_INCIDENT_HELPER_TOGGLE: "newIncidentHelperToggle",
  AUTO_CLOSE_PD_PAGES: "autoClosePdPages",
  BATCH_TAB_GROUPING: "batchTabGrouping",
  // Other
  INITIALIZED: "initialized",
  UPDATE_AVAILABLE: "update_available",
  LATEST_VERSION: "latest_version",
};

/** Keys used by the comment-templates feature (for batch get + onChanged). */
export const COMMENT_TEMPLATES_KEYS = [
  STORAGE_KEYS.BUTTON_MESSAGES,
  STORAGE_KEYS.SHOW_TEMPLATES,
  STORAGE_KEYS.ENABLE_TEXT_EXPANSION,
  STORAGE_KEYS.SHOW_TEXT_EXPANSION_ALIAS,
  STORAGE_KEYS.QUICK_SEND_TOGGLE,
];
