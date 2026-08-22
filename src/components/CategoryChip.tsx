import { createElement } from "react";
import { iconFor } from "@/lib/icons/registry";
import { colorFor } from "@/lib/colors/palette";

type Props = {
  icon: string | null | undefined;
  color: string | null | undefined;
  className?: string;
};

// The square, tinted icon badge a Categoria wears everywhere it appears.
// Falls back to the Receipt icon and the neutral palette entry, so a
// Categoria with no icon still renders as a deliberate-looking marker
// rather than an empty box.
export default function CategoryChip({
  icon,
  color,
  className = "h-9 w-9",
}: Props) {
  const palette = colorFor(color);
  return (
    <span
      className={`flex shrink-0 items-center justify-center rounded-lg ${palette.chip} ${className}`}
    >
      {createElement(iconFor(icon), { className: "h-5 w-5", strokeWidth: 2 })}
    </span>
  );
}
