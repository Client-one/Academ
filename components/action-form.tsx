"use client";

import { useActionState, type ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export type FormAction = (formData: FormData) => Promise<{ error?: string; success?: string } | void>;

/**
 * Generic server-action form wrapper: pending state, error/success feedback.
 * Lets admin pages stay Server Components while getting client UX.
 */
export function ActionForm({
  action,
  children,
  submitLabel = "حفظ",
  className = "",
  maxFileBytes,
}: {
  action: FormAction;
  children: ReactNode;
  submitLabel?: string;
  className?: string;
  /** Optional client-side guard so an oversize file is rejected before upload. */
  maxFileBytes?: number;
}) {
  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string; success?: string }, formData: FormData) => {
      if (maxFileBytes) {
        for (const value of formData.values()) {
          if (value instanceof File && value.size > maxFileBytes) {
            return { error: `حجم الملف يتجاوز الحد المسموح (${maxFileBytes / 1_000_000} ميغابايت).` };
          }
        }
      }
      try {
        return (await action(formData)) ?? {};
      } catch (e) {
        // Framework-level failures (e.g. request body too large) throw before
        // the action runs; show a safe message instead of the error page.
        const digest = (e as { digest?: string } | null)?.digest;
        if (typeof digest === "string" && digest.startsWith("NEXT_")) throw e; // redirect/notFound
        return { error: "تعذر إتمام العملية. إذا كنت ترفع ملفًا فقد يكون حجمه أكبر من المسموح؛ جرّب ملفًا أصغر." };
      }
    },
    {}
  );

  return (
    <form action={formAction} className={`space-y-4 ${className}`}>
      {state.error && <Alert kind="error">{state.error}</Alert>}
      {state.success && <Alert kind="success">{state.success}</Alert>}
      {children}
      <Button type="submit" disabled={pending}>
        {pending ? "جارٍ الحفظ…" : submitLabel}
      </Button>
    </form>
  );
}
