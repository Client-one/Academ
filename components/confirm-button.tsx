"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";

/**
 * Confirmation-gated action button (native confirm dialog for V1 —
 * styled modal dialogs are a documented future refinement).
 */
export function ConfirmButton({
  action,
  confirmMessage,
  label,
  variant = "secondary",
  size = "sm",
}: {
  action: () => Promise<{ error?: string } | void>;
  confirmMessage: string;
  label: string;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant={variant}
      size={size}
      disabled={pending}
      aria-busy={pending || undefined}
      className="relative"
      onClick={() => {
        if (window.confirm(confirmMessage)) {
          startTransition(async () => {
            await action();
          });
        }
      }}
    >
      <span className={pending ? "invisible" : undefined}>{label}</span>
      {pending && (
        <span className="absolute inset-0 flex items-center justify-center" role="status">
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none"
          />
          <span className="sr-only">جارٍ التنفيذ…</span>
        </span>
      )}
    </Button>
  );
}
