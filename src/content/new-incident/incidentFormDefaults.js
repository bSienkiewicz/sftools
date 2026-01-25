// Field labels must match the combobox aria-label; value = option data-value
export const INCIDENT_FORM_DEFAULTS = [
  { fieldLabel: "Type", value: "Allocation" },
  { fieldLabel: "Team", value: "Support" },
  { fieldLabel: "Severity", value: "3" },
  { fieldLabel: "Carrier module", value: "Unknown" },
];

// Lookups: type search text, then click option whose label contains optionContains
export const INCIDENT_LOOKUP_DEFAULTS = [
  { fieldLabel: "Account Name", searchText: "Metapack PL", optionContains: "Metapack Internal PL Cases" },
  { fieldLabel: "Contact Name", searchText: "Metapack PL", optionContains: "Metapack PL Internal Cases" },
];
