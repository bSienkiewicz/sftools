function normalizeLabelText(text) {
  if (text == null || typeof text !== "string") return "";
  return text.replace(/\s+/g, " ").replace(/^\s*\*?\s*/, "").trim();
}

const COMBOBOX_TRIGGER_SELECTOR = 'button[role="combobox"]';

// Walk DOM + shadow roots (max depth 5) to find all elements matching selector
function querySelectorAllDeep(root, selector, maxDepth = 5) {
  const results = [];
  if (!root) return results;

  function walk(node, depth) {
    if (depth > maxDepth) return;
    try {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.matches && node.matches(selector)) results.push(node);
        for (const child of node.children || []) walk(child, depth);
        if (node.shadowRoot) walk(node.shadowRoot, depth + 1);
      } else if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
        for (const child of node.children || []) walk(child, depth);
      }
    } catch (_) {}
  }

  walk(root, 0);
  return results;
}

function findVisibleComboboxes(scope) {
  const root = scope && scope !== document.body ? scope : document.body;
  const triggers = querySelectorAllDeep(root, COMBOBOX_TRIGGER_SELECTOR);
  return triggers.map((trigger) => ({
    ariaLabel: trigger.getAttribute("aria-label") ?? "",
    normalizedLabel: normalizeLabelText(trigger.getAttribute("aria-label")),
    currentValue: trigger.getAttribute("data-value") ?? "",
    listboxId: trigger.getAttribute("aria-controls") ?? null,
    trigger,
  }));
}

export function selectComboboxOption(scope, fieldLabel, value, openDelayMs = 50) {
  if (!fieldLabel || value == null) return Promise.resolve(false);

  const root = scope && scope !== document.body ? scope : document.body;
  const fieldLabelNorm = normalizeLabelText(fieldLabel);
  const comboboxes = findVisibleComboboxes(root);
  const match = comboboxes.find(
    (cb) => cb.normalizedLabel === fieldLabelNorm || cb.ariaLabel === fieldLabel
  );
  if (!match) return Promise.resolve(false);

  const trigger = match.trigger;
  trigger.focus();
  trigger.click();

  return new Promise((resolve) => {
    const trySelect = () => {
      const listboxId = trigger.getAttribute("aria-controls");
      const listbox = listboxId ? document.getElementById(listboxId) : null;
      const host =
        trigger.getRootNode?.()?.host ||
        trigger.closest?.("lightning-base-combobox") ||
        trigger.closest?.("lightning-combobox");
      // Options may live in listbox or in host shadow root (Lightning renders lazily)
      const searchRoots = [listbox, host, host?.shadowRoot].filter(Boolean);
      let option = null;
      for (const node of searchRoots) {
        option = node.querySelector?.(
          `lightning-base-combobox-item[data-value="${CSS.escape(value)}"]`
        );
        if (option) break;
      }
      if (option) {
        option.click();
        resolve(true);
        return true;
      }
      return false;
    };

    // Retry: options can appear after dropdown opens (200ms, 450ms, 700ms)
    const delays = [200, 450, 700];
    let step = 0;
    const run = () => {
      if (trySelect()) return;
      step += 1;
      if (step < delays.length) {
        setTimeout(run, delays[step] - (step === 1 ? 0 : delays[step - 1]));
      } else {
        resolve(false);
      }
    };
    setTimeout(run, delays[0]);
  });
}

export async function applyIncidentFormDefaults(scope, defaults, delayBetweenMs = 250) {
  if (!Array.isArray(defaults) || defaults.length === 0) return;
  const root = scope || document.body;

  for (const { fieldLabel, value } of defaults) {
    await selectComboboxOption(root, fieldLabel, value);
    await new Promise((r) => setTimeout(r, delayBetweenMs));
  }
}
