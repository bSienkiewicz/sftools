/**
 * Parses PagerDuty incident titles (MPM vs DM) and formats a Subject line for the Case form.
 * MPM: "machine|PD|Carrier - Alert name"
 * DM:  "DM|PD|Alert name"
 */

function extractQuotedPart(title) {
  const match = title.match(/'([^']+)'/);
  return match ? match[1].trim() : null;
}

/** Strip "***CRITICAL*** - " and "DM01 - " / "DM02 - " (New Relic policy) from quoted content. */
function stripCriticalAndPolicy(quoted) {
  return quoted
    .replace(/^\s*\*\*\*CRITICAL\*\*\*\s*-\s*/i, "")
    .replace(/^\s*DM\d+\s*-\s*/i, "")
    .trim();
}

/**
 * @param {string} rawTitle - Full title from PagerDuty (e.g. from h1)
 * @returns {string|null} Formatted subject or null if unparseable
 */
export function formatPagerDutySubject(rawTitle) {
  if (!rawTitle || typeof rawTitle !== "string") return null;
  const trimmed = rawTitle.trim();
  if (!trimmed) return null;

  const quoted = extractQuotedPart(trimmed);
  if (!quoted) return null;
  const body = stripCriticalAndPolicy(quoted);
  if (!body) return null;

  if (trimmed.includes("DM-CARRIERS")) {
    return `DM|PD|${body}`;
  }

  const mpmMachineMatch = trimmed.match(/^([a-zA-Z0-9]+)\./);
  if (mpmMachineMatch) {
    const machine = mpmMachineMatch[1].toUpperCase();
    return `${machine}|PD|${body}`;
  }

  return null;
}
