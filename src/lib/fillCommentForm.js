/**
 * Fills the comment form fields (textarea + optional Public checkbox).
 * Dispatches input/change/blur/focus so Salesforce UI reacts.
 * @param {HTMLTextAreaElement | null} textarea
 * @param {HTMLInputElement | null} checkbox - "Public" checkbox
 * @param {string} text
 * @param {{ checkPublic?: boolean }} [opts]
 * @returns {boolean} - true if any action was performed
 */
export function fillCommentForm(textarea, checkbox, text, opts = {}) {
  const { checkPublic = true } = opts;
  let didSomething = false;

  if (textarea) {
    textarea.value = text;
    textarea.style.height = "200px";
    textarea.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
    textarea.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    textarea.dispatchEvent(new Event("blur", { bubbles: true, cancelable: true }));
    textarea.dispatchEvent(new Event("focus", { bubbles: true, cancelable: true }));
    didSomething = true;
  }

  if (checkPublic && checkbox && !checkbox.checked) {
    checkbox.click();
    checkbox.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
  }

  return didSomething;
}
