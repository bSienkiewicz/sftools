import React from "react";
import toast from "react-hot-toast";

const DOUBLE_PRESS_MS = 500;
const SAVE_BUTTON_SELECTOR =
  'button[title="Save"], button[aria-label*="Save"], .slds-button[title="Save"]';

/**
 * Registers keydown listener: double Ctrl+Enter (or Cmd+Enter) clicks the Save button.
 */
export function useQuickSend(enabled) {
  const lastPressRef = React.useRef(0);

  React.useEffect(() => {
    if (!enabled) return;

    const handleKeydown = (event) => {
      if (event.key !== "Enter" || (!event.ctrlKey && !event.metaKey)) return;

      const now = Date.now();
      const diff = now - lastPressRef.current;

      if (diff > 0 && diff < DOUBLE_PRESS_MS) {
        event.preventDefault();
        lastPressRef.current = 0;

        const saveButton = document.querySelector(SAVE_BUTTON_SELECTOR);
        if (saveButton) {
          saveButton.click();
          toast.success("Save button clicked! (Ctrl+Enter x2)", {
            autoClose: 3000,
            id: "save-button-click",
          });
        } else {
          toast.error("Save button not found!", {
            autoClose: 3000,
            id: "save-button-not-found",
          });
        }
      } else {
        lastPressRef.current = now;
      }
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [enabled]);
}
