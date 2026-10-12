"use client";

import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

/**
 * Submit button for plain <form action={serverAction}> forms. While the
 * enclosing form is submitting it is disabled (blocks double submits) and
 * shows a spinner. The label stays in the DOM (invisible) so the button
 * keeps its width — no layout shift. The form's action is untouched.
 */
export function SubmitButton({
  children,
  disabled,
  ...props
}: Omit<ButtonProps, "type">) {
  const { pending } = useFormStatus();
  return (
    <Button
      {...props}
      type="submit"
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      className={`relative ${props.className ?? ""}`}
    >
      <span className={pending ? "invisible" : undefined}>{children}</span>
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
