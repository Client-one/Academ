"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";

type Result = { error?: string; success?: string } | void;

/**
 * Styled, accessible delete confirmation (native <dialog>: focus trap, Esc to
 * close). Shows the server's error message instead of failing silently.
 */
export function DeleteButton({
  action,
  itemName,
  warning = "لا يمكن التراجع عن هذا الإجراء.",
  label = "حذف",
}: {
  action: () => Promise<Result>;
  itemName: string;
  warning?: string;
  label?: string;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const close = () => ref.current?.close();

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        className="!text-red-700 hover:!bg-red-50 focus-visible:ring-red-500"
        onClick={() => {
          setError(null);
          ref.current?.showModal();
        }}
      >
        {label}
      </Button>
      <dialog
        ref={ref}
        aria-labelledby="delete-title"
        className="m-auto w-[min(92vw,26rem)] rounded-3xl border border-ink-200 bg-white p-0 text-ink-900 shadow-lift backdrop:bg-slate-950/60"
      >
        <div className="p-6">
          <span aria-hidden className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-xl font-extrabold text-red-600">
            !
          </span>
          <h2 id="delete-title" className="text-lg font-extrabold text-ink-950">
            حذف «{itemName}»؟
          </h2>
          <p className="mt-2 text-sm leading-7 text-ink-600">{warning}</p>
          {error && (
            <p role="alert" className="mt-3 rounded-xl border border-red-300 bg-red-50 p-3 text-sm font-medium text-red-900">
              {error}
            </p>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={close} disabled={pending}>
              إلغاء
            </Button>
            <Button
              variant="danger"
              disabled={pending}
              aria-busy={pending || undefined}
              onClick={() =>
                startTransition(async () => {
                  const res = await action();
                  if (res && res.error) setError(res.error);
                  else close();
                })
              }
            >
              {pending ? "جارٍ الحذف…" : "نعم، احذف"}
            </Button>
          </div>
        </div>
      </dialog>
    </>
  );
}
