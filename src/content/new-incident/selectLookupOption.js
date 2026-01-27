import { normalizeLabelText, querySelectorAllDeep } from "./domUtils";

const LOOKUP_INPUT_SELECTOR = 'input[role="combobox"][type="text"]';
const POLL_INTERVAL_MS = 150;
const FIRST_POLL_DELAY_MS = 400;
const DEFAULT_WAIT_MS = 10000;

function findLookupInputByLabel(scope, fieldLabel) {
  const root = scope && scope !== document.body ? scope : document.body;
  const labels = querySelectorAllDeep(root, "label.slds-form-element__label");
  const fieldNorm = normalizeLabelText(fieldLabel);
  const label = labels.find((el) => normalizeLabelText(el.textContent) === fieldNorm);
  if (!label) return null;

  const forId = label.getAttribute("for");
  if (forId) {
    const input = document.getElementById(forId);
    if (input && input.matches?.(LOOKUP_INPUT_SELECTOR)) return input;
  }

  const container = label.closest("lightning-grouped-combobox") || label.closest("[data-lookup]")?.closest?.("lightning-base-combobox");
  if (!container) return null;
  const inputs = querySelectorAllDeep(container, LOOKUP_INPUT_SELECTOR);
  return inputs[0] || null;
}

function findOptionContainingText(listbox, optionContainsText) {
  if (!listbox) return null;
  const items = listbox.querySelectorAll?.("lightning-base-combobox-item") || [];
  for (const item of items) {
    const text = (item.textContent || "").replace(/\s+/g, " ");
    const title = item.getAttribute("title") || "";
    const childTitle = item.querySelector?.("[title]")?.getAttribute("title") || "";
    if (
      text.includes(optionContainsText) ||
      title.includes(optionContainsText) ||
      childTitle.includes(optionContainsText)
    ) {
      return item;
    }
  }
  return null;
}

/**
 * Type search text into a lookup (Account/Contact etc.), wait for SF to fetch, then click the option
 * whose label/title contains optionContainsText.
 */
export async function selectLookupOption(
  scope,
  fieldLabel,
  searchText,
  optionContainsText,
  waitMaxMs = DEFAULT_WAIT_MS
) {
  if (!fieldLabel || !searchText || !optionContainsText) return false;

  const input = findLookupInputByLabel(scope, fieldLabel);
  if (!input) return false;

  input.focus();
  input.click();
  await new Promise((r) => setTimeout(r, 30));

  input.value = searchText;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
  await new Promise((r) => setTimeout(r, 50));

  input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", keyCode: 40, bubbles: true }));
  input.dispatchEvent(new KeyboardEvent("keyup", { key: "ArrowDown", keyCode: 40, bubbles: true }));

  const listboxId = input.getAttribute("aria-controls");
  const start = Date.now();

  return new Promise((resolve) => {
    function poll() {
      const listbox = listboxId ? document.getElementById(listboxId) : null;
      const host = input.getRootNode?.()?.host || input.closest?.("lightning-base-combobox");
      const searchRoots = [listbox, host?.shadowRoot].filter(Boolean);
      if (host?.shadowRoot) {
        const inShadow =
          host.shadowRoot.getElementById?.(listboxId) ||
          host.shadowRoot.querySelector?.("[role=listbox]");
        if (inShadow && !searchRoots.includes(inShadow)) searchRoots.push(inShadow);
      }

      for (const root of searchRoots) {
        const option = findOptionContainingText(root, optionContainsText);
        if (option) {
          option.click();
          resolve(true);
          return;
        }
      }

      if (Date.now() - start < waitMaxMs) {
        setTimeout(poll, POLL_INTERVAL_MS);
      } else {
        resolve(false);
      }
    }

    setTimeout(poll, FIRST_POLL_DELAY_MS);
  });
}

export async function applyIncidentLookupDefaults(scope, defaults, delayBetweenMs = 100) {
  if (!Array.isArray(defaults) || defaults.length === 0) return;
  const root = scope || document.body;

  for (const { fieldLabel, searchText, optionContains } of defaults) {
    await selectLookupOption(root, fieldLabel, searchText, optionContains);
    await new Promise((r) => setTimeout(r, delayBetweenMs));
  }
}
