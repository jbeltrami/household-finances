"use client";

import { useEffect, useRef, useState } from "react";
import { Check } from "lucide-react";
import { DEFAULT_CATEGORY_COLOR, getColorOptions } from "@/lib/colors/palette";

type Props = {
  name?: string;
  defaultValue?: string | null;
};

// A row of swatches rather than a native colour input. The palette is
// fixed so contrast and dark-mode behaviour stay under our control, and
// so a Categoria keeps the same colour every time a report renders it.
export default function ColorPicker({
  name = "color",
  defaultValue = null,
}: Props) {
  const [selected, setSelected] = useState<string>(
    defaultValue ?? DEFAULT_CATEGORY_COLOR
  );
  const options = getColorOptions();
  const rootRef = useRef<HTMLDivElement>(null);

  // Clear when the surrounding form resets. Same contract as the icon
  // picker and CurrencyInput.
  useEffect(() => {
    const form = rootRef.current?.closest("form");
    if (!form) return;
    const onReset = () =>
      setSelected(defaultValue ?? DEFAULT_CATEGORY_COLOR);
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaultValue]);

  return (
    <div ref={rootRef}>
      <input type="hidden" name={name} value={selected} />
      <div className="mt-1 flex flex-wrap gap-2" role="group" aria-label="Cor">
        {options.map((option) => {
          const isActive = selected === option.key;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => setSelected(option.key)}
              aria-pressed={isActive}
              aria-label={option.label}
              data-tooltip={option.label}
              className={
                "flex h-7 w-7 items-center justify-center rounded-full transition-transform " +
                option.swatch +
                (isActive ? " ring-2 ring-fg ring-offset-2 ring-offset-surface" : " hover:scale-110")
              }
            >
              {isActive && (
                <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
