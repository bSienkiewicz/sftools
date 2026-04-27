import {
  getTrepCarrier,
  getFailedPipelineName,
  pipelineSegmentToDisplayName,
  getFailedTransferCode,
  getPrefixFromRaw,
  normalizeForMatching,
  normalizeBodyDefault,
  stripSeverity,
  stripLeadingPolicyIds,
  stripMidPolicyFragments,
  stripDmBodyPrefix,
  stripTagChain,
} from "./parse.js";

export const BASE_FORM_DEFAULTS = [
  { fieldLabel: "Team", value: "Support" },
  { fieldLabel: "Severity", value: "3" },
  { fieldLabel: "Carrier module", value: "Unknown" },
];

export const INCIDENT_LOOKUP_DEFAULTS = [
  { fieldLabel: "Account Name", searchText: "Metapack PL", optionContains: "Metapack Internal PL Cases" },
  { fieldLabel: "Contact Name", searchText: "Metapack PL", optionContains: "Metapack PL Internal Cases" },
];

export const PREFIX_OVERRIDES = {
  hm: "H&M",
  pierceab: "PierceAB",
  jlp: "JLP",
  cycleon: "Cycleon",
  michaelkors: "MICHAELKORS",
  mpm4dm01: "MPM4DM01",
  mpm4dm02: "MPM4DM02",
  mpm4dm03: "MPM4DM03",
  mpm4dm04: "MPM4DM04",
  mpm4dmasos: "MPM4DMASOS",
};

function hasKeyword(body, keywords) {
  const lower = (body || "").toLowerCase();
  return keywords.some((kw) => lower.includes(String(kw).toLowerCase()));
}

function defaultExtract(prefixOverride) {
  return (_raw, ctx) => {
    const body = normalizeBodyDefault(ctx.quoted);
    return { body, prefix: prefixOverride ?? ctx.prefix, subject: null, carrierModule: null };
  };
}

