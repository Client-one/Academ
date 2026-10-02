import { describe, expect, it } from "vitest";
import {
  fileKindAllowedForMaterialKind,
  MATERIAL_KIND_FILE_RULES,
} from "@/lib/security/file-validation";

/**
 * material_kind ↔ file-type consistency (spec: a tampered client must never
 * upload a file type incompatible with the chosen material kind).
 * The same rule is enforced in the database by
 * public.content_materials_kind_file_chk() (migration 0004).
 */
describe("fileKindAllowedForMaterialKind", () => {
  it("official_professor_pdf accepts PDF only", () => {
    expect(fileKindAllowedForMaterialKind("official_professor_pdf", "pdf")).toBe(true);
    expect(fileKindAllowedForMaterialKind("official_professor_pdf", "jpg")).toBe(false);
    expect(fileKindAllowedForMaterialKind("official_professor_pdf", "png")).toBe(false);
    expect(fileKindAllowedForMaterialKind("official_professor_pdf", "webp")).toBe(false);
  });

  it("student_summary_pdf accepts PDF only", () => {
    expect(fileKindAllowedForMaterialKind("student_summary_pdf", "pdf")).toBe(true);
    expect(fileKindAllowedForMaterialKind("student_summary_pdf", "png")).toBe(false);
  });

  it("student_summary_image accepts images only", () => {
    expect(fileKindAllowedForMaterialKind("student_summary_image", "jpg")).toBe(true);
    expect(fileKindAllowedForMaterialKind("student_summary_image", "png")).toBe(true);
    expect(fileKindAllowedForMaterialKind("student_summary_image", "webp")).toBe(true);
    expect(fileKindAllowedForMaterialKind("student_summary_image", "pdf")).toBe(false);
  });

  it("unknown kind codes have no file restriction", () => {
    expect(fileKindAllowedForMaterialKind("some_future_kind", "pdf")).toBe(true);
  });

  it("rules table covers exactly the V1 kinds", () => {
    expect(Object.keys(MATERIAL_KIND_FILE_RULES).sort()).toEqual([
      "official_professor_pdf",
      "student_summary_image",
      "student_summary_pdf",
    ]);
  });
});
