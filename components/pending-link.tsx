"use client";

import Link, { useLinkStatus } from "next/link";
import type { ComponentProps } from "react";

/**
 * Visual-only pending indicator rendered INSIDE a <Link>. It is absolutely
 * positioned, so it never changes the layout. useLinkStatus reports the
 * state of the navigation started by the parent Link (no extra requests).
 */
function LinkPendingMark({ indicator }: { indicator: "bar" | "corner" }) {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <>
      {indicator === "bar" ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 animate-pulse rounded-full bg-brand-600 motion-reduce:animate-none"
        />
      ) : (
        <span
          aria-hidden
          className="pointer-events-none absolute end-3 top-3 h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-700 motion-reduce:animate-none"
        />
      )}
      <span className="sr-only" role="status">جارٍ التحميل…</span>
    </>
  );
}

type PendingLinkProps = ComponentProps<typeof Link> & {
  /** "bar": thin line under the link (nav). "corner": small spinner (cards). */
  indicator?: "bar" | "corner";
};

/** next/link with a non-shifting pending indicator. Same props, same navigation. */
export function PendingLink({
  indicator = "bar",
  className = "",
  children,
  ...props
}: PendingLinkProps) {
  return (
    <Link {...props} className={`relative active:opacity-70 ${className}`}>
      {children}
      <LinkPendingMark indicator={indicator} />
    </Link>
  );
}
