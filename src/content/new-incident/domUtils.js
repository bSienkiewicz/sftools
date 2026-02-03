// Shared DOM helpers for new-incident form automation

function normalizeLabelText(text) {
  if (text == null || typeof text !== "string") return "";
  return text.replace(/\s+/g, " ").replace(/^\s*\*?\s*/, "").trim();
}

function querySelectorAllDeep(root, selector, maxDepth = 5) {
  const results = [];
  if (!root) return results;

  function walk(node, depth) {
    if (depth > maxDepth) return;
    try {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.matches?.(selector)) results.push(node);
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

export { normalizeLabelText, querySelectorAllDeep };
