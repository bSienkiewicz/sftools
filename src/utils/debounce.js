/**
 * Debounce function to limit excessive calls (e.g. in MutationObserver callbacks).
 * @param {(...args: unknown[]) => void} fn
 * @param {number} delayMs
 * @returns {(...args: unknown[]) => void}
 */
export function debounce(fn, delayMs) {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delayMs);
  };
}