export const ALERT_TYPES = [
  {
    id: "failed-pipeline",
    name: "Failed Pipeline",
    classify: (raw) => /Failed Pipeline:/i.test(raw),
    extract: (raw) => {
      const name = getFailedPipelineName(raw);
      if (!name) return null;
      const display = pipelineSegmentToDisplayName(name);
      const body = display || name;
      return { body, prefix: "DM", subject: `DM|${body}|Failed Pipeline for ${name}`, carrierModule: null };
    },
    formOverrides: [{ fieldLabel: "Type", value: "System Setup" }],
  },
  {
    id: "mpm-no-events",
    name: "MPM NoEventsFound",
    classify: (raw) =>
      /NoEventsFound/i.test(raw) && (/\btrep\b/i.test(raw) || /microservices/i.test(raw)),
    extract: (raw) => {
      const carrier = getTrepCarrier(raw) || "unknown";
      return {
        body: `NoEventsFound for carrier ${carrier}`,
        prefix: "MP ALL",
        subject: `MP ALL|PD|NoEventsFound for carrier ${carrier}`,
        carrierModule: null,
      };
    },
    formOverrides: [{ fieldLabel: "Type", value: "Tracking" }],
  },
  {
    id: "mpm-not-valid-filename",
    name: "MPM NotValidFileName",
    classify: (raw) =>
      /NotValidFileName/i.test(raw) && (/\btrep\b/i.test(raw) || /microservices/i.test(raw)),
    extract: (raw) => {
      const carrier = getTrepCarrier(raw) || "unknown";
      return {
        body: `NotValidFileName for ${carrier}`,
        prefix: "MP ALL",
        subject: `MP ALL|PD|NotValidFileName for ${carrier}`,
        carrierModule: null,
      };
    },
    formOverrides: [{ fieldLabel: "Type", value: "Tracking" }],
  },
  {
    id: "dm-failed-transfer",
    name: "DM Failed Transfer",
    classify: (raw) => /DM-SCHEDULER/.test(raw) && /Failed Transfer/i.test(raw),
    extract: (raw) => {
      const m = raw.match(/DM-SCHEDULER-DM(\d)/i);
      const prefix = m ? "DM" + m[1] : "DM";
      return {
        body: "Failed Transfer",
        prefix,
        subject: `${prefix}|<Customer>|PD|Failed Transfer for <Module>`,
        carrierModule: null,
      };
    },
    formOverrides: [{ fieldLabel: "Type", value: "Manifesting" }, { fieldLabel: "Carrier module", value: "Single" }],
  },
  {
    id: "mpm-failed-transfer",
    name: "MPM Failed Transfer",
    classify: (raw, ctx) =>
      ctx?.bodyForMatch != null &&
      hasKeyword(ctx.bodyForMatch, ["Failed Transfer", "failed transfer", "Edi Failed Transfer"]),
    extract: (raw, ctx) => {
      const code = getFailedTransferCode(raw);
      const body = code ? `Failed transfer for ${code}` : "Failed transfer";
      const prefix = ctx.prefix ?? getPrefixFromRaw(raw);
      return { body, prefix, subject: null, carrierModule: null };
    },
    subjectFormat: "{prefix}|PD|{body}",
    formOverrides: [{ fieldLabel: "Type", value: "Manifesting" }, { fieldLabel: "Carrier module", value: "Single" }],
  },
  {
    id: "dm-missing-route-codes",
    name: "DM Missing Route Codes",
    classify: (raw, ctx) =>
      ctx?.prefix != null &&
      /^DM/.test(ctx.prefix) &&
      ctx?.bodyForMatch != null &&
      hasKeyword(ctx.bodyForMatch, ["E15001", "Missing route code"]),
    extract: (raw, ctx) => {
      let s = stripSeverity(ctx.quoted);
      s = stripMidPolicyFragments(s);
      s = stripLeadingPolicyIds(s);
      s = stripDmBodyPrefix(s);
      const body = s?.trim() || null;
      const prefix = ctx.prefix;
      return { body, prefix, subject: null, carrierModule: null };
    },
    subjectFormat: "{prefix}|PD|{body}",
    formOverrides: [{ fieldLabel: "Type", value: "System Setup" }],
  },
  {
    id: "dm-database-errors",
    name: "DM Database Errors",
    classify: (raw, ctx) =>
      /DM-UX/i.test(raw) &&
      ctx?.bodyForMatch != null &&
      hasKeyword(ctx.bodyForMatch, ["Database errors"]),
    extract: (_raw, ctx) => {
      let body = stripSeverity(ctx.quoted);
      body = body?.replace(/\s-\sDM\s/i, " - ")?.trim() || null;
      return { body, prefix: "DM", subject: null, carrierModule: null };
    },
    subjectFormat: "{prefix}|PD|{body}",
    formOverrides: [{ fieldLabel: "Type", value: "System Performance" }],
  },
  {
    id: "dm-avg-response-time",
    name: "DM AVG Response Time",
    classify: (raw, ctx) =>
      /^PRD\s+DM-/i.test(raw) &&
      ctx?.bodyForMatch != null &&
      hasKeyword(ctx.bodyForMatch, ["AVG response time"]),
    extract: (_raw, ctx) => {
      let body = stripSeverity(ctx.quoted);
      body = stripMidPolicyFragments(body);
      body = stripLeadingPolicyIds(body);
      const mpmHost = body?.match(/\b(mpm4dm\d+)\b/i);
      const prefix = mpmHost ? mpmHost[1].toUpperCase() : "DM";
      return { body: body?.trim() || null, prefix, subject: null, carrierModule: null };
    },
    subjectFormat: "{prefix}|PD|{body}",
    formOverrides: [{ fieldLabel: "Type", value: "System Performance" }],
  },
  {
    id: "dm-web-transaction",
    name: "DM Web Transaction",
    classify: (raw, ctx) =>
      ctx?.prefix != null &&
      /^DM/.test(ctx.prefix) &&
      ctx?.bodyForMatch != null &&
      hasKeyword(ctx.bodyForMatch, ["High Web Transaction Time", "Web Transaction Time"]),
    extract: defaultExtract("DM"),
    subjectFormat: "{prefix}|PD|{body}",
    formOverrides: [{ fieldLabel: "Type", value: "System Performance" }],
  },
  {
    id: "mpm-error90",
    name: "MPM Error90",
    classify: (raw, ctx) =>
      ctx?.prefix != null &&
      /^[A-Z]/.test(ctx.prefix) &&
      ctx?.bodyForMatch != null &&
      hasKeyword(ctx.bodyForMatch, ["Error rate above 90%", "90% of requests"]),
    extract: defaultExtract(),
    subjectFormat: "{prefix}|PD|{body}",
    formOverrides: [{ fieldLabel: "Type", value: "System Performance" }],
  },
  {
    id: "hm-print-duration",
    name: "HM PrintDuration",
    classify: (raw, ctx) =>
      ctx?.prefix != null &&
      /^Hm$/i.test(ctx.prefix) &&
      ctx?.bodyForMatch != null &&
      hasKeyword(ctx.bodyForMatch, ["Print duration"]),
    extract: defaultExtract(),
    subjectFormat: "{prefix}|PD|{body}",
    formOverrides: [{ fieldLabel: "Type", value: "System Performance" }],
  },
  {
    id: "dm-duration",
    name: "DM Duration (System Performance)",
    classify: (raw, ctx) =>
      ctx?.prefix != null &&
      /^DM\d+$/.test(ctx.prefix) &&
      ctx?.bodyForMatch != null &&
      hasKeyword(ctx.bodyForMatch, ["Average Duration"]),
    extract: (raw, ctx) => {
      let body = normalizeBodyDefault(ctx.quoted);
      if (body) body = body.replace(/^Allocation\s+/i, "").trim() || body;
      return { body, prefix: ctx.prefix, subject: null, carrierModule: null };
    },
    subjectFormat: "{prefix}|PD|{body}",
    formOverrides: [{ fieldLabel: "Type", value: "System Performance" }],
  },
  {
    id: "dm-allocation-error-percentage",
    name: "DM Allocation (Error Percentage)",
    classify: (raw, ctx) =>
      ctx?.prefix != null &&
      /^DM\d+$/.test(ctx.prefix) &&
      ctx?.bodyForMatch != null &&
      hasKeyword(ctx.bodyForMatch, ["Error Percentage"]),
    extract: defaultExtract(),
    subjectFormat: "{prefix}|PD|{body}",
    formOverrides: [{ fieldLabel: "Type", value: "Allocation" }],
  },
  {
    id: "dm-allocation-error-rate",
    name: "DM Allocation (Error Rate)",
    classify: (raw, ctx) => ctx?.prefix != null && /^DM ALL$/.test(ctx.prefix),
    extract: defaultExtract("DM ALL"),
    subjectFormat: "{prefix}|PD|{body}",
    formOverrides: [{ fieldLabel: "Type", value: "Allocation" }],
  },
  {
    id: "mpm-duration",
    name: "MPM Duration (System Performance)",
    classify: (raw, ctx) =>
      ctx?.prefix != null &&
      !/^DM/i.test(ctx.prefix) &&
      ctx?.bodyForMatch != null &&
      hasKeyword(ctx.bodyForMatch, ["PrintParcel Duration", "Increased PrintParcel Duration"]),
    extract: defaultExtract(),
    subjectFormat: "{prefix}|PD|{body}",
    formOverrides: [{ fieldLabel: "Type", value: "System Performance" }],
  },
  {
    id: "mpm-allocation-error-rate",
    name: "MPM Allocation (Error Rate)",
    classify: (raw, ctx) =>
      ctx?.prefix != null &&
      !/^DM/i.test(ctx.prefix) &&
      ctx?.bodyForMatch != null &&
      hasKeyword(ctx.bodyForMatch, ["Increased Error Rate"]),
    extract: defaultExtract(),
    subjectFormat: "{prefix}|PD|{body}",
    formOverrides: [{ fieldLabel: "Type", value: "Allocation" }],
  },
  {
    id: "mpm-generic",
    name: "MPM Generic",
    classify: (raw, ctx) =>
      ctx?.prefix != null &&
      !/^DM/i.test(ctx.prefix),
    extract: (_raw, ctx) => {
      let body = stripSeverity(ctx.quoted);
      body = stripTagChain(body);
      return { body, prefix: ctx.prefix, subject: null, carrierModule: null };
    },
    subjectFormat: "{prefix}|PD|{body}",
    formOverrides: [{ fieldLabel: "Type", value: "System Performance" }],
  }
];
