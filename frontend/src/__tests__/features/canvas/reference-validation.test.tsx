import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ReferenceValidationDialog, referenceIssues, matchesReference } from "@/features/canvas/nodes/shared/ReferenceValidationDialog";
import { readReferenceMediaLimits } from "@/api/referenceMediaLimits";

const focus = vi.hoisted(() => vi.fn());
const select = vi.hoisted(() => vi.fn());
vi.mock("@/stores/canvasStore", () => ({ useCanvasStore: { getState: () => ({
  nodes: [{ id: "source" }], requestFocusNode: focus, setSelectedNode: select,
}) } }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string, values?: Record<string, unknown>) =>
  `${key}${values ? ` ${values.actual} ${values.expected}` : ""}` }) }));

describe("reference media errors", () => {
  it("preserves optional limits without adding model-specific defaults", () => {
    expect(readReferenceMediaLimits({})).toEqual({});
    expect(readReferenceMediaLimits({ referenceImageMinWidth: null, referenceAudioFormats: [], referenceVideoMaxFPS: 60 }))
      .toEqual({ referenceImageMinWidth: null, referenceAudioFormats: [], referenceVideoMaxFPS: 60 });
    expect(readReferenceMediaLimits({ referenceImageMinWidth: -1, referenceVideoMaxFPS: Infinity })).toEqual({});
  });
  it("decodes only the structured validation contract", () => {
    const issue = { media: "image", index: 2, name: "portrait.png", reference_key: "freezone/portrait.png", code: "minWidth", actual: 299, expected: 300 };
    expect(referenceIssues({ body: { detail: { code: "REFERENCE_MEDIA_INVALID", errors: [issue] } } })).toEqual([issue]);
    expect(referenceIssues(new Error("other"))).toEqual([]);
  });
  it("matches decoded relative media paths without basename ambiguity", () => {
    expect(matchesReference("/api/v1/projects/p/media/freezone/%E5%9B%BE.png", "freezone/图.png")).toBe(true);
    expect(matchesReference("/media/other/图.png", "freezone/图.png")).toBe(false);
    expect(matchesReference("/media/x.png?secret=yes", "")).toBe(false);
  });
  it("lists every violation with actual/expected values and locates its source", () => {
    const close = vi.fn();
    const parentClick = vi.fn();
    render(<div onClick={parentClick}><ReferenceValidationDialog open onClose={close} issues={[
      { media: "image", index: 1, name: "same.png", reference_key: "a/same.png", code: "minWidth", actual: 299, expected: 300, nodeId: "source" },
      { media: "audio", index: 1, name: "voice.m4a", reference_key: "voice.m4a", code: "format", actual: "m4a", expected: ["wav", "mp3"] },
    ]} /></div>);
    expect(screen.getByText("referenceValidation.minWidth 299 300")).toBeInTheDocument();
    expect(screen.getByText("referenceValidation.format m4a wav, mp3")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "referenceValidation.locate" }));
    expect(select).toHaveBeenCalledWith("source");
    expect(focus).toHaveBeenCalledWith("source");
    expect(close).toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();
  });
});
