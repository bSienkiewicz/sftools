import React from "react";
import ReactDOM from "react-dom/client";
import "./nest_buttons.css";
import SidebarContentBody from "./SidebarContentBody";
import { Toaster } from "react-hot-toast";

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
  const targetElements = document.querySelectorAll(
    '[name="sidebar"]'
  );

  targetElements.forEach((targetElement) => {
    // Check if this target element already has our component
    if (!targetElement.querySelector(".crx-sidebar-root")) {
      const root = document.createElement("div");
      root.className = "crx-sidebar-root slds-card";
      targetElement.appendChild(root);
      
      ReactDOM.createRoot(root).render(
        <React.StrictMode>
          <SidebarContentBody root={root} />
        </React.StrictMode>
      );
      
    }
  });
};

// Start observing the DOM for changes
observeDOM(checkForElementsAndRender);