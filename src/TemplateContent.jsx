import React from "react";
import ReactDOM from "react-dom/client";
import "./nest_buttons.css";
import ContentBody from "./TemplateContentBody";
import { Toaster } from "react-hot-toast";

const processedElements = new Set(); // Store already processed elements

// Debounce function to limit excessive calls
const debounce = (func, delay) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
};

// Function to check for target elements and render template buttons
const checkForElementsAndRender = () => {
  const targetElements = document.querySelectorAll(
    '[data-aura-class="forceDetailPanelDesktop"]'
  );

  targetElements.forEach((targetElement) => {
    if (!processedElements.has(targetElement)) {
      const root = document.createElement("div");
      root.className = "crx-root";
      targetElement.appendChild(root);

      ReactDOM.createRoot(root).render(
        <React.StrictMode>
          <ContentBody root={root} />
        </React.StrictMode>
      );

      processedElements.add(targetElement); // Mark as processed
    }
  });
};

// Optimized DOM observer with debouncing
const observeDOM = debounce(() => {
  checkForElementsAndRender();
}, 300); // Adjust delay to balance performance

const observer = new MutationObserver(observeDOM);
observer.observe(document.body, {
  childList: true,
  subtree: true,
  attributes: true,
});

// Function to render Toaster (only once)
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

// Initial execution
checkForElementsAndRender();
renderToaster();
