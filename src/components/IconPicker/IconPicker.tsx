"use client";

import { createElement, useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Receipt } from "lucide-react";
import { getIconList, iconFor } from "@/lib/icons/registry";

type Props = {
  name?: string;
  defaultValue?: string | null;
};

// Flat icon picker: one grid, no group headings.
//
// The older grouped picker headed each block with a compiled-in category
// name ("Moradia", "Lazer"). Now that Categorias are user-managed those
// headings are just stale strings — they would tell a user "Moradia"
// while their own list says "Casa". A flat grid with per-icon tooltips
// says less and lies never.
export default function IconPicker({
  name = "icon",
  defaultValue = null,
}: Props) {
  const [selected, setSelected] = useState<string | null>(defaultValue);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  // Clear when the surrounding form resets, so a parent calling
  // form.reset() after a successful submit empties this too. Same
  // contract CurrencyInput honours.
  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const onReset = () => setSelected(defaultValue);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaultValue]);

  const icons = getIconList();
  const selectedIconComponent = selected ? iconFor(selected) : Receipt;

  const handlePick = (key: string | null) => {
    setSelected(key);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative">
      <input type="hidden" name={name} value={selected ?? ""} />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="mt-1 flex w-full items-center justify-between rounded-lg border border-subtle bg-canvas px-3 py-2 text-sm text-fg focus:border-accent focus:outline-none"
      >
        <span className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-surface-2 text-fg">
            {createElement(selectedIconComponent, {
              className: "h-4 w-4",
              strokeWidth: 2,
            })}
          </span>
          <span className={selected ? "text-fg" : "text-muted"}>
            {selected ? "Ícone selecionado" : "Escolher ícone"}
          </span>
        </span>
        <ChevronDown
          className={
            "h-4 w-4 text-muted transition-transform " +
            (open ? "rotate-180" : "")
          }
          strokeWidth={2}
        />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Escolher ícone"
          className="absolute left-0 right-0 z-30 mt-2 max-h-80 overflow-y-auto rounded-xl border border-subtle bg-surface p-3 shadow-lg"
        >
          <button
            type="button"
            onClick={() => handlePick(null)}
            className={
              "flex w-full items-center justify-between rounded-lg px-2 py-2 text-sm hover:bg-surface-2 " +
              (selected === null ? "text-fg" : "text-muted")
            }
          >
            <span>Sem ícone</span>
            {selected === null && (
              <Check className="h-4 w-4 text-accent" strokeWidth={2} />
            )}
          </button>

          <div className="mt-2 grid grid-cols-6 gap-1">
            {icons.map((item) => {
              const isActive = selected === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handlePick(item.key)}
                  aria-pressed={isActive}
                  aria-label={item.label}
                  data-tooltip={item.label}
                  className={
                    "flex h-10 w-full items-center justify-center rounded-lg transition-colors " +
                    (isActive
                      ? "bg-accent-soft text-accent"
                      : "text-muted hover:bg-surface-2 hover:text-fg")
                  }
                >
                  {createElement(item.Icon, {
                    className: "h-5 w-5",
                    strokeWidth: 2,
                  })}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
