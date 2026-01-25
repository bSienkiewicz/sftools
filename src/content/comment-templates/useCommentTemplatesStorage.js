import React from "react";
import toast from "react-hot-toast";
import { STORAGE_KEYS, COMMENT_TEMPLATES_KEYS } from "../../constants/storage";

function messagesToExpansions(messages) {
  if (!Array.isArray(messages)) return [];
  return messages
    .flatMap((category) => category.messages || [])
    .filter((msg) => msg.alias)
    .map((msg) => ({
      alias: msg.alias,
      text: msg.message,
      title: msg.title,
    }));
}

/**
 * Loads and syncs comment templates + settings from chrome.storage.
 */
export function useCommentTemplatesStorage() {
  const [messages, setMessages] = React.useState([]);
  const [textExpansions, setTextExpansions] = React.useState([]);
  const [showTemplates, setShowTemplates] = React.useState(true);
  const [enableTextExpansion, setEnableTextExpansion] = React.useState(true);
  const [showTextExpansionAlias, setShowTextExpansionAlias] = React.useState(true);
  const [quickSendToggle, setQuickSendToggle] = React.useState(true);

  React.useEffect(() => {
    chrome.storage.local.get(COMMENT_TEMPLATES_KEYS, (result) => {
      const msg = result[STORAGE_KEYS.BUTTON_MESSAGES] || [];
      setMessages(msg);
      setTextExpansions(messagesToExpansions(msg));
      setShowTemplates(result[STORAGE_KEYS.SHOW_TEMPLATES] ?? true);
      setEnableTextExpansion(result[STORAGE_KEYS.ENABLE_TEXT_EXPANSION] !== false);
      setShowTextExpansionAlias(result[STORAGE_KEYS.SHOW_TEXT_EXPANSION_ALIAS] !== false);
      setQuickSendToggle(result[STORAGE_KEYS.QUICK_SEND_TOGGLE] !== false);
    });
  }, []);

  React.useEffect(() => {
    const listener = (changes, namespace) => {
      if (namespace !== "local") return;

      if (changes[STORAGE_KEYS.BUTTON_MESSAGES]) {
        const newMessages = changes[STORAGE_KEYS.BUTTON_MESSAGES].newValue ?? [];
        setMessages(newMessages);
        setTextExpansions(messagesToExpansions(newMessages));
        toast.success("Button messages updated", {
          duration: 3000,
          icon: "📝",
          id: "updated-messages",
        });
      }
      if (changes[STORAGE_KEYS.SHOW_TEMPLATES]) {
        setShowTemplates(changes[STORAGE_KEYS.SHOW_TEMPLATES].newValue ?? true);
      }
      if (changes[STORAGE_KEYS.ENABLE_TEXT_EXPANSION]) {
        setEnableTextExpansion(changes[STORAGE_KEYS.ENABLE_TEXT_EXPANSION].newValue !== false);
      }
      if (changes[STORAGE_KEYS.SHOW_TEXT_EXPANSION_ALIAS]) {
        setShowTextExpansionAlias(
          changes[STORAGE_KEYS.SHOW_TEXT_EXPANSION_ALIAS].newValue !== false,
        );
      }
      if (changes[STORAGE_KEYS.QUICK_SEND_TOGGLE]) {
        setQuickSendToggle(changes[STORAGE_KEYS.QUICK_SEND_TOGGLE].newValue !== false);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return {
    messages,
    textExpansions,
    showTemplates,
    enableTextExpansion,
    showTextExpansionAlias,
    quickSendToggle,
  };
}
