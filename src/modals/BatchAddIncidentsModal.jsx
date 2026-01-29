import { ArrowLeft } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";

const PD_INCIDENT_URL_REGEX = /https:\/\/auctane\.pagerduty\.com\/incidents\/[a-zA-Z0-9]{14}/g;

const NEW_CASE_BASE_URL = "https://stampsdotcom.lightning.force.com/lightning/o/Case/new?count=1";

function extractPagerDutyUrls(text) {
  if (!text?.trim()) return [];
  const matches = text.match(PD_INCIDENT_URL_REGEX) ?? [];
  return [...new Set(matches)];
}

const BatchAddIncidentsModal = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [textareaValue, setTextareaValue] = useState("");

  const detectedUrls = useMemo(() => extractPagerDutyUrls(textareaValue), [textareaValue]);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 10);
  }, []);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  const handleSubmit = () => {
    if (detectedUrls.length === 0) return;
    chrome.runtime.sendMessage({
      action: "fetchBatchPagerDutyTitles",
      pdUrls: detectedUrls,
      newCaseUrl: NEW_CASE_BASE_URL,
    });
    onClose(); // close immediately; background opens tabs without sending a response
  };

  return (
    <div
      className={`w-full h-full bg-gray-50 text-gray-800 p-6 rounded-lg shadow-sm transition-all duration-300 absolute top-0 left-0 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="flex justify-between items-center mb-6">
        <button
          className="text-gray-400 hover:text-gray-600 transition-colors p-4"
          onClick={handleClose}
          aria-label="Go back"
        >
          <ArrowLeft size={14} />
        </button>
        <div className="text-lg font-light tracking-wide">Batch add new PD incidents</div>
        <div className="w-4" />
      </div>

      <div className="flex flex-col gap-4 flex-1 min-h-0">
        <hr className="w-full" />
        <textarea
          className="w-full flex-1 min-h-[280px] px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
          placeholder="Paste PagerDuty incident URLs (one per line)..."
          value={textareaValue}
          onChange={(e) => setTextareaValue(e.target.value)}
        />
        <div className="text-sm text-gray-500">
          {detectedUrls.length} PD incident{detectedUrls.length !== 1 ? "s" : ""}
        </div>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={detectedUrls.length === 0}
          className="w-full flex items-center justify-center gap-2 text-white bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-md px-4 py-2 transition-colors"
        >
          Add incidents
        </button>
      </div>
    </div>
  );
};

export default BatchAddIncidentsModal;
