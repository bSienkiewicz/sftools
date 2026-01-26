import React from "react";
import toast from "react-hot-toast";
import { applyIncidentFormDefaults } from "./selectComboboxOption";
import { applyIncidentLookupDefaults } from "./selectLookupOption";
import { formatPagerDutySubject } from "./formatPagerDutySubject";
import { fillSubjectField, fillDescriptionField } from "./fillSubjectField";
import { INCIDENT_FORM_DEFAULTS, INCIDENT_LOOKUP_DEFAULTS } from "./incidentFormDefaults";

const PD_INCIDENT_URL_REGEX = /^https:\/\/auctane\.pagerduty\.com\/incidents\/[a-zA-Z0-9]{14}$/;
const INVALID_URL_MSG =
  "Invalid PagerDuty URL";

export default function NewIncidentGeneratorControls({ containerElement, modalScope }) {
  const [value, setValue] = React.useState("");
  const [status, setStatus] = React.useState("idle");
  const [building, setBuilding] = React.useState(false);

  const getScope = () =>
    modalScope ?? containerElement?.closest(".slds-modal") ?? document.body;

  const resetForm = () => {
    const scope = getScope();
    scope.querySelectorAll(".inline-edit-undo").forEach((input) => {
      input.click();
    });
    setValue("");
    setStatus("idle");
    setBuilding(false);
  };
  
  const handleApply = (e) => {
    e.preventDefault();
    resetForm();
    const url = value.trim();

    if (!PD_INCIDENT_URL_REGEX.test(url)) {
      setStatus("error");
      toast.error(INVALID_URL_MSG);
      return;
    }

    setStatus("loading");
    const scope = getScope();

    const promise = new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: "fetchPagerDutyIncidentTitle", url },
        async (response) => {
          if (chrome.runtime.lastError) {
            setStatus("idle");
            reject(chrome.runtime.lastError.message || "PagerDuty fetch failed");
            return;
          }
          if (!response?.ok) {
            setStatus("idle");
            reject(response?.error ?? "Request failed");
            return;
          }
          if (response.title == null) {
            setStatus("idle");
            reject("Incident title not found (timeout or selector mismatch)");
            return;
          }
          try {
            const subject = formatPagerDutySubject(response.title);
            const subjectToFill = subject ?? response.title;
            fillSubjectField(scope, subjectToFill);
            fillDescriptionField(scope, url);
            if (INCIDENT_LOOKUP_DEFAULTS.length > 0) await applyIncidentLookupDefaults(scope, INCIDENT_LOOKUP_DEFAULTS);
            if (INCIDENT_FORM_DEFAULTS.length > 0) await applyIncidentFormDefaults(scope, INCIDENT_FORM_DEFAULTS);
            setStatus("idle");
            resolve();
          } catch (err) {
            setStatus("idle");
            reject(typeof err === "string" ? err : err?.message ?? "Failed to fill form");
          }
        },
      );
    });

    toast.promise(promise, {
      loading: "Fetching PagerDuty incident…",
      success: "Incident loaded and form filled",
      error: (err) => (typeof err === "string" ? err : err?.message) ?? "Failed to fetch incident",
    });
  };

  const handleBuild = async () => {
    if (building) return;
    resetForm();
    setBuilding(true);
    const scope = getScope();
    const promise = (async () => {
      try {
        if (INCIDENT_LOOKUP_DEFAULTS.length > 0) await applyIncidentLookupDefaults(scope, INCIDENT_LOOKUP_DEFAULTS);
        if (INCIDENT_FORM_DEFAULTS.length > 0) await applyIncidentFormDefaults(scope, INCIDENT_FORM_DEFAULTS);
      } catch (err) {
        throw typeof err === "string" ? err : err?.message ?? "Failed to fill form";
      } finally {
        setBuilding(false);
      }
    })();
    toast.promise(promise, {
      loading: "Building form…",
      success: "Form filled",
      error: (err) => (typeof err === "string" ? err : err?.message) ?? "Failed to fill form",
    });
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
