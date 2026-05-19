# Alert mapping

**Edit `alert-mapping.json` only** to add, remove, or change alert types. Push to `main`/`master` on GitHub to update all extension installs.

## Files

| File | Role |
|------|------|
| `alert-mapping.json` | Rules: classify conditions, extract steps, form defaults |
| `extractFromConfig.js` | Fixed engine that runs `extract` blocks (do not duplicate per alert) |
| `parse.js` | PD title string helpers used by the engine |
| `index.js` | Fetch remote JSON, fallback to bundled, `getCaseInfoFromPdTitle()` |

## Adding an alert type

Add an object to `alertTypes` (order matters — first match wins):

```json
{
  "id": "my-new-alert",
  "name": "My New Alert",
  "classify": {
    "requiresBodyForMatch": true,
    "bodyKeywords": ["something specific"]
  },
  "extract": {
    "body": "normalizeBodyDefault",
    "prefix": "context"
  },
  "subjectFormat": "{prefix}|PD|{body}",
  "formOverrides": [{ "fieldLabel": "Type", "value": "System Performance" }]
}
```

## Removing an alert type

Delete its entry from `alertTypes` in JSON. No JS changes.

## `extract` options

| Field | Meaning |
|-------|---------|
| `body` | Step name (`normalizeBodyDefault`) or list of steps (`stripSeverity`, `stripTagChain`, …) |
| `body` (template) | e.g. `"NoEventsFound for carrier {carrier}"` with `trepCarrierFromRaw: true` |
| `bodyReplace` | `[{ "pattern", "flags", "replacement" }]` applied after body steps |
| `prefix` | `"context"` (from title) or `"fixed"` + `prefixFixed` |
| `prefixFromRawMatch` | Regex on full title, optional `template: "DM{n}"` |
| `prefixFromBodyMatch` | Regex on processed body (e.g. mpm4dm host) |
| `transferCodeFromRaw` | Use transfer code in `{code}` templates |
| `pipelineNameFromRaw` | Failed Pipeline special case |
| `subject` | Full subject string (supports `{prefix}`, `{body}`, `{carrier}`, …) |
| `subjectFormat` | On alert type: `"{prefix}\|PD\|{body}"` when `subject` omitted |

Body step names: `stripSeverity`, `stripLeadingPolicyIds`, `stripMidPolicyFragments`, `stripDmBodyPrefix`, `stripTagChain`, `normalizeBodyDefault`.

Bump `version` and `date` when publishing.
