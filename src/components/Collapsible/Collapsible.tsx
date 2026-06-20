"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

type Props = {
  title: string;
  description?: string; // shown inside, above the content, when open
  badge?: string; // small pill next to the title (e.g. a count)
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
};

// A Card-styled disclosure: a clickable header toggles its content, keeping
// long forms/lists tucked away to avoid endless scrolling. The content is
// unmounted while collapsed.
export default function Collapsible({
  title,
  description,
  badge,
  defaultOpen = false,
  children,
  className = "",
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={`rounded-2xl border border-subtle bg-surface ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2">
          <span className="text-base font-medium text-fg">{title}</span>
          {badge && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs font-medium text-muted">
              {badge}
            </span>
          )}
        </span>
        <ChevronDown
          className={
            "h-5 w-5 shrink-0 text-muted transition-transform " +
            (open ? "rotate-180" : "")
          }
          strokeWidth={2}
        />
      </button>

      {open && (
        <div className="px-5 pb-5">
          {description && (
            <p className="mb-3 text-xs text-muted">{description}</p>
          )}
          {children}
        </div>
      )}
    </div>
  );
}
