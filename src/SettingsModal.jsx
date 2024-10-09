import { ArrowLeft, Save, Trash2, X } from "lucide-react";
import React, { useState, useEffect } from "react";

const SettingsModal = ({
  onClose,
}) => {
  const [isVisible, setIsVisible] = useState(false); // State to control visibility
  const [showSevenDays, setShowSevenDays] = useState(false);
  const [sevenDaysAmount, setSevenDaysAmount] = useState(false);

  // Get the current message when the component mounts
  useEffect(() => {
    chrome.storage.local.get('showSevenDays').then((data) => {
      setShowSevenDays(data.showSevenDays);
    });

    chrome.storage.local.get('sevenDaysAmount').then((data) => {
      setSevenDaysAmount(data.sevenDaysAmount);
    });

    setTimeout(() => {
      setIsVisible(true);
    }, 10);
  }, []);

  const handleShowSevenDaysChange = (event) => {
    setShowSevenDays(event.target.checked);
    chrome.storage.local.set({ showSevenDays: event.target.checked });
  }

  const handleSevenDaysAmountChange = (event) => {
    setSevenDaysAmount(event.target.value);
    chrome.storage.local.set({ sevenDaysAmount: event.target.value });
  }

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

      <div className="grid grid-cols-[40%,60%] gap-4 items-center">
          <label htmlFor="showClosingReminder" className="select-none" title="Must have 'Last Modified Date' enabled on your case view">Show closing reminder</label>
          <input
            type="checkbox"
            id="showClosingReminder"
            checked={showSevenDays}
            onChange={(e) => handleShowSevenDaysChange(e)}
            className="form-checkbox place-self-start"
          />

          <label htmlFor="sevenDaysAmount" className="select-none">Reminder duration (days)</label>
          <input
            id="sevenDaysAmount"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            value={sevenDaysAmount}
            onChange={(e) => handleSevenDaysAmountChange(e)}
          />
        {/* <div>
          <label
            htmlFor="title"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Title
          </label>
          <input
            type="text"
            id="title"
            value={currentMessage.title}
            onChange={handleTitleChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Message
          </label>
          <textarea
            id="description"
            value={currentMessage.message}
            onChange={handleMessageChange}
            rows={8}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          ></textarea>
        </div>

        <div className="flex justify-between pt-4">
          <button
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Save size={14} className="mr-2" />
            Save
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <Trash2 size={14} className="mr-2" />
            Delete
          </button>
        </div> */}
      </div>
    </div>
  );
};

export default SettingsModal;
