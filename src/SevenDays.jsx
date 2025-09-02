import React from "react";
import ReactDOM from "react-dom/client";
import "./nest_buttons.css";

let showSevenDaysReminder = false;
let daysToCheck = 7;
let targetTable = null;

const targetTableClass = '.slds-table'
const lastModifiedColumnAria = 'th[aria-label="Last Modified Date"]'

const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

// Function to check for outdated dates and apply styling
const checkForElementsAndRender = () => {
  if (!showSevenDaysReminder || !targetTable) return;

  // Locate the "Last Modified Date" column
  const lastModifiedColumn = targetTable.querySelector(
    lastModifiedColumnAria
  );

  if (!lastModifiedColumn) return;

  const allColumns = Array.from(targetTable.querySelectorAll("th"));
  const columnIndex = allColumns.indexOf(lastModifiedColumn);
  const rows = targetTable.querySelectorAll("tr");

  const currentDateOnly = new Date(
    new Date().setHours(0, 0, 0, 0) // Set time to midnight
  );

  rows.forEach((row) => {
    const cells = row.querySelectorAll("td");

    if (cells[columnIndex - 1]) {
      const cellText = cells[columnIndex - 1].innerText.trim();
      const [datePart] = cellText.split(", ");
      const [day, month, year] = datePart.split("/").map(Number);

      const cellDateOnly = new Date(year, month - 1, day);
      const daysDifference =
        (currentDateOnly - cellDateOnly) / (1000 * 60 * 60 * 24);

      if (Math.ceil(daysDifference) >= daysToCheck) {
        Object.assign(cells[columnIndex - 1].style, {
          border: "1px solid #ffcccc",
          borderRadius: "2px",
          color: "red",
          backgroundColor: "#ffeeee",
        });
      } else {
        Object.assign(cells[columnIndex - 1].style, {
          border: "",
          borderRadius: "",
          color: "",
          backgroundColor: "",
        });
      }
    }
  });
};

// Function to observe DOM changes
const observeDOM = debounce(() => {
  if (!showSevenDaysReminder) return;
  

  const newTable = document.querySelector(targetTableClass);

  if (newTable !== targetTable) {
    targetTable = newTable;
  }

  if (targetTable) {
    checkForElementsAndRender();
  }
}, 300); // 300ms delay to avoid excessive calls

// Check the config in Chrome storage
const checkConfigOnce = () => {
  chrome.storage.local.get(["showSevenDays", "sevenDaysAmount"], (result) => {
    showSevenDaysReminder = result.showSevenDays || false;
    daysToCheck = result.sevenDaysAmount || 7; // Store value instead of fetching every time

    if (showSevenDaysReminder) {
      const observer = new MutationObserver(observeDOM);
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
      });
    }
  });
};

// Start by checking the config once
checkConfigOnce();
