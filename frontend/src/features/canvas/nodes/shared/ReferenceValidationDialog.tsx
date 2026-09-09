// SPDX-License-Identifier: Elastic-2.0
// Copyright (c) 2026 ClaymoreLab
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCanvasStore } from "@/stores/canvasStore";

export interface ReferenceIssue {
  media: string;
  index: number;
  name: string;
  reference_key: string;
  code: string;
  actual?: unknown;
  expected?: unknown;
  nodeId?: string;
  label?: string;
  role?: string;
}

export function referenceIssues(error: unknown): ReferenceIssue[] {
  const body = (error as { body?: { detail?: { code?: string; errors?: unknown } } })?.body;
  const detail = body?.detail;
  if (detail?.code !== "REFERENCE_MEDIA_INVALID" || !Array.isArray(detail.errors)) return [];
  return detail.errors.filter((item): item is ReferenceIssue =>
    item && typeof item.code === "string" && typeof item.reference_key === "string"
    && typeof item.media === "string" && typeof item.index === "number",
  );
}

export function matchesReference(url: string, key: string): boolean {
  if (!key) return false;
  try {
    return decodeURIComponent(new URL(url, "https://local.invalid").pathname).endsWith(`/${key}`);
  } catch { return false; }
}

export function ReferenceValidationDialog({ issues, open, onClose }: {
  issues: ReferenceIssue[]; open: boolean; onClose: () => void;
}) {
  const { t } = useTranslation();
  const display = (value: unknown) => Array.isArray(value) ? value.join(", ") : String(value ?? "—");
  return <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
    <DialogContent className="max-h-[80vh] overflow-y-auto" onClick={(event) => event.stopPropagation()}>
      <DialogHeader>
        <DialogTitle>{t("referenceValidation.title")}</DialogTitle>
        <DialogDescription>{t("referenceValidation.hint")}</DialogDescription>
      </DialogHeader>
      <ul className="space-y-4">
        {issues.map((issue, index) => <li key={index} className="space-y-1 text-sm">
          <p className="font-medium">{t(`referenceValidation.${issue.role === "首帧" || issue.role === "first_frame" ? "firstFrame" : issue.role === "尾帧" || issue.role === "last_frame" ? "lastFrame" : issue.media}`)} {issue.index} · {issue.label || issue.name}</p>
          <p>{t(`referenceValidation.${issue.code}`, { actual: display(issue.actual), expected: display(issue.expected) })}</p>
          {issue.nodeId && <button type="button" className="tap-button" onClick={(event) => {
            event.stopPropagation();
            const store = useCanvasStore.getState();
            if (store.nodes.some((node) => node.id === issue.nodeId)) {
              store.setSelectedNode(issue.nodeId!);
              store.requestFocusNode(issue.nodeId!);
            }
            onClose();
          }}>{t("referenceValidation.locate")}</button>}
        </li>)}
      </ul>
    </DialogContent>
  </Dialog>;
}
