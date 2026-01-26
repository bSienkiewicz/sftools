import React from "react";
import toast from "react-hot-toast";
import { applyIncidentFormDefaults } from "./selectComboboxOption";
import { applyIncidentLookupDefaults } from "./selectLookupOption";
import { formatPagerDutySubject } from "./formatPagerDutySubject";
import { fillSubjectField, fillDescriptionField } from "./fillSubjectField";
import { INCIDENT_FORM_DEFAULTS, INCIDENT_LOOKUP_DEFAULTS } from "./incidentFormDefaults";

const PD_INCIDENT_URL_REGEX = /^https:\/\/auctane\.pagerduty\.com\/incidents\/[a-zA-Z0-9]{14}$/;
const INVALID_URL_MSG = "Invalid PagerDuty URL";
const PD_TITLE_NOT_FOUND_MSG =
  "Could not read incident. Sign in to PagerDuty in another tab or check the URL.";

export default function NewIncidentGeneratorControls({
  containerElement,
  modalScope,
  initialPagerDutyUrl,
}) {
  const [value, setValue] = React.useState("");
  const [status, setStatus] = React.useState("idle");
  const [building, setBuilding] = React.useState(false);
  const initialUrlConsumed = React.useRef(false);

  const getScope = () =>
    modalScope ?? containerElement?.closest(".slds-modal") ?? document.body;

  const runGenerateForUrl = React.useCallback(
    (urlToFetch) => {
      const scope = getScope();
      const promise = new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: "fetchPagerDutyIncidentTitle", url: urlToFetch },
          async (response) => {
            if (chrome.runtime.lastError) {
              setStatus("idle");
              reject("PagerDuty fetch failed. Check that you're signed in to PagerDuty.");
              return;
            }
            if (!response?.ok) {
              setStatus("idle");
              const msg = response?.error ?? "Request failed";
              reject(
                msg.includes("run script") ? PD_TITLE_NOT_FOUND_MSG : msg
              );
              return;
            }
            if (response.title == null) {
              setStatus("idle");
              reject(PD_TITLE_NOT_FOUND_MSG);
              return;
            }
            try {
              const subject = formatPagerDutySubject(response.title);
              const subjectToFill = subject ?? response.title;
              fillSubjectField(scope, subjectToFill);
              fillDescriptionField(scope, urlToFetch);
              if (INCIDENT_LOOKUP_DEFAULTS.length > 0)
                await applyIncidentLookupDefaults(scope, INCIDENT_LOOKUP_DEFAULTS);
              if (INCIDENT_FORM_DEFAULTS.length > 0)
                await applyIncidentFormDefaults(scope, INCIDENT_FORM_DEFAULTS);
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
    },
    [modalScope, containerElement],
  );

  React.useEffect(() => {
    if (initialUrlConsumed.current) return;

    const runForUrl = (urlToFetch) => {
      if (!urlToFetch || !PD_INCIDENT_URL_REGEX.test(urlToFetch.trim())) return;
      initialUrlConsumed.current = true;
      setValue(urlToFetch.trim());
      setStatus("loading");
      runGenerateForUrl(urlToFetch.trim());
    };

    if (initialPagerDutyUrl) {
      runForUrl(initialPagerDutyUrl);
      return;
    }

    const POLL_INTERVAL_MS = 300;
    const POLL_MAX_ATTEMPTS = 15; // ~4.5s total
    let attempts = 0;

    const pollForPdUrl = () => {
      if (initialUrlConsumed.current) return;
      attempts += 1;
      chrome.runtime.sendMessage({ action: "getPdUrlForMyTab" }, (response) => {
        if (initialUrlConsumed.current) return;
        if (response?.url) {
          runForUrl(response.url);
          return;
        }
        if (attempts < POLL_MAX_ATTEMPTS) {
          setTimeout(pollForPdUrl, POLL_INTERVAL_MS);
        }
      });
    };
    pollForPdUrl();
  }, [initialPagerDutyUrl, runGenerateForUrl]);

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
      toast.error(INVALID_URL_MSG);
      return;
    }
    setStatus("loading");
    runGenerateForUrl(url);
  };

  const handleBuild = () => {
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
      <form
        onSubmit={handleApply}
        style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}
      >
        <button
          type="button"
          className="slds-button slds-button_neutral"
          onClick={handleBuild}
          disabled={building}
        >
          Build
        </button>
        <input
          type="text"
          placeholder="PagerDuty incident URL"
          className="slds-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
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
