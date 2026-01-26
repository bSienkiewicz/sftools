/**
 * Alert type config: form defaults, lookups, prefix overrides, and ALERT_TYPES.
 * Type-first entries use rawMatch + getSubject; quoted-title entries use match + subjectFormat.
 */

import {
  getTrepCarrier,
  getFailedPipelineName,
  pipelineSegmentToDisplayName,
} from "./parse.js";

export const BASE_FORM_DEFAULTS = [
  { fieldLabel: "Type", value: "Allocation" },
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
  michaelkors: "MICHAELKORS",
  mpm4dm01: "MPM4DM01",
  mpm4dm02: "MPM4DM02",
  mpm4dm03: "MPM4DM03",
  mpm4dm04: "MPM4DM04",
  mpm4dmasos: "MPM4DMASOS",
};

export const ALERT_TYPES = [
  {
    id: "failed-pipeline",
    name: "Failed Pipeline",
    rawMatch: (raw) => /Failed Pipeline:/i.test(raw),
    getSubject: (raw) => {
      const name = getFailedPipelineName(raw);
      if (!name) return null;
      const display = pipelineSegmentToDisplayName(name);
      return `DM|${display || name}|Failed Pipeline for ${name}`;
    },
    formOverrides: [{ fieldLabel: "Type", value: "System Setup" }],
  },
  {
    id: "dm-failed-transfer",
    name: "DM Failed Transfer",
    rawMatch: (raw) => /DM-SCHEDULER/.test(raw) && /Failed Transfer/i.test(raw),
    getSubject: (raw) => {
      const m = raw.match(/DM-SCHEDULER-DM(\d)/i);
      const num = m ? m[1] : "";
      const prefix = "DM" + num;
      return `${prefix}|<Customer>|PD|Failed Transfer for <Module>`;
    },
    formOverrides: [{ fieldLabel: "Type", value: "Manifesting" }],
  },
  {
    id: "mpm-no-events",
    name: "MPM NoEventsFound",
    rawMatch: (raw) => /NoEventsFound/i.test(raw) && (/\btrep\b/i.test(raw) || /microservices/i.test(raw)),
    getSubject: (raw) => {
      const carrier = getTrepCarrier(raw);
      const c = carrier || "unknown";
      return `MP ALL|PD|NoEventsFound for carrier ${c}`;
    },
    formOverrides: [{ fieldLabel: "Type", value: "Tracking" }],
  },
  {
    id: "mpm-not-valid-filename",
    name: "MPM NotValidFileName",
    rawMatch: (raw) => /NotValidFileName/i.test(raw) && (/\btrep\b/i.test(raw) || /microservices/i.test(raw)),
    getSubject: (raw) => {
      const carrier = getTrepCarrier(raw);
      const c = carrier || "unknown";
      return `MP ALL|PD|NotValidFileName for ${c}`;
    },
    formOverrides: [{ fieldLabel: "Type", value: "Tracking" }],
  },
  {
    id: "failed-transfer",
    name: "MPM Failed Transfer",
    match: { keywords: ["Failed Transfer", "failed transfer", "Edi Failed Transfer"] },
    subjectFormat: "{prefix}|PD|{body}",
    formOverrides: [{ fieldLabel: "Type", value: "Manifesting" }],
  },
  {
    id: "dm-missing-route-codes",
    name: "DM Missing Route Codes",
    match: { keywords: ["E15001", "Missing route code"], prefixPattern: /^DM/ },
    subjectFormat: "{prefix}|PD|{body}",
    formOverrides: [{ fieldLabel: "Type", value: "System Setup" }],
  },
  {
    id: "dm-web-transaction",
    name: "DM Web Transaction",
    match: { keywords: ["High Web Transaction Time", "Web Transaction Time"], prefixPattern: /^DM/ },
    subjectFormat: "DM|PD|{body}",
    formOverrides: [{ fieldLabel: "Type", value: "System Performance" }],
  },
  {
    id: "mpm-error90",
    name: "MPM Error90",
    match: { keywords: ["Error rate above 90%", "90% of requests"], prefixPattern: /^[A-Z]/ },
    subjectFormat: "{prefix}|PD|{body}",
    formOverrides: [{ fieldLabel: "Type", value: "System Performance" }],
  },
  {
    id: "hm-print-duration",
    name: "HM PrintDuration",
    match: { keywords: ["Print duration"], prefixPattern: /^Hm$/i },
    subjectFormat: "{prefix}|PD|{body}",
    formOverrides: [{ fieldLabel: "Type", value: "System Performance" }],
  },
  {
    id: "dm-allocation-error-rate",
    name: "DM Allocation (Error rate)",
    match: { prefixPattern: /^DM ALL$/ },
    subjectFormat: "DM ALL|PD|{body}"
  },
  {
    id: "dm-allocation",
    name: "DM Allocation",
    match: { prefixPattern: /^DM\d*$/ },
    subjectFormat: "{prefix}|PD|{body}",
  },
  {
    id: "mpm-allocation",
    name: "MPM Allocation",
    match: {},
    subjectFormat: "{prefix}|PD|{body}",
  },
];
