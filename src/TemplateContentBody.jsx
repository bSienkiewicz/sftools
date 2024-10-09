import React, { useEffect } from "react";
import "./index.css";
import { Check } from "lucide-react";
import toast from "react-hot-toast";

const ContentBody = ({root}) => {
  const [messages, setMessages] = React.useState([]);
  const [copiedItemId, setCopiedItemId] = React.useState(null);
  const [textarea, setTextarea] = React.useState(null);
  const [checkbox, setCheckbox] = React.useState(null);

  const fillFields = React.useCallback((text, itemId, title) => {
    let actions = 0;

    if (textarea) {
      textarea.value = text;
      textarea.style.height = "200px";
      textarea.dispatchEvent(new Event("input", { bubbles: true, cancelable: true }));
      textarea.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
      textarea.dispatchEvent(new Event("blur", { bubbles: true, cancelable: true }));
      textarea.dispatchEvent(new Event("focus", { bubbles: true, cancelable: true }));
      actions++;
    }

    if (checkbox && !checkbox.checked) {
      checkbox.click();
      checkbox.dispatchEvent(new Event("change", { bubbles: true, cancelable: true }));
    }

    if (actions > 0) {
      toast.success(<span>Comment body filled with <b>{title}</b></span>, {
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
      setCopiedItemId(itemId);
    }
  }, [textarea, checkbox]);

  React.useEffect(() => {
    let parentNode;

    const checkForTextarea = () => {
      const foundTextarea = parentNode.querySelector("textarea");
      setTextarea(foundTextarea || null);
    };

    const checkForCheckboxes = () => {
      const foundCheckbox = parentNode.querySelector('input[type="checkbox"]');
      setCheckbox(foundCheckbox || null);
    };

    const initializeObserver = () => {
      parentNode = root.parentNode;
      if (!parentNode) return;

      // Initial check for textarea and checkbox
      checkForTextarea();
      checkForCheckboxes();

      const observer = new MutationObserver((mutationsList) => {
        mutationsList.forEach((mutation) => {
          if (mutation.type === "childList" || mutation.type === "subtree" || mutation.type === "attributes") {
            checkForTextarea();
            checkForCheckboxes();
          }
        });
      });

      observer.observe(parentNode, {
        childList: true,
        subtree: true,
        attributes: true,
      });

      // Cleanup the observer when the component unmounts
      return () => observer.disconnect();
    };

    // Observe URL changes in a single-page app (to detect route/layout changes)
    const observeRouteChanges = () => {
      const handleRouteChange = () => {
        console.log("Route change detected");
        initializeObserver();
      };

      // Listen for URL or route changes
      window.addEventListener("hashchange", handleRouteChange);
      window.addEventListener("popstate", handleRouteChange); // Reacts to SPA navigation

      return () => {
        window.removeEventListener("hashchange", handleRouteChange);
        window.removeEventListener("popstate", handleRouteChange);
      };
    };

    // Initial call to setup observer and route change detection
    initializeObserver();
    const cleanupRouteChangeObserver = observeRouteChanges();

    return () => {
      cleanupRouteChangeObserver();
    };
  }, []);

  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.button_messages) {
      const newMessages = changes.button_messages.newValue;
      setMessages(newMessages);
      toast.success("Button messages updated", {
        duration: 3000,
        icon: "📝",
        id: "updated-messages",
      });
    }
  });

  React.useEffect(() => {
    chrome.storage.local.get("button_messages", (result) => {
      const messages = result.button_messages || [];
      setMessages(messages);
    });
  }, []);

  return (
    <div className="relative p-4 border rounded">
      {messages.map((category, index) => (
        <div className="relative" key={category.id}>
          <h2
            key={category.id}
            className="text-base text-gray-700 font-semibold"
            style={{ marginBottom: "10px" }}
          >
            {category.title}
          </h2>
          <div
            className="flex gap-4 flex-wrap"
            style={{ flexWrap: "wrap", gap: "6px" }}
          >
            {category.messages.map((msg, index) => (
              <button
                key={msg.id}
                className="border rounded px-4 py-2 text-[14px] font-semibold transition-all bg-neutral-100"
                style={{
                  color: copiedItemId === msg.id ? "#0b963e" : "#3a424a",
                  borderColor: copiedItemId === msg.id ? "#0b963e" : "#68717a",
                  backgroundColor:
                    copiedItemId === msg.id ? "#d3f5df" : "#f7f9fa",
                }}
                onClick={() => fillFields(msg.message, msg.id, msg.title)}
              >
                {msg.title}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContentBody;
