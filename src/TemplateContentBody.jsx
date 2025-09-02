import React, { useEffect } from "react";
import "./index.css";
import { Check } from "lucide-react";
import toast from "react-hot-toast";

const ContentBody = ({ root }) => {
  const [showTemplates, setShowTemplates] = React.useState(false);
  const [messages, setMessages] = React.useState([]);
  const [copiedItemId, setCopiedItemId] = React.useState(null);
  const [textarea, setTextarea] = React.useState(null);
  const [checkbox, setCheckbox] = React.useState(null);
  const [textExpansions, setTextExpansions] = React.useState([]);
  const [enableTextExpansion, setEnableTextExpansion] = React.useState(true);
  const [lastCtrlEnterTime, setLastCtrlEnterTime] = React.useState(0);
  
  const lastCheckboxRef = React.useRef(null);

  // Reusable function to find the Public checkbox
  const findPublicCheckbox = React.useCallback(() => {
    let foundCheckbox = null;
    if (root && root.parentNode) {
      root.parentNode.querySelectorAll('div').forEach(div => {
        if (div.textContent.trim() === 'Public') {
          const checkbox = div.querySelector('input[type="checkbox"]');
          // Ensure checkbox exists and is not hidden
          if (checkbox && checkbox.offsetParent !== null) {
            foundCheckbox = checkbox;
          }
        }
      });
    }
    return foundCheckbox;
  }, [root]);

  const fillFields = React.useCallback((text, itemId, title) => {
    let actions = 0;
    if (textarea) {
      textarea.value = text;
      textarea.style.height = "200px";
      textarea.dispatchEvent(
        new Event("input", { bubbles: true, cancelable: true }),
      );
      textarea.dispatchEvent(
        new Event("change", { bubbles: true, cancelable: true }),
      );
      textarea.dispatchEvent(
        new Event("blur", { bubbles: true, cancelable: true }),
      );
      textarea.dispatchEvent(
        new Event("focus", { bubbles: true, cancelable: true }),
      );
      actions++;
    }

    if (checkbox && !checkbox.checked) {
      checkbox.click();
      checkbox.dispatchEvent(
        new Event("change", { bubbles: true, cancelable: true }),
      );
    }

    if (actions > 0) {
      toast.success(
        <span>
          Comment body filled with <b>{title}</b>
        </span>,
        {
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
        },
      );
      setCopiedItemId(itemId);
    }
  }, [textarea, checkbox]);

  // Function to handle text expansion and visual feedback
  const handleTextExpansion = React.useCallback((event) => {
    // Check if text expansion is enabled
    if (!enableTextExpansion) return;
    
    const target = event.target;
    const isTextInput = target.tagName === 'TEXTAREA' || 
                       (target.tagName === 'INPUT' && target.type === 'text') ||
                       target.contentEditable === 'true';
    
    if (!isTextInput) return;
    
    // Check if Enter was pressed
    if (event.key === 'Enter') {
      const currentText = target.value || target.textContent || '';
      const lines = currentText.split('\n');
      const lastLine = lines[lines.length - 1];
      
      // Look for alias pattern (semicolon + alias)
      const aliasMatch = lastLine.match(/^;(\w+)$/);
      
      if (aliasMatch) {
        const alias = aliasMatch[1];
        const expansion = textExpansions.find(exp => exp.alias === alias);
        
        if (expansion) {
          event.preventDefault();
          
          // Replace the last line with the expansion text
          lines[lines.length - 1] = expansion.text;
          const newText = lines.join('\n');
          
          // Use fillFields function for consistency
          fillFields(newText, expansion.alias, expansion.title);
        }
      }
    }
  }, [textExpansions, enableTextExpansion, fillFields]);

  // Function to handle Ctrl+Enter double press for Save button
  const handleCtrlEnterDoublePress = React.useCallback((event) => {
    // Check if Ctrl+Enter was pressed
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      const currentTime = Date.now();
      const timeDiff = currentTime - lastCtrlEnterTime;
      
      // If second Ctrl+Enter within 500ms, trigger Save button
      if (timeDiff < 500 && timeDiff > 0) {
        event.preventDefault();
        
        // Find and click the Save button
        const saveButton = document.querySelector('button[title="Save"], button[aria-label*="Save"], .slds-button[title="Save"]');
        if (saveButton) {
          saveButton.click();
          toast.success(
            <span>
              <b>Save button clicked!</b> (Ctrl+Enter x2)
            </span>,
            {
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              id: "save-button-click",
            },
          );
        } else {
          toast.error(
            <span>
              <b>Save button not found!</b>
            </span>,
            {
              autoClose: 3000,
              hideProgressBar: false,
              closeOnClick: true,
              pauseOnHover: true,
              draggable: true,
              progress: undefined,
              id: "save-button-not-found",
            },
          );
        }
        
        // Reset the timer
        setLastCtrlEnterTime(0);
      } else {
        // First Ctrl+Enter press, record the time
        setLastCtrlEnterTime(currentTime);
      }
    }
  }, [lastCtrlEnterTime]);

  // Function to handle visual feedback for aliases
  const handleAliasVisualFeedback = React.useCallback((event) => {
    // Check if text expansion is enabled
    if (!enableTextExpansion) return;
    
    const target = event.target;
    const isTextarea = target.tagName === 'TEXTAREA';
    
    if (!isTextarea) return;
    
    const currentText = target.value || '';
    const lines = currentText.split('\n');
    const lastLine = lines[lines.length - 1];
    
    // Look for alias pattern (semicolon + alias)
    const aliasMatch = lastLine.match(/^;(\w+)$/);
    
    if (aliasMatch) {
      const alias = aliasMatch[1];
      const expansion = textExpansions.find(exp => exp.alias === alias);
      
      if (expansion) {
        // Add visual feedback - highlight the alias with green border
        target.style.borderColor = '#0b963e'; // Green border
        target.style.boxShadow = '0 0 0 1px #0b963e';
      } else {
        // Invalid alias - reset styling
        target.style.borderColor = '';
        target.style.borderWidth = '';
        target.style.boxShadow = '';
      }
    } else {
      // No alias pattern - reset styling
      target.style.borderColor = '';
      target.style.borderWidth = '';
      target.style.boxShadow = '';
    }
  }, [textExpansions, enableTextExpansion]);
  
  const checkShowTemplates = () => {
    chrome.storage.local.get("showTemplates", (result) => {
      setShowTemplates(result.showTemplates);
    });
  };

  const checkEnableTextExpansion = () => {
    chrome.storage.local.get("enableTextExpansion", (result) => {
      setEnableTextExpansion(result.enableTextExpansion !== false); // Default to true if not set
    });
  };

  React.useEffect(() => {
    let parentNode;
    const checkForTextarea = () => {
      const foundTextarea = parentNode.querySelector("textarea");
      setTextarea(foundTextarea || null);
    };

    const checkForCheckboxes = () => {
      const newCheckbox = findPublicCheckbox();
    
      if (newCheckbox && newCheckbox !== lastCheckboxRef.current) {
        lastCheckboxRef.current = newCheckbox;
        setCheckbox(newCheckbox);
      }
    };

    const initializeObserver = () => {
      parentNode = root.parentNode;
      if (!parentNode) return;

      // Initial check for textarea and checkbox
      checkForTextarea();
      checkForCheckboxes();

      const observer = new MutationObserver((mutationsList) => {
        mutationsList.forEach((mutation) => {
          if (
            mutation.type === "childList" || mutation.type === "subtree" ||
            mutation.type === "attributes"
          ) {
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

  // Set up text expansion event listener
  React.useEffect(() => {
    document.addEventListener('keydown', handleTextExpansion);
    document.addEventListener('keydown', handleCtrlEnterDoublePress);
    
    return () => {
      document.removeEventListener('keydown', handleTextExpansion);
      document.removeEventListener('keydown', handleCtrlEnterDoublePress);
    };
  }, [handleTextExpansion, handleCtrlEnterDoublePress]);

  // Set up visual feedback event listener
  React.useEffect(() => {
    document.addEventListener('input', handleAliasVisualFeedback);
    
    return () => {
      document.removeEventListener('input', handleAliasVisualFeedback);
    };
  }, [handleAliasVisualFeedback]);



  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === "local" && changes.button_messages) {
      const newMessages = changes.button_messages.newValue;
      setMessages(newMessages);
      
      // Update text expansions when messages change
      if (newMessages) {
        const expansions = newMessages
          .flatMap(category => category.messages)
          .filter(msg => msg.alias)
          .map(msg => ({
            alias: msg.alias,
            text: msg.message,
            title: msg.title
          }));
        setTextExpansions(expansions);
      }
      
      toast.success("Button messages updated", {
        duration: 3000,
        icon: "📝",
        id: "updated-messages",
      });
    }
    
    if (namespace === "local" && changes.enableTextExpansion) {
      setEnableTextExpansion(changes.enableTextExpansion.newValue !== false);
    }
  });

  React.useEffect(() => {
    chrome.storage.local.get("button_messages", (result) => {
      const messages = result.button_messages || [];
      setMessages(messages);
      
      // Extract text expansions from messages
      const expansions = messages
        .flatMap(category => category.messages)
        .filter(msg => msg.alias) // Only include messages with aliases
        .map(msg => ({
          alias: msg.alias,
          text: msg.message,
          title: msg.title
        }));
      setTextExpansions(expansions);
    });
    checkShowTemplates();
    checkEnableTextExpansion();
  }, []);

  if (!showTemplates) return;

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
                   backgroundColor: copiedItemId === msg.id
                     ? "#d3f5df"
                     : "#f7f9fa",
                 }}
                 onClick={() => fillFields(msg.message, msg.id, msg.title)}
               >
                 <div className="flex flex-row gap-2">
                   <span className="text-sm text-gray-600">{msg.title}</span>
                   {msg.alias && (
                     <span className="text-gray-500" style={{"alignSelf": "center", "fontSize": "8px"}}>;{msg.alias}</span>
                   )}
                 </div>
               </button>
             ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContentBody;
