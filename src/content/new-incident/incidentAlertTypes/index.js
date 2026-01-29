import { extractQuotedPart, getPrefixFromRaw, normalizeForMatching, sentenceCase } from "./parse.js";
import {
  ALERT_TYPES,
  BASE_FORM_DEFAULTS,
  INCIDENT_LOOKUP_DEFAULTS,
  PREFIX_OVERRIDES,
} from "./config.js";

export { BASE_FORM_DEFAULTS, INCIDENT_LOOKUP_DEFAULTS };

function applyTemplate(template, extracted) {
  return template
    .replace(/\{body\}/g, extracted.body ?? "")
    .replace(/\{prefix\}/g, extracted.prefix ?? "");
}

function mergeFormDefaults(overrides = []) {
  const byLabel = new Map(BASE_FORM_DEFAULTS.map(({ fieldLabel, value }) => [fieldLabel, value]));
  for (const { fieldLabel, value } of overrides || []) {
    if (fieldLabel != null) byLabel.set(fieldLabel, value);
  }
  return Array.from(byLabel.entries(), ([fieldLabel, value]) => ({ fieldLabel, value }));
}

function buildContext(raw) {
  const quoted = extractQuotedPart(raw);
  const prefix = getPrefixFromRaw(raw);
  const bodyForMatch = quoted ? normalizeForMatching(quoted) : null;
  return { quoted, prefix, bodyForMatch };
}

export function getCaseInfoFromPdTitle(rawTitle) {
  if (!rawTitle || typeof rawTitle !== "string") return null;
  const raw = rawTitle.trim();
  if (!raw) return null;

  const context = buildContext(raw);

  for (const type of ALERT_TYPES) {
    if (!type.classify(raw, context)) continue;

    const extracted = type.extract(raw, context);
    if (!extracted || (extracted.body == null && extracted.subject == null)) continue;

    const displayPrefix =
      type.id === "failed-transfer"
        ? (PREFIX_OVERRIDES[extracted.prefix?.toLowerCase()] ?? sentenceCase(extracted.prefix))
        : (PREFIX_OVERRIDES[extracted.prefix?.toLowerCase()] ?? extracted.prefix);

    const subject =
      extracted.subject ??
      (type.subjectFormat
        ? applyTemplate(type.subjectFormat, { ...extracted, prefix: displayPrefix })
        : null);
    if (subject == null) continue;

    return {
      subject,
      formDefaults: mergeFormDefaults(type.formOverrides),
      alertTypeName: type.name,
      carrierModule: extracted.carrierModule ?? null,
    };
  }

  return null;
}
