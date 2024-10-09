import React from "react";
import ReactDOM from "react-dom/client";
import "./nest_buttons.css";
import ContentBody from "./TemplateContentBody";
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
    '[data-aura-class="forceDetailPanelDesktop"]'
  );

  targetElements.forEach((targetElement) => {
    // Check if this target element already has our component
    if (!targetElement.querySelector(".crx-root")) {
      const root = document.createElement("div");
      root.className = "crx-root";
      targetElement.appendChild(root);

      ReactDOM.createRoot(root).render(
        <React.StrictMode>
          <ContentBody root={root} />
        </React.StrictMode>
      );
    }
  });
};

// Render Toaster separately, only once
const renderToaster = () => {
  if (!document.getElementById("crx-toaster")) {
    const toasterRoot = document.createElement("div");
    toasterRoot.id = "crx-toaster";
    document.body.appendChild(toasterRoot);

    ReactDOM.createRoot(toasterRoot).render(
      <React.StrictMode>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              border: "1px solid #68717a",
              color: "#000",
            },
          }}
        />
      </React.StrictMode>
    );
  }
};

// Initial check and render
checkForElementsAndRender();
renderToaster();

// Start observing the DOM for changes
observeDOM(checkForElementsAndRender);
