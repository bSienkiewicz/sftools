import React from "react";
import { useCommentTemplatesStorage } from "./useCommentTemplatesStorage";
import { useCommentFormFields } from "./useCommentFormFields";
import { useTextExpansion } from "./useTextExpansion";
import { useAliasVisualFeedback } from "./useAliasVisualFeedback";
import { useQuickSend } from "./useQuickSend";
import CommentTemplatesPanel from "./CommentTemplatesPanel";

/**
 * Orchestrates comment templates feature: storage, form fields, text expansion,
 * alias feedback, quick send, and the panel UI.
 */
export default function CommentTemplatesRoot({ root }) {
  const storage = useCommentTemplatesStorage();
  const { fillFields, copiedItemId } = useCommentFormFields(root);

  useTextExpansion({
    textExpansions: storage.textExpansions,
    enabled: storage.enableTextExpansion,
    onExpand: fillFields,
  });

  useAliasVisualFeedback({
    textExpansions: storage.textExpansions,
    enabled: storage.enableTextExpansion,
  });

  useQuickSend(storage.quickSendToggle);

  if (!storage.showTemplates) return null;

  return (
    <CommentTemplatesPanel
      messages={storage.messages}
      showTextExpansionAlias={storage.showTextExpansionAlias}
      onFillFields={fillFields}
      copiedItemId={copiedItemId}
    />
  );
}
