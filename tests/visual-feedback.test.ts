import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

(globalThis as { React?: unknown }).React = React; // components use the automatic JSX runtime in Next; vitest transforms classically
const root = path.resolve(__dirname, "..");
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

describe("SubmitButton (rendered, idle state)", () => {
  it("renders a submit button with its label and no spinner when idle", async () => {
    const { SubmitButton } = await import("@/components/submit-button");
    const html = renderToStaticMarkup(
      React.createElement(SubmitButton, { size: "sm", variant: "ghost" }, "نشر")
    );
    expect(html).toContain('type="submit"');
    expect(html).toContain("نشر");
    expect(html).not.toContain("animate-spin");
    expect(html).not.toMatch(/\sdisabled(=|\s|>)/);
    expect(html).not.toContain("invisible");
  });

  it("respects an explicit disabled prop", async () => {
    const { SubmitButton } = await import("@/components/submit-button");
    const html = renderToStaticMarkup(React.createElement(SubmitButton, { disabled: true }, "x"));
    expect(html).toMatch(/\sdisabled(=|\s|>)/);
  });

  it("keeps the label in the DOM while pending (source check, no layout shift)", () => {
    const src = read("components/submit-button.tsx");
    expect(src).toContain("useFormStatus");
    expect(src).toMatch(/pending \? "invisible"/);
    expect(src).toContain("disabled={disabled || pending}");
  });
});

describe("PendingLink", () => {
  it("uses useLinkStatus and an absolutely positioned indicator", () => {
    const src = read("components/pending-link.tsx");
    expect(src).toMatch(/import Link, \{ useLinkStatus \} from "next\/link"/);
    expect(src).toContain("absolute");
    expect(src).toContain("motion-reduce:animate-none");
  });
  it("renders a normal anchor with the same href when idle", async () => {
    const { PendingLink } = await import("@/components/pending-link");
    const html = renderToStaticMarkup(
      React.createElement(PendingLink, { href: "/courses", className: "x" }, "المقررات")
    );
    expect(html).toContain('href="/courses"');
    expect(html).toContain("المقررات");
    expect(html).not.toContain("animate-");
  });
});

describe("wiring", () => {
  it("admin status/move buttons and logout use SubmitButton with unchanged actions", () => {
    const t = read("components/admin-table-actions.tsx");
    expect(t).not.toContain("<Button");
    expect((t.match(/<SubmitButton/g) ?? []).length).toBe(4); // 3 status + 1 mapped move button
    expect(t).toContain("asNativeFormAction(setStatusAction)");
    expect(t).toContain("asNativeFormAction(moveAction)");
    for (const f of ['name="kind"', 'name="id"', 'name="status"', 'name="delta"']) expect(t).toContain(f);
    const l = read("components/logout-button.tsx");
    expect(l).toContain("<form action={logout}>");
    expect(l).toContain("SubmitButton");
  });

  it("navs and student pages use PendingLink; download link is untouched", () => {
    for (const f of [
      "components/admin-nav.tsx",
      "components/student-nav.tsx",
      "app/(student)/dashboard/page.tsx",
      "app/(student)/courses/page.tsx",
      "app/(student)/courses/[courseId]/page.tsx",
      "app/(student)/courses/[courseId]/[contentItemId]/page.tsx",
    ]) {
      expect(read(f)).toContain("PendingLink");
    }
    const d = read("components/download-link.tsx");
    expect(d).toContain('href={`/download/${materialId}`}');
    expect(d).not.toContain("use client");
    expect(d).not.toContain("setTimeout");
  });

  it("ConfirmButton keeps its confirm + transition logic", () => {
    const c = read("components/confirm-button.tsx");
    expect(c).toContain("window.confirm(confirmMessage)");
    expect(c).toContain("startTransition(async () => {\n            await action();");
    expect(c).toContain("disabled={pending}");
    expect(c).not.toContain("setTimeout");
  });

  it("HierarchyNav always reserves the status row", () => {
    const h = read("components/admin/hierarchy-nav.tsx");
    expect(h).toContain("h-5");
    expect(h).toContain('pending ? "" : "invisible"');
    expect(h).not.toMatch(/\{pending && \(\s*<span className="flex/);
  });

  it("ActionForm pending text is customizable; only upload form overrides it", () => {
    const a = read("components/action-form.tsx");
    expect(a).toContain('pendingLabel = "جارٍ الحفظ…"');
    expect(a).toContain("{pending ? pendingLabel : submitLabel}");
    const m = read("app/admin/materials/page.tsx");
    expect((m.match(/pendingLabel=/g) ?? []).length).toBe(1);
    expect(m).toMatch(/uploadMaterialAction\}[^>]*pendingLabel="جارٍ الرفع…"/);
  });

  it("loading boundaries exist for student and admin", () => {
    expect(fs.existsSync(path.join(root, "app/(student)/loading.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(root, "app/admin/loading.tsx"))).toBe(true);
  });
});
