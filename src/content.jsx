import React from "react";
import ReactDOM from "react-dom/client";
import "./nest_buttons.css";
import ContentBody from "./ContentBody";

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

// Function to check for the presence of the target element
const checkForElementAndRender = () => {
  const targetElement = document.querySelector('[data-aura-class="forceDetailPanelDesktop"]');
  
  if (targetElement && !document.querySelector('#crx-root')) {
    const root = document.createElement("div");
    root.id = "crx-root";
    targetElement.appendChild(root); // Append React component to target element

    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <ContentBody />
      </React.StrictMode>
    );
  }
};

// Start observing the DOM for changes
observeDOM(checkForElementAndRender);