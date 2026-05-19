/**
 * Runs "extract" rules from alert-mapping.json.
 *
 * Alert types only declare *what* to do (body steps, prefix source, templates).
 * This file is the fixed engine — add/remove alert types in JSON without new JS handlers.
 */
import {
  getFailedTransferCode,
  getTrepCarrier,
  getFailedPipelineName,
  pipelineSegmentToDisplayName,
  getPrefixFromRaw,
  normalizeBodyDefault,
  stripSeverity,
  stripLeadingPolicyIds,
  stripMidPolicyFragments,
  stripDmBodyPrefix,
  stripTagChain,
} from "./parse.js";

const BODY_STEPS = {
  stripSeverity,
  stripLeadingPolicyIds,
  stripMidPolicyFragments,
  stripDmBodyPrefix,
  stripTagChain,
  normalizeBodyDefault,
};

function applyTemplate(str, vars) {
  return str.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? "");
}

function runBodySteps(quoted, steps) {
  if (!quoted) return null;
  let body = quoted;
  for (const step of steps) {
    const fn = BODY_STEPS[step];
    if (!fn) return null;
    body = fn(body);
    if (body == null) return null;
  }
  return body?.trim() || null;
}

function resolvePrefix(config, raw, ctx, body) {
  if (config.prefix === "fixed") return config.prefixFixed ?? null;
  if (config.prefix === "context") return ctx.prefix ?? getPrefixFromRaw(raw);
  if (config.prefixFromRawMatch) {
    const { pattern, flags = "", template, fallback } = config.prefixFromRawMatch;
    const m = raw.match(new RegExp(pattern, flags));
    if (!m) return fallback ?? null;
    if (template) return template.replace("{n}", m[1] ?? "");
    return m[1] ?? fallback ?? null;
  }
  if (config.prefixFromBodyMatch && body) {
    const { pattern, flags = "", uppercase, fallback } = config.prefixFromBodyMatch;
    const m = body.match(new RegExp(pattern, flags));
    if (!m) return fallback ?? null;
    const val = m[1] ?? m[0];
    return uppercase ? val.toUpperCase() : val;
  }
  return ctx.prefix ?? null;
}

/** Normalize legacy/string extract configs to the declarative shape. */
export function normalizeExtractConfig(extract) {
  if (extract === "default") {
    return { body: "normalizeBodyDefault", prefix: "context" };
  }
  if (extract?.strategy === "default") {
    return {
      body: "normalizeBodyDefault",
      prefix: extract.prefixOverride ? "fixed" : "context",
      prefixFixed: extract.prefixOverride,
    };
  }
  if (typeof extract?.body === "string") {
    return { ...extract, body: [extract.body] };
  }
  return extract;
}

export function isValidExtractConfig(extract) {
  const config = normalizeExtractConfig(extract);
  if (!config || typeof config !== "object") return false;

  if (config.body != null) {
    if (typeof config.body === "string") {
      if (!config.body.includes("{") && !BODY_STEPS[config.body]) return false;
    } else if (Array.isArray(config.body)) {
      if (!config.body.every((s) => BODY_STEPS[s])) return false;
    } else {
      return false;
    }
  }

  if (config.bodyReplace != null) {
    if (!Array.isArray(config.bodyReplace)) return false;
    for (const r of config.bodyReplace) {
      try {
        new RegExp(r.pattern, r.flags || "");
      } catch {
        return false;
      }
    }
  }

  return true;
}

export function runExtractFromConfig(extract, raw, ctx) {
  const config = normalizeExtractConfig(extract);
  if (!config) return null;

  // --- Special: Failed Pipeline (name parsed from raw title, not quoted body) ---
  if (config.pipelineNameFromRaw) {
    const pipelineName = getFailedPipelineName(raw);
    if (!pipelineName) return null;
    const displayName = pipelineSegmentToDisplayName(pipelineName) || pipelineName;
    const prefix = config.prefixFixed ?? "DM";
    const vars = { pipelineName, displayName, prefix, body: displayName };
    return {
      body: displayName,
      prefix,
      subject: config.subject ? applyTemplate(config.subject, vars) : null,
      carrierModule: null,
    };
  }

  const carrier = config.trepCarrierFromRaw ? getTrepCarrier(raw) || "unknown" : null;
  const transferCode = config.transferCodeFromRaw ? getFailedTransferCode(raw) : null;

  // --- Body ---
  let body = null;
  if (config.transferCodeFromRaw) {
    body = transferCode
      ? applyTemplate(config.body ?? "Failed transfer for {code}", { code: transferCode })
      : (config.bodyFallback ?? null);
  } else if (config.trepCarrierFromRaw && typeof config.body === "string") {
    body = applyTemplate(config.body, { carrier, code: transferCode ?? "", pipelineName: "", displayName: "" });
  } else if (typeof config.body === "string" && config.body.includes("{")) {
    body = applyTemplate(config.body, { carrier, code: transferCode ?? "", pipelineName: "", displayName: "" });
  } else if (config.body != null) {
    const steps = Array.isArray(config.body) ? config.body : [config.body];
    body = runBodySteps(ctx.quoted, steps);
    for (const r of config.bodyReplace ?? []) {
      if (body == null) break;
      body = body.replace(new RegExp(r.pattern, r.flags || ""), r.replacement ?? "").trim() || null;
    }
  }

  const prefix = resolvePrefix(config, raw, ctx, body);

  const vars = { body: body ?? "", prefix: prefix ?? "", carrier: carrier ?? "", code: transferCode ?? "" };
  const subject = config.subject ? applyTemplate(config.subject, vars) : null;

  return { body, prefix, subject, carrierModule: null };
}

export function buildExtractFn(extractConfig) {
  return (raw, ctx) => runExtractFromConfig(extractConfig, raw, ctx);
}
