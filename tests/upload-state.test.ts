import { describe, expect, it } from "vitest";
import {
  isConsistentUploadState,
  isStudentVisibleState,
} from "@/lib/data/upload-state";

const PATH = "a/b/c.pdf";

describe("isConsistentUploadState", () => {
  it("pending: no storage path, draft only", () => {
    expect(isConsistentUploadState("pending", null, false, "draft")).toBe(true);
    expect(isConsistentUploadState("pending", PATH, false, "draft")).toBe(false);
    expect(isConsistentUploadState("pending", null, false, "published")).toBe(false);
  });

  it("ready: requires a real storage path", () => {
    expect(isConsistentUploadState("ready", PATH, false, "published")).toBe(true);
    expect(isConsistentUploadState("ready", PATH, false, "draft")).toBe(true);
    // invalid combination: ready with NULL path — rejected even with an article
    expect(isConsistentUploadState("ready", null, false, "published")).toBe(false);
    expect(isConsistentUploadState("ready", null, true, "published")).toBe(false);
  });

  it("none: article-only, no file", () => {
    expect(isConsistentUploadState("none", null, true, "published")).toBe(true);
    expect(isConsistentUploadState("none", null, false, "draft")).toBe(false);
    expect(isConsistentUploadState("none", PATH, true, "draft")).toBe(false);
  });
});

describe("isStudentVisibleState", () => {
  it("pending materials are never visible to students", () => {
    expect(isStudentVisibleState("pending", false)).toBe(false);
  });

  it("ready materials are visible", () => {
    expect(isStudentVisibleState("ready", false)).toBe(true);
  });

  it("article-only materials (none) are visible via the article", () => {
    expect(isStudentVisibleState("none", true)).toBe(true);
    expect(isStudentVisibleState("none", false)).toBe(false);
  });

  it("an attached article makes any upload state visible", () => {
    expect(isStudentVisibleState("pending", true)).toBe(true);
    expect(isStudentVisibleState("ready", true)).toBe(true);
  });
});
