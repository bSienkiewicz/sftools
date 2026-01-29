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
const PD_TITLE_BATCH_FAIL_MSG =
  "Could not read incident (tab may need to be visible). Sign in to PagerDuty or try again.";
const FETCH_TIMEOUT_MSG = "Fetch timed out. Check the PagerDuty link or try again.";
const FILL_TIMEOUT_MSG = "Form filling timed out. The page may be slow; try again.";
const FETCH_TITLE_TIMEOUT_MS = 15000;
const FILL_FORM_TIMEOUT_MS = 12000;

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
  const generateRunId = React.useRef(0);
  const [batchWaitingForFill, setBatchWaitingForFill] = React.useState(false);

  const getScope = () =>
    modalScope ?? containerElement?.closest(".slds-modal") ?? document.body;

  const runGenerateForUrl = React.useCallback(
    (urlToFetch) => {
      const scope = getScope();
      const runId = (generateRunId.current += 1);

      const fetchTitlePromise = new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: "fetchPagerDutyIncidentTitle", url: urlToFetch },
          (response) => {
            if (runId !== generateRunId.current) return; // Ignore late response (e.g. after timeout)
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
          setTimeout(() => reject(new Error(FETCH_TIMEOUT_MSG)), FETCH_TITLE_TIMEOUT_MS),
        ),
      ]);

      const promise = (async () => {
        const response = await fetchWithTimeout;
        if (runId !== generateRunId.current) return;
        const caseInfo = getCaseInfoFromPdTitle(response.title);
        const subjectToFill = caseInfo?.subject ?? response.title;
        const formDefaults = caseInfo?.formDefaults ?? BASE_FORM_DEFAULTS;

        setDetectedAlert(
          caseInfo
            ? {
                alertTypeName: caseInfo.alertTypeName,
                rawTitle: response.title,
                carrierModule: caseInfo.carrierModule ?? null,
              }
            : { fallback: true, rawTitle: response.title, carrierModule: null },
        );

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
            setTimeout(() => reject(new Error(FILL_TIMEOUT_MSG)), FILL_FORM_TIMEOUT_MS),
          ),
        ]);
      })();

      promise
        .then(() => {
          if (runId === generateRunId.current) toast.success("Incident loaded and form filled");
        })
        .catch((err) => {
          if (runId === generateRunId.current) {
            const msg = err?.message ?? (typeof err === "string" ? err : "Failed to fetch incident");
            toast.error(msg);
          }
        })
        .finally(() => {
          if (runId === generateRunId.current) setStatus("idle");
        });
      toast.loading("Fetching PagerDuty incident…", { id: "pd-fetch" });
      promise.finally(() => toast.dismiss("pd-fetch"));
    },
    [modalScope, containerElement],
  );

  const applyBatchFill = React.useCallback(
    (title, url) => {
      setValue((prev) => prev || url || "");
      toast.dismiss("pd-batch-fill");
      if (title == null) {
        setStatus("idle");
        toast.error(PD_TITLE_BATCH_FAIL_MSG);
        return;
      }
      const scope = getScope();
      const caseInfo = getCaseInfoFromPdTitle(title);
      const subjectToFill = caseInfo?.subject ?? title;
      const formDefaults = caseInfo?.formDefaults ?? BASE_FORM_DEFAULTS;
      setDetectedAlert(
        caseInfo
          ? { alertTypeName: caseInfo.alertTypeName, rawTitle: title, carrierModule: caseInfo.carrierModule ?? null }
          : { fallback: true, rawTitle: title, carrierModule: null },
      );
      toast.loading("Filling form from PagerDuty…", { id: "pd-batch-fill" });
      const fillPromise = Promise.race([
        (async () => {
          fillSubjectField(scope, subjectToFill);
          fillDescriptionField(scope, url || "");
          if (INCIDENT_LOOKUP_DEFAULTS.length > 0)
            await applyIncidentLookupDefaults(scope, INCIDENT_LOOKUP_DEFAULTS);
          if (formDefaults.length > 0) await applyIncidentFormDefaults(scope, formDefaults);
        })(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(FILL_TIMEOUT_MSG)), FILL_FORM_TIMEOUT_MS),
        ),
      ]);
      fillPromise
        .then(() => {
          toast.success("Incident loaded and form filled", { id: "pd-batch-fill" });
        })
        .catch((err) => {
          const msg = err?.message ?? (typeof err === "string" ? err : "Failed to fill form");
          toast.error(msg, { id: "pd-batch-fill" });
        })
        .finally(() => setStatus("idle"));
    },
    [modalScope, containerElement],
  );

  // Poll for pending batch fill (data stored by background when PD title is ready)
  const BATCH_FILL_POLL_MS = 500;
  const BATCH_FILL_POLL_MAX = 240; // 2 min
  React.useEffect(() => {
    if (!batchWaitingForFill) return;
    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      if (attempts > BATCH_FILL_POLL_MAX) {
        setBatchWaitingForFill(false);
        setStatus("idle");
        toast.error(PD_TITLE_BATCH_FAIL_MSG);
        return;
      }
      chrome.runtime.sendMessage({ action: "getPendingFillForMyTab" }, (data) => {
        if (data && (data.title != null || data.url)) {
          setBatchWaitingForFill(false);
          applyBatchFill(data.title ?? null, data.url ?? "");
        }
      });
    }, BATCH_FILL_POLL_MS);
    return () => clearInterval(id);
  }, [batchWaitingForFill, applyBatchFill]);

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
        if (response?.url != null) {
          if (response.batch === true) {
            initialUrlConsumed.current = true;
            setValue(response.url);
            setStatus("loading");
            setBatchWaitingForFill(true);
          } else {
            runForUrl(response.url);
          }
          return;
        }
        if (attempts < POLL_MAX_ATTEMPTS) {
          setTimeout(pollForPdUrl, POLL_INTERVAL_MS);
        }
      });
    };
    pollForPdUrl();
  }, [initialPagerDutyUrl, runGenerateForUrl]);

  const resetForm = (opts) => {
    const scope = getScope();
    scope.querySelectorAll(".inline-edit-undo").forEach((input) => {
      input.click();
    });
    setStatus("idle");
    setBuilding(false);
    setDetectedAlert(null);
    if (opts?.keepUrl !== true) setValue("");
  };

  const handleApply = (e) => {
    e.preventDefault();
    const url = value.trim();
    if (!PD_INCIDENT_URL_REGEX.test(url)) {
      toast.error(INVALID_URL_MSG);
      return;
    }
    setStatus("loading");
    resetForm({ keepUrl: true });
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
    <div className="sftools-incident-legend-actions text-left" style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
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
      {detectedAlert?.rawTitle != null && (
        <div className="slds-text-body_small slds-text-color_weak text-xs" style={{ marginTop: "4px" }}>
          Title: <br/><span className="font-bold">{detectedAlert.rawTitle}</span>
        </div>
      )}
      {detectedAlert?.carrierModule != null && detectedAlert.carrierModule !== "" && (
        <div className="slds-text-body_small slds-text-color_weak text-xs" style={{ marginTop: "2px" }}>
          Carrier module: <span className="font-bold">{detectedAlert.carrierModule}</span>
        </div>
      )}
      {detectedAlert && (
        <div className="slds-text-body_small slds-text-color_weak" style={{ marginTop: "4px" }}>
          {detectedAlert.alertTypeName
            ? <>Detected alert: <span className="font-bold">{detectedAlert.alertTypeName}</span>.</>
            : <span className="text-red-500 font-bold">Could not generate Subject - edit manually</span>}
        </div>
      )}
    </div>
  );
}
