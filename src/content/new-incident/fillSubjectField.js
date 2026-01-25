import { querySelectorAllDeep } from "./domUtils";

/** Find the Case Subject input (inside records-record-layout-item or by label). */
function findSubjectInput(scope) {
  const root = scope && scope !== document.body ? scope : document.body;
  const item = querySelectorAllDeep(root, 'records-record-layout-item[field-label="Subject"]')[0];
  if (item) {
    const input = querySelectorAllDeep(item, 'input[name="Subject"]')[0]
      || querySelectorAllDeep(item, "input.slds-input[type=text]")[0];
    if (input) return input;
  }
  return querySelectorAllDeep(root, 'input[name="Subject"]')[0] || null;
}

/** Find the Case Description textarea (inside records-record-layout-item). */
function findDescriptionTextarea(scope) {
  const root = scope && scope !== document.body ? scope : document.body;
  const item = querySelectorAllDeep(root, 'records-record-layout-item[field-label="Description"]')[0];
  if (item) {
    const textarea = querySelectorAllDeep(item, "textarea.slds-textarea")[0]
      || querySelectorAllDeep(item, "textarea[part=textarea]")[0]
      || querySelectorAllDeep(item, "textarea")[0];
    if (textarea) return textarea;
  }
  return null;
}

/**
 * Set the Case Subject field value.
 * @param {Element} scope - Modal or form container
 * @param {string} value - Subject text (max 255 in SF)
 * @returns {boolean} true if the field was found and set
 */
export function fillSubjectField(scope, value) {
  const input = findSubjectInput(scope);
  if (!input || value == null) return false;
  const text = String(value).slice(0, 255);
  input.focus();
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}

/**
 * Set the Case Description field value (e.g. PagerDuty URL).
 * @param {Element} scope - Modal or form container
 * @param {string} value - Description text (max 32000 in SF)
 * @returns {boolean} true if the field was found and set
 */
export function fillDescriptionField(scope, value) {
  const textarea = findDescriptionTextarea(scope);
  if (!textarea || value == null) return false;
  const text = String(value).slice(0, 32000);
  textarea.focus();
  textarea.value = text;
  textarea.dispatchEvent(new Event("input", { bubbles: true }));
  textarea.dispatchEvent(new Event("change", { bubbles: true }));
  return true;
}
