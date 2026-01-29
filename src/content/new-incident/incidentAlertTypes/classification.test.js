/**
 * Classification tests: run with `node src/content/new-incident/incidentAlertTypes/classification.test.js`
 * (or from this directory: `node classification.test.js`)
 *
 * Add example raw PD titles and expected results; they are run through getCaseInfoFromPdTitle
 * without loading the extension.
 */

import { getCaseInfoFromPdTitle } from "./index.js";

const tests = [
  {
    name: "DM Error Percentage (DX Error Percentage)",
    rawTitle:
      "PRD DM-CARRIERS-DM1 ECS query result is >= 10.0 for 5 minutes on '***CRITICAL*** - DM02 - DM Allocation <DX Express API> (741) Error Percentage'",
    expected: {
      alertTypeName: "DM Allocation (Error Percentage)",
      type: "Allocation",
      subjectContains: "DM1|PD|Allocation <DX Express API> (741) Error Percentage",
    },
  },
  {
    name: "HM Print Duration",
    rawTitle:
      "hm.mpm.metapack.com_BlackBox query result is > 5.0 for 5 minutes on '***CRITICAL*** - HM01 - Print duration for Paquete Express'",
    expected: {
      alertTypeName: "HM PrintDuration",
      type: "System Performance",
      subjectContains: "H&M|PD|Print duration for Paquete Express",
    },
  },
  {
    name: "MPM Failed Transfer",
    rawTitle:
      "sftp.clasp-infra.com_MP_CHANEL_null query result is > 0.5 on '***CRITICAL*** - SHD - SHD - Edi Failed Transfer LOW'",
    expected: {
      alertTypeName: "MPM Failed Transfer",
      type: "Manifesting",
      subjectContains: "Chanel|PD|Failed transfer",
    },
  },
  {
    name: "DM Missing Route Codes",
    rawTitle:
      "PRD DM-CARRIERS-DM1 ECS query result is > 3.0 on 'PRD - DM1 ***INFO*** E15001 Missing route code errors'",
    expected: {
      alertTypeName: "DM Missing Route Codes",
      type: "System Setup",
      subjectContains: "DM1|PD|E15001 Missing route code errors",
    },
  },
  {
    name: "DM Duration (Canada Post Average Duration, no ***Critical*** in subject)",
    rawTitle:
      "PRD DM-CARRIERS-DM2 ECS query result is >= 4.0 for 5 minutes on '***CRITICAL*** - DM02 - DM Allocation ***Critical*** Canada Post API (722) Average Duration'",
    expected: {
      alertTypeName: "DM Duration (System Performance)",
      type: "System Performance",
      subjectContains: "DM2|PD|Canada Post API (722) Average Duration",
      subjectMustNotContain: "***Critical***",
    },
  },
  {
    name: "DM Allocation (Error Percentage)",
    rawTitle:
      "PRD DM-CARRIERS-DM1 ECS query result is >= 5.0 for 5 minutes on '***CRITICAL*** - DM02 - DM Allocation <FAN> (786) Error Percentage'",
    expected: {
      alertTypeName: "DM Allocation (Error Percentage)",
      type: "Allocation",
      subjectContains: "DM1|PD|Allocation <FAN> (786) Error Percentage",
    },
  },
  {
    name: "MPM Duration (System Performance)",
    rawTitle:
      "cycleon.mpm.metapack.net_BlackBox query result is > 5.5 for 5 minutes on '***CRITICAL*** - SHD01 - Pocztex Kurier - Increased PrintParcel Duration'",
    expected: {
      alertTypeName: "MPM Duration (System Performance)",
      type: "System Performance",
      subjectContains: "Cycleon|PD|Pocztex Kurier - Increased PrintParcel Duration",
    },
  },
  {
    name: "MPM Allocation (Error Rate)",
    rawTitle:
      "jlp.mpm.metapack.net_BlackBox query result is > 5.0 for 5 minutes on '***CRITICAL*** - JLP01 - Amazon Shipping - Increased Error Rate'",
    expected: {
      alertTypeName: "MPM Allocation (Error Rate)",
      type: "Allocation",
      subjectContains: "JLP|PD|Amazon Shipping - Increased Error Rate",
    },
  },
];

function getType(formDefaults) {
  const entry = formDefaults?.find((f) => f.fieldLabel === "Type");
  return entry?.value ?? null;
}

let failed = 0;
for (const t of tests) {
  const result = getCaseInfoFromPdTitle(t.rawTitle);
  const errors = [];

  if (t.expected.alertTypeName != null) {
    if (result?.alertTypeName !== t.expected.alertTypeName) {
      errors.push(
        `alertTypeName: expected "${t.expected.alertTypeName}", got "${result?.alertTypeName ?? null}"`,
      );
    }
  }
  if (t.expected.type != null) {
    const actualType = getType(result?.formDefaults);
    if (actualType !== t.expected.type) {
      errors.push(`Type: expected "${t.expected.type}", got "${actualType}"`);
    }
  }
  if (t.expected.subjectContains != null) {
    if (!result?.subject?.includes(t.expected.subjectContains)) {
      errors.push(
        `subject should contain "${t.expected.subjectContains}", got "${result?.subject ?? null}"`,
      );
    }
  }
  if (t.expected.subjectMustNotContain != null && result?.subject?.includes(t.expected.subjectMustNotContain)) {
    errors.push(
      `subject must not contain "${t.expected.subjectMustNotContain}", got "${result?.subject ?? null}"`,
    );
  }
  if (t.expected.subject != null && result?.subject !== t.expected.subject) {
    errors.push(`subject: expected "${t.expected.subject}", got "${result?.subject ?? null}"`);
  }
  if (t.expected.parseOk === false && result != null) {
    errors.push(`expected parse to fail (null), got alertTypeName="${result.alertTypeName}"`);
  }
  if (t.expected.parseOk === true && result == null) {
    errors.push("expected parse to succeed, got null");
  }

  if (errors.length > 0) {
    failed += 1;
    console.error(`\n❌ ${t.name}`);
    errors.forEach((e) => console.error(`   ${e}`));
    console.error(`   rawTitle: ${t.rawTitle.slice(0, 80)}...`);
  } else {
    console.log(`✓ ${t.name}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} test(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${tests.length} classification tests passed.`);
