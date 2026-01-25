import React from "react";
import toast from "react-hot-toast";
import { fillCommentForm } from "../../lib/fillCommentForm";

function findPublicCheckbox(root) {
  if (!root?.parentNode) return null;
  let found = null;
  root.parentNode.querySelectorAll("div").forEach((div) => {
    if (div.textContent.trim() === "Public") {
      const cb = div.querySelector('input[type="checkbox"]');
      if (cb && cb.offsetParent !== null) found = cb;
    }
  });
  return found;
}

/**
 * Resolves textarea and Public checkbox in the host page and provides fillFields.
 */
export function useCommentFormFields(root) {
  const [textarea, setTextarea] = React.useState(null);
  const [checkbox, setCheckbox] = React.useState(null);
  const [copiedItemId, setCopiedItemId] = React.useState(null);
  const lastCheckboxRef = React.useRef(null);

  const findPublicCheckboxMemo = React.useCallback(() => findPublicCheckbox(root), [root]);

  const fillFields = React.useCallback(
    (text, itemId, title) => {
      const didSomething = fillCommentForm(textarea, checkbox, text);
      if (didSomething) {
        toast.success(`Comment body filled with ${title}`, {
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        setCopiedItemId(itemId);
      }
    },
    [textarea, checkbox],
  );

  React.useEffect(() => {
    if (!root?.parentNode) return;
    const parent = root.parentNode;

    const check = () => {
      const foundTextarea = parent.querySelector("textarea");
      setTextarea(foundTextarea || null);

      const newCheckbox = findPublicCheckboxMemo();
      if (newCheckbox && newCheckbox !== lastCheckboxRef.current) {
        lastCheckboxRef.current = newCheckbox;
        setCheckbox(newCheckbox);
      }
    };

    check();

    const observer = new MutationObserver((mutationsList) => {
      const relevant = mutationsList.some(
        (m) => m.type === "childList" || m.type === "attributes",
      );
      if (relevant) check();
    });

    observer.observe(parent, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    const onRouteChange = () => check();
    window.addEventListener("hashchange", onRouteChange);
    window.addEventListener("popstate", onRouteChange);

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", onRouteChange);
      window.removeEventListener("popstate", onRouteChange);
    };
  }, [root, findPublicCheckboxMemo]);

  return { textarea, checkbox, fillFields, copiedItemId };
}
