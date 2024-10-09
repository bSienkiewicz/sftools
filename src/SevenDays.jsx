import React from "react";
import ReactDOM from "react-dom/client";
import "./nest_buttons.css";

// Function to observe DOM changes
const observeDOM = (callback) => {
  const observer = new MutationObserver((mutationsList) => {
    for (let mutation of mutationsList) {
      if (mutation.type === "childList" || mutation.type === "attributes") {
        callback();
      }
    }
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });
};

// Function to check for the presence of target elements and render
const checkForElementsAndRender = () => {
  const targetTable = document.querySelector(
    '[data-aura-class="uiVirtualDataTable"]'
  );

  if (!targetTable) {
    return;
  }

  // Find the "Last Modified Date" column (th Table)
  let lastModifiedColumn = targetTable.querySelector(
    'th[title="Last Modified Date"]'
  );

  if (lastModifiedColumn) {
    const allColumns = Array.from(targetTable.querySelectorAll("th"));
    const columnIndex = allColumns.indexOf(lastModifiedColumn);
    const rows = targetTable.querySelectorAll("tr");
    const currentDate = new Date();

    // Set the currentDate's time to midnight
    const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll("td");

      // Make sure the row has enough cells (if header rows exist, they might not)
      if (cells[columnIndex - 1]) {
        const cellText = cells[columnIndex - 1].innerText.trim();

        // Assuming format "DD/MM/YYYY, HH:mm"
        const [datePart, timePart] = cellText.split(", ");
        const [day, month, year] = datePart.split("/").map(Number);

        // Create a Date object for cellDate with the time set to midnight
        const cellDateOnly = new Date(year, month - 1, day);

        // Calculate the difference in days between the current date and the cell date
        const timeDifference = currentDateOnly - cellDateOnly;
        const daysDifference = timeDifference / (1000 * 60 * 60 * 24); // Convert milliseconds to days

        // Check if the difference is 7 days or more
        if (Math.ceil(daysDifference) >= 7) {
          console.log(daysDifference);
          // Add red border if it's 7 or more days old
          cells[columnIndex - 1].style.borderRadius = "2px";
          cells[columnIndex - 1].style.color = "green";
          cells[columnIndex - 1].style.backgroundColor = "#eeffee";
        }
      }
    });
  }
};


// Start observing the DOM for changes
observeDOM(checkForElementsAndRender);
