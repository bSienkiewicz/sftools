
/** Extract the part inside single quotes, or null. */
export function extractQuotedPart(title) {
  const match = title.match(/'([^']+)'/);
  return match ? match[1].trim() : null;
}

/** Prefix from the part before the quote (policy/host/query). */
export function getPrefixFromRaw(rawTitle) {
  const beforeQuote = rawTitle.split("'")[0] || "";
  const dmCarriers = beforeQuote.match(/DM-CARRIERS-DM(\d)/i);
  if (dmCarriers) return "DM" + dmCarriers[1];
  const dmScheduler = beforeQuote.match(/DM-SCHEDULER-DM(\d)/i);
  if (dmScheduler) return "DM" + dmScheduler[1];
  const mpSegment = beforeQuote.match(/_MP_([A-Za-z0-9]+)_/);
  if (mpSegment) return mpSegment[1].toUpperCase();
  // Prefix = everything before the first dot (e.g. hermes, mpm4dm01, hm, cycleon)
  const hostSegment = rawTitle.match(/^([a-zA-Z0-9]+)\./);
  if (hostSegment) {
    const seg = hostSegment[1];
    return /[0-9]/.test(seg) ? seg.toUpperCase() : seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
  }
  if (/^Metric\s+query/i.test(rawTitle.trim())) return "DM";
  if (/^Transaction\s+query/i.test(rawTitle.trim())) return "DM ALL";
  return null;
}

// --- Composable body helpers (use in type-specific extract) ---

export function stripSeverity(s) {
  if (!s) return s;
  return s
    .replace(/\s*\*\*\*CRITICAL\*\*\*\s*-\s*/gi, "")
    .replace(/\s*\*\*\*INFO\*\*\*\s*/gi, "")
    .replace(/\s*\*\*\*[A-Za-z]+\*\*\*\s*/gi, " ") // mid-string e.g. ***Critical***
    .trim()
    .replace(/\s+/g, " ");
}

/** Remove leading New Relic policy IDs: DM01 -, SHD02 -, HM01 -, JLP01 -, etc. */
export function stripLeadingPolicyIds(s) {
  if (!s) return s;
  return s.replace(/^(DM\d+\s*-\s*|SHD\d*\s*-\s*|SHD\s*-\s*|HM\d+\s*-\s*|JLP\d*\s*-\s*)+/i, "").trim();
}

/** Mid-string fragments like " - DM02 - ", "PRD - DM5 ". */
export function stripMidPolicyFragments(s) {
  if (!s) return s;
  return s
    .replace(/\s*-\s*DM\d+\s*-\s*/g, " ")
    .replace(/\s*PRD\s*-\s*DM\d+\s*/gi, " ")
    .trim();
}

/** Error codes like E15001 (use only when type does not need them in body). */
export function stripErrorCodes(s) {
  if (!s) return s;
  return s.replace(/\s*E\d+\s*/g, " ").trim();
}

/** "DM Native Allocation ", "DM Allocation " → "Allocation ", trailing "DM ". */
export function stripDmBodyPrefix(s) {
  if (!s) return s;
  let out = s
    .replace(/^DM\s+Native\s+Allocation\s+/i, "")
    .replace(/^DM\s+Allocation\s+/i, "Allocation ")
    .replace(/^DM\s+/i, "")
    .trim();
  return out || null;
}

/**
 * Light normalization for classification only (keyword matching).
 * Severity + leading policy IDs so we can match keywords reliably.
 */
export function normalizeForMatching(quoted) {
  if (!quoted) return null;
  const s = stripLeadingPolicyIds(stripSeverity(quoted));
  return s || null;
}

/**
 * Full body normalization for subject/display when no type-specific logic.
 * Severity → mid fragments → leading IDs → error codes → DM body prefix.
 */
export function normalizeBodyDefault(quoted) {
  if (!quoted) return null;
  let s = stripSeverity(quoted);
  s = stripMidPolicyFragments(s);
  s = stripLeadingPolicyIds(s);
  s = stripErrorCodes(s);
  s = stripDmBodyPrefix(s);
  return s || null;
}

// --- Type-first helpers (from raw title) ---

export function getFailedTransferCode(rawTitle) {
  const beforeQuote = rawTitle.split("'")[0] || "";
  const m = beforeQuote.match(/_([A-Za-z0-9\-]+)\s+query/i) || beforeQuote.match(/_([A-Za-z0-9\-]+)$/);
  const code = m ? m[1].trim() : null;
  return code && code.toLowerCase() !== "null" ? code : null;
}

export function sentenceCase(str) {
  if (!str || typeof str !== "string") return str;
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function getTrepCarrier(rawTitle) {
  const m = rawTitle.match(/^([a-z0-9_\-]+)_prd/i);
  return m ? m[1] : null;
}

export function getFailedPipelineName(rawTitle) {
  const match = rawTitle.match(/Failed Pipeline:\s*(.+)/i);
  if (!match) return null;
  const path = match[1].trim();
  const part = path.match(/([a-z0-9\-]+(?:-[a-z0-9\-]+)*)\s*#\d+/i);
  return part ? part[1] : path.split("»").pop()?.trim() || path;
}

export function pipelineSegmentToDisplayName(segment) {
  if (!segment) return "";
  const base = segment.replace(/-dm\d+.*$/i, "").replace(/-build-and-deploy$/i, "");
  return base
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}
