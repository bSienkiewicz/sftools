import {
  ArrowLeft,
  CircleHelp,
  FileQuestion,
  Save,
  Trash2,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { STORAGE_KEYS } from "../constants/storage";

const SettingsModal = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false); // State to control visibility
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSevenDays, setShowSevenDays] = useState(false);
  const [sevenDaysAmount, setSevenDaysAmount] = useState(false);
  const [enableTextExpansion, setEnableTextExpansion] = useState(true);
  const [showTextExpansionAlias, setShowTextExpansionAlias] = useState(false);
  const [quickSendToggle, setQuickSendToggle] = useState(false);
  const [newIncidentHelperToggle, setNewIncidentHelperToggle] = useState(false);

  useEffect(() => {
    const keys = [
      STORAGE_KEYS.SHOW_SEVEN_DAYS,
      STORAGE_KEYS.SEVEN_DAYS_AMOUNT,
      STORAGE_KEYS.SHOW_TEMPLATES,
      STORAGE_KEYS.ENABLE_TEXT_EXPANSION,
      STORAGE_KEYS.SHOW_TEXT_EXPANSION_ALIAS,
      STORAGE_KEYS.QUICK_SEND_TOGGLE,
      STORAGE_KEYS.NEW_INCIDENT_HELPER_TOGGLE,
    ];
    chrome.storage.local.get(keys).then((data) => {
      setShowSevenDays(data[STORAGE_KEYS.SHOW_SEVEN_DAYS]);
      setSevenDaysAmount(data[STORAGE_KEYS.SEVEN_DAYS_AMOUNT] ?? 7);
      setShowTemplates(data[STORAGE_KEYS.SHOW_TEMPLATES]);
      setEnableTextExpansion(data[STORAGE_KEYS.ENABLE_TEXT_EXPANSION] !== false);
      setShowTextExpansionAlias(data[STORAGE_KEYS.SHOW_TEXT_EXPANSION_ALIAS] !== false);
      setQuickSendToggle(data[STORAGE_KEYS.QUICK_SEND_TOGGLE]);
      setNewIncidentHelperToggle(data[STORAGE_KEYS.NEW_INCIDENT_HELPER_TOGGLE] === true);
    });
    
    setTimeout(() => {
      setIsVisible(true);
    }, 10);
  }, []);

  const handleShowTemplatesChange = (event) => {
    setShowTemplates(event.target.checked);
    chrome.storage.local.set({ [STORAGE_KEYS.SHOW_TEMPLATES]: event.target.checked });
  };

  const handleShowSevenDaysChange = (event) => {
    setShowSevenDays(event.target.checked);
    chrome.storage.local.set({ [STORAGE_KEYS.SHOW_SEVEN_DAYS]: event.target.checked });
  };

  const handleSevenDaysAmountChange = (event) => {
    setSevenDaysAmount(event.target.value);
    chrome.storage.local.set({ [STORAGE_KEYS.SEVEN_DAYS_AMOUNT]: event.target.value });
  };

  const handleEnableTextExpansionChange = (event) => {
    setEnableTextExpansion(event.target.checked);
    chrome.storage.local.set({ [STORAGE_KEYS.ENABLE_TEXT_EXPANSION]: event.target.checked });
  };

  const handleQuickSendToggleChange = (event) => {
    setQuickSendToggle(event.target.checked);
    chrome.storage.local.set({ [STORAGE_KEYS.QUICK_SEND_TOGGLE]: event.target.checked });
  };

  const handleShowTextExpansionAliasChange = (event) => {
    setShowTextExpansionAlias(event.target.checked);
    chrome.storage.local.set({ [STORAGE_KEYS.SHOW_TEXT_EXPANSION_ALIAS]: event.target.checked });
  };

  const handleNewIncidentHelperToggleChange = (event) => {
    setNewIncidentHelperToggle(event.target.checked);
    chrome.storage.local.set({ [STORAGE_KEYS.NEW_INCIDENT_HELPER_TOGGLE]: event.target.checked });
  };

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 300);
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
        <div className="text-lg font-light tracking-wide">Settings</div>
        <div className="w-4"></div> {/* Spacer for alignment */}
      </div>

      <div className="flex flex-col gap-4 items-center">
        <hr className="w-full" />
        <h2 className="text-sm font-light tracking-wide self-start">General Settings</h2>
        <div className="flex gap-4 w-full items-center">
          <input
            type="checkbox"
            id="showTemplatesCheck"
            checked={showTemplates}
            onChange={(e) => handleShowTemplatesChange(e)}
            className="form-checkbox"
          />
          <label
            htmlFor="showTemplatesCheck"
            className="select-none"
          >
            Show templates
          </label>
        </div>
        <div className="flex gap-4 w-full items-center">
          <input
            type="checkbox"
            id="showClosingReminderCheck"
            checked={showSevenDays}
            onChange={(e) => handleShowSevenDaysChange(e)}
            className="form-checkbox"
          />
          <label
            htmlFor="showClosingReminderCheck"
            className="select-none flex items-center"
            title="Must have 'Last Modified Date' visible on your Cases dashboard"
          >
            Display closing reminder
            <CircleHelp size={12} className="ml-1 cursor-help" />
          </label>
        </div>
        {showSevenDays && (
          <div className="flex gap-4 w-full items-center">
            <label
              htmlFor="sevenDaysAmount"
              className="select-none whitespace-nowrap"
            >
              Reminder duration (days)
            </label>
            <input
              id="sevenDaysAmount"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              value={sevenDaysAmount}
              onChange={(e) => handleSevenDaysAmountChange(e)}
            />
          </div>
        )}
        
        <div className="flex gap-4 w-full items-center">
          <input
            type="checkbox"
            id="quickSendToggle"
            checked={quickSendToggle}
            onChange={(e) => handleQuickSendToggleChange(e)}
            className="form-checkbox"
          />
          <label
            htmlFor="quickSendToggle"
            className="select-none flex items-center"
            title="Enable Ctrl+Enter+Enter to save the comment"
          >
            Enable quick send
            <CircleHelp size={12} className="ml-1 cursor-help" />
          </label>
        </div>

        <div className="flex gap-4 w-full items-center">
          <input
            type="checkbox"
            id="newIncidentHelperToggle"
            checked={newIncidentHelperToggle}
            onChange={(e) => handleNewIncidentHelperToggleChange(e)}
            className="form-checkbox"
          />
          <label
            htmlFor="newIncidentHelperToggle"
            className="select-none flex items-center"
            title="Enable New Incident helper on New Case: Incident pages"
          >
            Enable New Incident helper
            <CircleHelp size={12} className="ml-1 cursor-help" />
          </label>
        </div>

        <hr className="w-full" />
        <h2 className="text-sm font-light tracking-wide self-start">Text Expansion</h2>

        <div className="flex gap-4 w-full items-center">
          <input
            type="checkbox"
            id="enableTextExpansionCheck"
            checked={enableTextExpansion}
            onChange={(e) => handleEnableTextExpansionChange(e)}
            className="form-checkbox"
          />
          <label
            htmlFor="enableTextExpansionCheck"
            className="select-none flex items-center"
            title="Type ;alias+Enter in any text field to expand templates"
          >
            Enable text expansion
            <CircleHelp size={12} className="ml-1 cursor-help" />
          </label>
        </div>
        <div className="flex gap-4 w-full items-center">
          <input
            type="checkbox"
            id="showTextExpansionAlias"
            checked={showTextExpansionAlias}
            onChange={(e) => handleShowTextExpansionAliasChange(e)}
            className="form-checkbox"
          />
          <label
            htmlFor="showTextExpansionAlias"
            className="select-none flex items-center"
            title="Display aliases on template buttons"
          >
            Display aliases on template buttons
            <CircleHelp size={12} className="ml-1 cursor-help" />
          </label>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
