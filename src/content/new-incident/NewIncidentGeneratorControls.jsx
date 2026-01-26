import React from "react";
import toast from "react-hot-toast";
import { applyIncidentFormDefaults } from "./selectComboboxOption";
import { applyIncidentLookupDefaults } from "./selectLookupOption";
import { fillSubjectField, fillDescriptionField } from "./fillSubjectField";
import {
  BASE_FORM_DEFAULTS,
  getCaseInfoFromPdTitle,
  INCIDENT_LOOKUP_DEFAULTS,
} from "./incidentAlertTypes";

const PD_INCIDENT_URL_REGEX = /^https:\/\/auctane\.pagerduty\.com\/incidents\/[a-zA-Z0-9]{14}$/;
const INVALID_URL_MSG = "Invalid PagerDuty URL";
const PD_TITLE_NOT_FOUND_MSG =
  "Could not read incident. Sign in to PagerDuty in another tab or check the URL.";
const FETCH_TITLE_TIMEOUT_MS = 10000; 
const FILL_FORM_TIMEOUT_MS = 10000;

export default function NewIncidentGeneratorControls({
  containerElement,
  modalScope,
  initialPagerDutyUrl,
}) {
  const [value, setValue] = React.useState("");
  const [status, setStatus] = React.useState("idle");
  const [building, setBuilding] = React.useState(false);
  const [detectedAlert, setDetectedAlert] = React.useState(null); // { alertTypeName } | { fallback: true } after Generate
  const initialUrlConsumed = React.useRef(false);

  const getScope = () =>
    modalScope ?? containerElement?.closest(".slds-modal") ?? document.body;

  const runGenerateForUrl = React.useCallback(
    (urlToFetch) => {
      const scope = getScope();

      const fetchTitlePromise = new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: "fetchPagerDutyIncidentTitle", url: urlToFetch },
          (response) => {
            if (chrome.runtime.lastError) {
              reject("PagerDuty fetch failed. Check that you're signed in to PagerDuty.");
              return;
            }
            if (!response?.ok) {
              const msg = response?.error ?? "Request failed";
              reject(msg.includes("run script") ? PD_TITLE_NOT_FOUND_MSG : msg);
              return;
            }
            if (response.title == null) {
              reject(PD_TITLE_NOT_FOUND_MSG);
              return;
            }
            resolve(response);
          },
        );
      });

      const fetchWithTimeout = Promise.race([
        fetchTitlePromise,
        new Promise((_, reject) =>
          setTimeout(() => reject("Fetch timed out. Check the PagerDuty link or try again."), FETCH_TITLE_TIMEOUT_MS),
        ),
      ]);

      const promise = (async () => {
        const response = await fetchWithTimeout;
        const caseInfo = getCaseInfoFromPdTitle(response.title);
        const subjectToFill = caseInfo?.subject ?? response.title;
        const formDefaults = caseInfo?.formDefaults ?? BASE_FORM_DEFAULTS;

        // Show detected alert immediately so it's visible even if form fill times out
        setDetectedAlert(caseInfo ? { alertTypeName: caseInfo.alertTypeName } : { fallback: true });

        await Promise.race([
          (async () => {
            fillSubjectField(scope, subjectToFill);
            fillDescriptionField(scope, urlToFetch);
            if (INCIDENT_LOOKUP_DEFAULTS.length > 0)
              await applyIncidentLookupDefaults(scope, INCIDENT_LOOKUP_DEFAULTS);
            if (formDefaults.length > 0)
              await applyIncidentFormDefaults(scope, formDefaults);
          })(),
          new Promise((_, reject) =>
            setTimeout(() => reject("Form filling timed out. The page may be slow; try again."), FILL_FORM_TIMEOUT_MS),
          ),
        ]);
      })();

      promise.finally(() => setStatus("idle"));
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
    const POLL_MAX_ATTEMPTS = 30; // ~9s total
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
    setDetectedAlert(null);
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
    const fillPromise = (async () => {
      if (INCIDENT_LOOKUP_DEFAULTS.length > 0) await applyIncidentLookupDefaults(scope, INCIDENT_LOOKUP_DEFAULTS);
      if (BASE_FORM_DEFAULTS.length > 0) await applyIncidentFormDefaults(scope, BASE_FORM_DEFAULTS);
    })();
    const promise = Promise.race([
      fillPromise,
      new Promise((_, reject) =>
        setTimeout(() => reject("Form filling timed out. The page may be slow; try again."), FILL_FORM_TIMEOUT_MS),
      ),
    ]).catch((err) => {
      throw typeof err === "string" ? err : err?.message ?? "Failed to fill form";
    });
    promise.finally(() => setBuilding(false));

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
      {detectedAlert && (
        <div className="slds-text-body_small slds-text-color_weak" style={{ marginTop: "4px" }}>
          {detectedAlert.alertTypeName
            ? `Detected alert: ${detectedAlert.alertTypeName}.`
            : <span className="text-red-500 font-bold">Could not generate Subject - edit manually</span>}
        </div>
      )}
    </div>
  );
}
