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

function extractJsonFromTargets(targets) {
  if (!Array.isArray(targets) || !targets[0]?.labels) return { jsonExtractedClientName: null, jsonExtractedModuleName: null };
  const labels = targets[0].labels;
  return {
    jsonExtractedClientName: labels.ClientcontractName ?? null,
    jsonExtractedModuleName: labels.ClientcontractXLIdentifier ?? null,
  };
}

/** Build subject and form defaults from caseInfo, title, and JSON-extracted labels */
function buildSubjectAndFormDefaults(caseInfo, title, jsonFromTargets) {
  let subjectToFill = caseInfo?.subject ?? title;
  let formDefaults = caseInfo?.formDefaults ?? BASE_FORM_DEFAULTS;

  if (caseInfo?.carrierModule) {
    formDefaults = [...formDefaults];
    const idx = formDefaults.findIndex((f) => f.fieldLabel === "Carrier module");
    if (idx >= 0) formDefaults[idx] = { ...formDefaults[idx], value: "Single" };
    else formDefaults.push({ fieldLabel: "Carrier module", value: "Single" });
  }

  if (caseInfo?.alertTypeName === "DM Failed Transfer") {
    const client = jsonFromTargets?.jsonExtractedClientName ?? "<Customer>";
    const module = jsonFromTargets?.jsonExtractedModuleName ?? "<Module>";
    subjectToFill = subjectToFill.replace(/<Customer>/g, String(client)).replace(/<Module>/g, String(module));
  }

  if (caseInfo?.alertTypeName === "MPM Failed Transfer") {
    const mod = jsonFromTargets?.jsonExtractedModuleName;
    if (mod === null || mod === "null") {
      // Subject should read "…Failed transfer for GenericExport" when module is null
      if (/Failed transfer$/i.test(subjectToFill)) {
        subjectToFill = subjectToFill + " for GenericExport";
      }
      // set carrier module to Unknown
      formDefaults = [...formDefaults];
      const idx = formDefaults.findIndex((f) => f.fieldLabel === "Carrier module");
      if (idx >= 0) formDefaults[idx] = { ...formDefaults[idx], value: "Unknown" };
      else formDefaults.push({ fieldLabel: "Carrier module", value: "Unknown" });
    }
  }

  return { subjectToFill, formDefaults };
}

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
        console.log("[SF Tools] Failed transfer targets:", response.targets != null ? response.targets : "(not available)");
        const caseInfo = getCaseInfoFromPdTitle(response.title);
        const jsonFromTargets = extractJsonFromTargets(response.targets); 
        const { subjectToFill, formDefaults } = buildSubjectAndFormDefaults(caseInfo, response.title, jsonFromTargets);

        setDetectedAlert(
          caseInfo
            ? {
                alertTypeName: caseInfo.alertTypeName,
                rawTitle: response.title,
                carrierModule: caseInfo.carrierModule ?? null,
                ...jsonFromTargets,
              }
            : { fallback: true, rawTitle: response.title, carrierModule: null, ...jsonFromTargets },
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
    (title, url, targets) => {
      setValue((prev) => prev || url || "");
      toast.dismiss("pd-batch-fill");
      if (title == null) {
        setStatus("idle");
        toast.error(PD_TITLE_BATCH_FAIL_MSG);
        return;
      }
      console.log("[SF Tools] Failed transfer targets:", targets != null ? targets : "(not available)");
      const scope = getScope();
      const caseInfo = getCaseInfoFromPdTitle(title);
      const jsonFromTargets = extractJsonFromTargets(targets);
      const { subjectToFill, formDefaults } = buildSubjectAndFormDefaults(caseInfo, title, jsonFromTargets);

      setDetectedAlert(
        caseInfo
          ? { alertTypeName: caseInfo.alertTypeName, rawTitle: title, carrierModule: caseInfo.carrierModule ?? null, ...jsonFromTargets }
          : { fallback: true, rawTitle: title, carrierModule: null, ...jsonFromTargets },
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
          applyBatchFill(data.title ?? null, data.url ?? "", data.targets ?? null);
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
    resetForm({ keepUrl: true });
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
          disabled={status === "loading" || batchWaitingForFill}
        />
        <button
          type="submit"
          className="slds-button slds-button_brand"
          disabled={status === "loading" || batchWaitingForFill}
        >
          {status === "loading" || batchWaitingForFill ? "Loading…" : "Generate"}
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
          {(detectedAlert.jsonExtractedClientName != null || detectedAlert.jsonExtractedModuleName != null) && (
            <div className="slds-text-body_small text-xs" style={{ marginTop: "4px" }}>
              {detectedAlert.jsonExtractedClientName != null && (
                <>Client: <span className="font-bold">{detectedAlert.jsonExtractedClientName}</span></>
              )}
              {detectedAlert.jsonExtractedClientName != null && detectedAlert.jsonExtractedModuleName != null && " · "}
              {detectedAlert.jsonExtractedModuleName != null && (
                <>Module: <span className="font-bold">{detectedAlert.jsonExtractedModuleName}</span></>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
