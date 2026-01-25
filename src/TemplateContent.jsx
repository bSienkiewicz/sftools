import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./nest_buttons.css";
import { Toaster } from "react-hot-toast";
import { CommentTemplatesRoot } from "./content/comment-templates";

const processedElements = new Set();

const debounce = (fn, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
};

function checkForElementsAndRender() {
  const targetElements = document.querySelectorAll(
    '[data-aura-class="forceDetailPanelDesktop"]',
  );

  targetElements.forEach((targetElement) => {
    if (!processedElements.has(targetElement)) {
      const root = document.createElement("div");
      root.className = "crx-root";
      targetElement.appendChild(root);

      ReactDOM.createRoot(root).render(
        <React.StrictMode>
          <CommentTemplatesRoot root={root} />
        </React.StrictMode>,
      );

      processedElements.add(targetElement);
    }
  });
}

const observeDOM = debounce(checkForElementsAndRender, 300);

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
