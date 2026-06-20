"use client";

import { useEffect, useRef, useState } from "react";

// A BRL-masked money input used everywhere the app receives an R$ value.
// Shows an "R$" prefix and formats as you type ("1.234.567,89", cents-based:
// digits fill in from the right). The value it carries is a plain dot-decimal
// string ("1234567.89") so server actions can Number() it unchanged.
//
// Works two ways:
//   - Uncontrolled: pass `name` (+ optional `defaultValue`). It renders a
//     hidden input named `name` carrying the raw value, so plain <form>
//     submissions and formRef.reset() just work (it listens for the form's
//     reset event to clear itself).
//   - Controlled: pass `value` + `onValueChange` (and optionally `name`).

type Props = {
  name?: string;
  id?: string;
  value?: string; // controlled raw value ("" when empty)
  defaultValue?: string; // uncontrolled initial raw value
  onValueChange?: (raw: string) => void;
  placeholder?: string;
  required?: boolean;
  autoFocus?: boolean;
  className?: string; // appended to the visible input
  wrapperClassName?: string;
};

function formatBrl(raw: string): string {
  if (raw === "") return "";
  const n = Number(raw);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// Strip everything but digits and read them as cents → dot-decimal string.
function digitsToRaw(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits === "") return "";
  return (Number(digits) / 100).toFixed(2);
}

export default function CurrencyInput({
  name,
  id,
  value,
  defaultValue = "",
  onValueChange,
  placeholder = "0,00",
  required,
  autoFocus,
  className = "",
  wrapperClassName = "relative",
}: Props) {
  const isControlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue);
  const raw = isControlled ? value : internal;

  const inputRef = useRef<HTMLInputElement>(null);

  // Clear back to the default when the surrounding form is reset (e.g. a
  // create form calling formRef.reset() after a successful submit). The
  // visible input is React-controlled, so a native reset alone wouldn't
  // clear it.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const onReset = () => {
      if (!isControlled) setInternal(defaultValue);
      onValueChange?.(defaultValue);
    };
    form.addEventListener("reset", onReset);
    return () => form.removeEventListener("reset", onReset);
  }, [defaultValue, isControlled, onValueChange]);

  const handleChange = (input: string) => {
    const next = digitsToRaw(input);
    if (!isControlled) setInternal(next);
    onValueChange?.(next);
  };

  return (
    <div className={wrapperClassName}>
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
        R$
      </span>
      <input
        ref={inputRef}
        id={id}
        type="text"
        inputMode="numeric"
        required={required}
        autoFocus={autoFocus}
        value={formatBrl(raw)}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        className={`field-input pl-9 text-right font-mono tabular-nums ${className}`}
      />
      {name && <input type="hidden" name={name} value={raw} />}
    </div>
  );
}
