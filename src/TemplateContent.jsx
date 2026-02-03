import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { CommentTemplatesRoot } from "./content/comment-templates";
import { ensureToaster } from "./content/shared/toaster";

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

// Initial execution
checkForElementsAndRender();
ensureToaster();
