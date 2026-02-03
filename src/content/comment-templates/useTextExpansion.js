import React from "react";
import { getAliasFromLastLine, findExpansion } from "../../lib/textExpansion";

/**
 * Registers keydown listener: on ;alias + Enter, expands to template via onExpand(text, alias, title).
 */
export function useTextExpansion({ textExpansions, enabled, onExpand }) {
  const handleKeydown = React.useCallback(
    (event) => {
      if (!enabled) return;

      const target = event.target;
      const isInput =
        target.tagName === "TEXTAREA" ||
        (target.tagName === "INPUT" && target.type === "text") ||
        target.contentEditable === "true";
      if (!isInput) return;

      if (event.key !== "Enter") return;

      const text = target.value ?? target.textContent ?? "";
      const lines = text.split("\n");
      const lastLine = lines[lines.length - 1];
      const alias = getAliasFromLastLine(lastLine);
      if (!alias) return;

      const expansion = findExpansion(alias, textExpansions);
      if (!expansion) return;

      event.preventDefault();
      lines[lines.length - 1] = expansion.text;
      onExpand(lines.join("\n"), alias, expansion.title);
    },
    [textExpansions, enabled, onExpand],
  );

  React.useEffect(() => {
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [handleKeydown]);
}
