"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/public/icons";
import { Input } from "@/components/ui/input";

/** Password field with a show/hide toggle. Purely presentational. */
export function PasswordInput({ id, name }: { id: string; name: string }) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required
        autoComplete="current-password"
        dir="ltr"
        className="pl-11 text-right"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
        aria-pressed={visible}
        className="absolute inset-y-0 left-0 flex w-11 items-center justify-center rounded-l-xl text-ink-500 hover:text-ink-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
      >
        {visible ? <EyeOffIcon className="h-5 w-5" /> : <EyeIcon className="h-5 w-5" />}
      </button>
    </div>
  );
}
