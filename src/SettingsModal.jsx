import {
  ArrowLeft,
  CircleHelp,
  FileQuestion,
  Save,
  Trash2,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";

const SettingsModal = ({ onClose }) => {
  const [isVisible, setIsVisible] = useState(false); // State to control visibility
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSevenDays, setShowSevenDays] = useState(false);
  const [sevenDaysAmount, setSevenDaysAmount] = useState(false);

  // Get the current message when the component mounts
  useEffect(() => {
    chrome.storage.local.get("showSevenDays").then((data) => {
      setShowSevenDays(data.showSevenDays);
    });

    chrome.storage.local.get("sevenDaysAmount").then((data) => {
      setSevenDaysAmount(data.sevenDaysAmount);
    });

    chrome.storage.local.get("showTemplates").then((data) => {
      setShowTemplates(data.showTemplates);
    });

    setTimeout(() => {
      setIsVisible(true);
    }, 10);
  }, []);

  const handleShowTemplatesChange = (event) => {
    setShowTemplates(event.target.checked);
    chrome.storage.local.set({ showTemplates: event.target.checked });
  };

  const handleShowSevenDaysChange = (event) => {
    setShowSevenDays(event.target.checked);
    chrome.storage.local.set({ showSevenDays: event.target.checked });
  };

  const handleSevenDaysAmountChange = (event) => {
    setSevenDaysAmount(event.target.value);
    chrome.storage.local.set({ sevenDaysAmount: event.target.value });
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
      </div>
    </div>
  );
};

export default SettingsModal;
