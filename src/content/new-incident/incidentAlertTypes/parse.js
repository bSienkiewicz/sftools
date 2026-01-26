/**
 * Parse PD raw titles: quoted body normalization, prefix extraction, and helpers for type-first alerts.
 */

export function extractQuotedPart(title) {
  const match = title.match(/'([^']+)'/);
  return match ? match[1].trim() : null;
}

/**
 * Normalize quoted alert body
 */
export function normalizeQuotedBody(quoted) {
  let s = quoted
    .replace(/\s*\*\*\*CRITICAL\*\*\*\s*-\s*/gi, "") // severity tag
    .replace(/\s*\*\*\*INFO\*\*\*\s*/gi, "") // severity tag
    .replace(/\s*-\s*DM\d+\s*-\s*/g, " ") // " - DM02 - " mid-string → space
    .replace(/\s*PRD\s*-\s*DM\d+\s*/gi, " ") // "PRD - DM5 " etc.
    .replace(/\s*E\d+\s*/g, " ") // error codes like "E15001 "
    //.replace(/\s*-\s*SHD\d*\s*-\s*/gi, " ") // " - SHD02 - " / " - SHD - "
    //.replace(/\s*-\s*SHD\s*-\s*/gi, " ")
    .trim();
  s = s.replace(/^(DM\d+\s*-\s*|SHD\d*\s*-\s*|SHD\s*-\s*|HM\d+\s*-\s*)+/i, "").trim(); // Leading New Relic policy IDs only (DM01 -, SHD02 -, HM01 -);
  s = s.replace(/^DM\s+Native\s+Allocation\s+/i, "").trim(); // leave e.g. "<Carrier> (n) ..."
  s = s.replace(/^DM\s+Allocation\s+/i, "Allocation ").trim(); // "Allocation <Carrier> ..."
  s = s.replace(/^DM\s+/i, "").trim(); // any remaining leading "DM "
  return s || null;
}

export function getPrefix(rawTitle) {
  const beforeQuote = rawTitle.split("'")[0] || "";
  const dmCarriers = beforeQuote.match(/DM-CARRIERS-DM(\d)/i);
  if (dmCarriers) return "DM" + dmCarriers[1];
  const dmScheduler = beforeQuote.match(/DM-SCHEDULER-DM(\d)/i);
  if (dmScheduler) return "DM" + dmScheduler[1];
  const mpSegment = beforeQuote.match(/_MP_([A-Za-z0-9]+)_/);
  if (mpSegment) return mpSegment[1].toUpperCase();
  const hostSegment = rawTitle.match(/^([a-zA-Z0-9]+)\.(?:mpm\.metapack\.(?:net|com)|taxipost\.be|dhl\.com)/i);
  if (hostSegment) {
    const seg = hostSegment[1];
    return /[0-9]/.test(seg) ? seg.toUpperCase() : seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase();
  }
  if (/^Metric\s+query/i.test(rawTitle.trim())) return "DM";
  return null;
}

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

export function parsePdTitle(rawTitle) {
  if (!rawTitle || typeof rawTitle !== "string") return null;
  const trimmed = rawTitle.trim();
  if (!trimmed) return null;
  const quoted = extractQuotedPart(trimmed);
  if (!quoted) return null;
  const body = normalizeQuotedBody(quoted);
  if (!body) return null;
  const prefix = getPrefix(trimmed);
  if (prefix == null) return null;
  const failedTransferCode = getFailedTransferCode(trimmed);
  return { body, prefix, failedTransferCode };
}
