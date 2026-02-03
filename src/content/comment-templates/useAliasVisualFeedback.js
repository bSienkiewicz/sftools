import React from "react";
import { getAliasFromLastLine, findExpansion } from "../../lib/textExpansion";

const VALID_STYLE = {
  borderColor: "#0b963e",
  boxShadow: "0 0 0 1px #0b963e",
};
const RESET_STYLE = {
  borderColor: "",
  borderWidth: "",
  boxShadow: "",
};

/**
 * Registers input listener: green border when last line is ;alias and valid.
 */
export function useAliasVisualFeedback({ textExpansions, enabled }) {
  const handleInput = React.useCallback(
    (event) => {
      if (!enabled) return;
      const target = event.target;
      if (target.tagName !== "TEXTAREA") return;

      const text = target.value ?? "";
      const lines = text.split("\n");
      const lastLine = lines[lines.length - 1];
      const alias = getAliasFromLastLine(lastLine);

      if (!alias) {
        Object.assign(target.style, RESET_STYLE);
        return;
      }

      const expansion = findExpansion(alias, textExpansions);
      if (expansion) {
        Object.assign(target.style, VALID_STYLE);
      } else {
        Object.assign(target.style, RESET_STYLE);
      }
    },
    [textExpansions, enabled],
  );

  React.useEffect(() => {
    document.addEventListener("input", handleInput);
    return () => document.removeEventListener("input", handleInput);
  }, [handleInput]);
}
