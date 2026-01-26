/**
 * Incident alert types: single entry point.
 * 1) Try type-first (rawMatch + getSubject).
 * 2) Else parse quoted title and match by body/prefix, then apply template.
 */

import { parsePdTitle, sentenceCase } from "./parse.js";
import {
  ALERT_TYPES,
  BASE_FORM_DEFAULTS,
  INCIDENT_LOOKUP_DEFAULTS,
  PREFIX_OVERRIDES,
} from "./config.js";

export { BASE_FORM_DEFAULTS, INCIDENT_LOOKUP_DEFAULTS, PREFIX_OVERRIDES, ALERT_TYPES };

function matches(type, parsed) {
  const { keywords, prefix, prefixPattern } = type.match || {};
  if (keywords?.length && !keywords.some((kw) => parsed.body.toLowerCase().includes(String(kw).toLowerCase())))
    return false;
  if (prefix != null && parsed.prefix !== prefix) return false;
  if (prefixPattern && !prefixPattern.test(parsed.prefix)) return false;
  return true;
}

function applyTemplate(template, parsed) {
  return template
    .replace(/\{body\}/g, parsed.body)
    .replace(/\{prefix\}/g, parsed.prefix);
}

function mergeFormDefaults(overrides = []) {
  const byLabel = new Map(BASE_FORM_DEFAULTS.map(({ fieldLabel, value }) => [fieldLabel, value]));
  for (const { fieldLabel, value } of overrides) {
    if (fieldLabel != null) byLabel.set(fieldLabel, value);
  }
  return Array.from(byLabel.entries(), ([fieldLabel, value]) => ({ fieldLabel, value }));
}

export function getCaseInfoFromPdTitle(rawTitle) {
  if (!rawTitle || typeof rawTitle !== "string") return null;
  const trimmed = rawTitle.trim();
  if (!trimmed) return null;

  for (const type of ALERT_TYPES) {
    if (type.rawMatch && type.getSubject && type.rawMatch(trimmed)) {
      const subject = type.getSubject(trimmed);
      if (subject) {
        return { subject, formDefaults: mergeFormDefaults(type.formOverrides), alertTypeName: type.name };
      }
    }
  }

  const parsed = parsePdTitle(trimmed);
  if (!parsed) return null;

  const type = ALERT_TYPES.find((t) => !t.rawMatch && matches(t, parsed));
  if (!type?.subjectFormat) return null;

  let bodyForSubject = parsed.body;
  if (type.id === "failed-transfer") {
    bodyForSubject = parsed.failedTransferCode
      ? "Failed transfer for " + parsed.failedTransferCode
      : "Failed transfer";
  }
  const isFailedTransfer = type.id === "failed-transfer";
  const displayPrefix = isFailedTransfer
    ? (PREFIX_OVERRIDES[parsed.prefix.toLowerCase()] ?? sentenceCase(parsed.prefix))
    : (PREFIX_OVERRIDES[parsed.prefix.toLowerCase()] ?? parsed.prefix);
  const subject = applyTemplate(type.subjectFormat, {
    ...parsed,
    prefix: displayPrefix,
    body: bodyForSubject,
  });
  const formDefaults = mergeFormDefaults(type.formOverrides);
  return { subject, formDefaults, alertTypeName: type.name };
}
