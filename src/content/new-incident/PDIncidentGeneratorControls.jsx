import React from "react";
import { applyIncidentFormDefaults } from "./selectComboboxOption";
import { applyIncidentLookupDefaults } from "./selectLookupOption";
import { INCIDENT_FORM_DEFAULTS, INCIDENT_LOOKUP_DEFAULTS } from "./incidentFormDefaults";

const PD_INCIDENT_URL_REGEX = /^https:\/\/auctane\.pagerduty\.com\/incidents\/[a-zA-Z0-9]{14}$/;

export default function PDIncidentGeneratorControls({ containerElement, modalScope }) {
  const [value, setValue] = React.useState("");
  const [status, setStatus] = React.useState("idle");
  const [building, setBuilding] = React.useState(false);

  const handleApply = (e) => {
    e.preventDefault();
    const url = value.trim();

    if (!PD_INCIDENT_URL_REGEX.test(url)) {
      setStatus("error");
      console.warn(
        "[SF Tools] Invalid PagerDuty URL. Expected: https://auctane.pagerduty.com/incidents/<14 characters>",
        url,
      );
      return;
    }

    setStatus("loading");
    const scope = modalScope ?? (containerElement?.closest(".slds-modal") ?? document.body);

    chrome.runtime.sendMessage(
      { action: "fetchPagerDutyIncidentTitle", url },
      async (response) => {
        if (chrome.runtime.lastError) {
          setStatus("error");
          console.warn("[SF Tools] PagerDuty fetch failed:", chrome.runtime.lastError.message);
          return;
        }
        if (response?.ok && response.title != null) {
          console.log("[SF Tools] PagerDuty incident title (Salesforce):", response.title);
          try {
            if (INCIDENT_LOOKUP_DEFAULTS.length > 0) await applyIncidentLookupDefaults(scope, INCIDENT_LOOKUP_DEFAULTS);
            if (INCIDENT_FORM_DEFAULTS.length > 0) await applyIncidentFormDefaults(scope, INCIDENT_FORM_DEFAULTS);
          } finally {
            setStatus("idle");
          }
        } else {
          setStatus("idle");
          if (response?.ok && response.title == null) {
            console.warn("[SF Tools] PagerDuty incident title not found (timeout or selector mismatch).");
          } else {
            console.warn("[SF Tools] PagerDuty fetch error:", response?.error ?? "Unknown error");
          }
        }
      },
    );
  };

  const handleBuild = async () => {
    if (building) return;
    setBuilding(true);
    try {
      const scope = modalScope ?? (containerElement?.closest(".slds-modal") ?? document.body);
      if (INCIDENT_LOOKUP_DEFAULTS.length > 0) await applyIncidentLookupDefaults(scope, INCIDENT_LOOKUP_DEFAULTS);
      if (INCIDENT_FORM_DEFAULTS.length > 0) await applyIncidentFormDefaults(scope, INCIDENT_FORM_DEFAULTS);
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="sftools-incident-legend-actions" style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
      <div style={{ display: "inline-flex", alignItems: "center" }}>
        <button
          type="button"
          className="slds-button slds-button_neutral"
          onClick={handleBuild}
          disabled={building}
        >
          {building ? "Building…" : "Build"}
        </button>
      </div>
      <form
        onSubmit={handleApply}
        style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
      >
        <input
          type="text"
          placeholder="PagerDuty incident URL"
          className="slds-input"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          style={{ minWidth: "360px" }}
          disabled={status === "loading"}
        />
        <button
          type="submit"
          className="slds-button slds-button_brand"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Loading…" : "Generate"}
        </button>
      </form>
    </div>
  );
}
