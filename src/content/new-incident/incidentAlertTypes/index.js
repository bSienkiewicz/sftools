/**
 * Alert classification — public API.
 *
 * • alert-mapping.json — all rules (bundled + fetched from GitHub)
 * • parse.js — low-level PD title string helpers
 * • extractFromConfig.js — runs declarative "extract" blocks from JSON
 */
import bundledAlertMapping from "./alert-mapping.json" with { type: "json" };
import { extractQuotedPart, getPrefixFromRaw, normalizeForMatching, sentenceCase } from "./parse.js";
import { buildExtractFn, isValidExtractConfig } from "./extractFromConfig.js";

export { bundledAlertMapping };
export const BASE_FORM_DEFAULTS = bundledAlertMapping.baseFormDefaults;
export const INCIDENT_LOOKUP_DEFAULTS = bundledAlertMapping.incidentLookupDefaults;

const GH_USERNAME = "bSienkiewicz";
const GH_REPO = "sftools";
const MAPPING_PATH = "src/content/new-incident/incidentAlertTypes/alert-mapping.json";

function hasKeyword(body, keywords) {
  const lower = (body || "").toLowerCase();
  return keywords.some((kw) => lower.includes(String(kw).toLowerCase()));
}

function testRegex(pattern, value, flags = "") {
  return pattern != null && value != null && new RegExp(pattern, flags).test(value);
}

function buildClassify(rule) {
  return (raw, ctx) => {
    if (rule.rawRegex && !testRegex(rule.rawRegex, raw, rule.rawFlags || "")) return false;
    for (const entry of rule.rawMatchAll ?? []) {
      const pattern = typeof entry === "string" ? entry : entry.pattern;
      const flags = typeof entry === "string" ? "" : entry.flags || "";
      if (!testRegex(pattern, raw, flags)) return false;
    }
    if (rule.requiresBodyForMatch && ctx?.bodyForMatch == null) return false;
    if (rule.bodyKeywords?.length && !hasKeyword(ctx.bodyForMatch, rule.bodyKeywords)) return false;
    if (rule.requiresPrefix && ctx?.prefix == null) return false;
    if (rule.prefixRegex && !testRegex(rule.prefixRegex, ctx.prefix, rule.prefixFlags || "")) return false;
    if (rule.prefixNotRegex && ctx?.prefix && testRegex(rule.prefixNotRegex, ctx.prefix, rule.prefixFlags || "")) {
      return false;
    }
    return true;
  };
}

function validateMapping(mapping) {
  if (!mapping || typeof mapping.version !== "number" || !Array.isArray(mapping.alertTypes)) {
    return false;
  }
  if (mapping.date != null && (typeof mapping.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(mapping.date))) {
    return false;
  }
  const ids = new Set();
  for (const t of mapping.alertTypes) {
    if (!t?.id || !t?.name || ids.has(t.id) || !isValidExtractConfig(t.extract)) return false;
    ids.add(t.id);
    try {
      buildClassify(t.classify || {});
    } catch {
      return false;
    }
  }
  return true;
}

export function resolveAlertMapping(remoteMapping) {
  return validateMapping(remoteMapping) ? remoteMapping : bundledAlertMapping;
}

function buildAlertTypes(mapping) {
  return mapping.alertTypes.map((typeDef) => ({
    id: typeDef.id,
    name: typeDef.name,
    classify: buildClassify(typeDef.classify || {}),
    extract: buildExtractFn(typeDef.extract),
    subjectFormat: typeDef.subjectFormat ?? null,
    formOverrides: typeDef.formOverrides ?? [],
  }));
}

const runtimeCache = new WeakMap();

function getRuntime(mapping) {
  if (!runtimeCache.has(mapping)) {
    runtimeCache.set(mapping, {
      alertTypes: buildAlertTypes(mapping),
      prefixOverrides: mapping.prefixOverrides,
      baseFormDefaults: mapping.baseFormDefaults,
    });
  }
  return runtimeCache.get(mapping);
}

function applyTemplate(template, extracted) {
  return template
    .replace(/\{body\}/g, extracted.body ?? "")
    .replace(/\{prefix\}/g, extracted.prefix ?? "");
}

function mergeFormDefaults(baseFormDefaults, overrides = []) {
  const byLabel = new Map(baseFormDefaults.map(({ fieldLabel, value }) => [fieldLabel, value]));
  for (const { fieldLabel, value } of overrides) {
    if (fieldLabel != null) byLabel.set(fieldLabel, value);
  }
  return Array.from(byLabel.entries(), ([fieldLabel, value]) => ({ fieldLabel, value }));
}

function buildContext(raw) {
  const quoted = extractQuotedPart(raw);
  return {
    quoted,
    prefix: getPrefixFromRaw(raw),
    bodyForMatch: quoted ? normalizeForMatching(quoted) : null,
  };
}

export function getCaseInfoFromPdTitle(rawTitle, remoteMapping = null) {
  if (!rawTitle?.trim()) return null;
  const raw = rawTitle.trim();
  const mapping = resolveAlertMapping(remoteMapping);
  const { alertTypes, prefixOverrides, baseFormDefaults } = getRuntime(mapping);
  const context = buildContext(raw);

  for (const type of alertTypes) {
    if (!type.classify(raw, context)) continue;
    const extracted = type.extract(raw, context);
    if (!extracted || (extracted.body == null && extracted.subject == null)) continue;

    const displayPrefix =
      type.id === "mpm-failed-transfer"
        ? (prefixOverrides[extracted.prefix?.toLowerCase()] ?? sentenceCase(extracted.prefix))
        : (prefixOverrides[extracted.prefix?.toLowerCase()] ?? extracted.prefix);

    const subject =
      extracted.subject ??
      (type.subjectFormat ? applyTemplate(type.subjectFormat, { ...extracted, prefix: displayPrefix }) : null);
    if (subject == null) continue;

    return {
      subject,
      formDefaults: mergeFormDefaults(baseFormDefaults, type.formOverrides),
      alertTypeName: type.name,
      carrierModule: extracted.carrierModule ?? null,
    };
  }
  return null;
}

export async function fetchRemoteAlertMapping() {
  for (const branch of ["master", "main"]) {
    const url = `https://raw.githubusercontent.com/${GH_USERNAME}/${GH_REPO}/${branch}/${MAPPING_PATH}`;
    try {
      // Bypass extension / CDN cache so version bumps on GitHub are picked up immediately.
      const res = await fetch(`${url}?t=${Date.now()}`, { cache: "no-store" });
      if (!res.ok) continue;
      const data = await res.json();
      if (validateMapping(data)) {
        return { ok: true, mapping: data, source: "remote" };
      }
      console.warn("[SF Tools] Remote alert mapping failed validation:", branch);
    } catch (err) {
      console.warn("[SF Tools] Alert mapping fetch failed:", branch, err);
    }
  }
  return { ok: false, mapping: bundledAlertMapping, source: "bundled" };
}
