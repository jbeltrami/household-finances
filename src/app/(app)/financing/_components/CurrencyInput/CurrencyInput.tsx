"use client";

// A BRL-masked text input. Shows an "R$" prefix and formats the number as
// "1.234.567,89" as you type (cents-based: digits fill in from the right).
// The value it reports up is a plain dot-decimal string ("1234567.89") so
// callers can Number() it and submit it unchanged.

type Props = {
  id?: string;
  value: string; // raw dot-decimal string, "" when empty
  onChange: (raw: string) => void;
  placeholder?: string;
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
  id,
  value,
  onChange,
  placeholder,
}: Props) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
        R$
      </span>
      <input
        id={id}
        type="text"
        inputMode="numeric"
        value={formatBrl(value)}
        onChange={(e) => onChange(digitsToRaw(e.target.value))}
        placeholder={placeholder}
        className="field-input pl-9 text-right font-mono tabular-nums"
      />
    </div>
  );
}
