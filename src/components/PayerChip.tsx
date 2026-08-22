import { colorFor } from "@/lib/colors/palette";
import { payerInitials } from "@/helpers/taxonomy";

type Props = {
  name: string;
  color: string | null | undefined;
  className?: string;
};

// Initials on a tinted disc. Deliberately not an icon: lucide has no
// company logos, so an icon picker would leave every employer wearing the
// same briefcase. Initials distinguish "Empresa X" from "Empresa Y" at a
// glance and cost no picker at all.
export default function PayerChip({ name, color, className = "h-9 w-9" }: Props) {
  const palette = colorFor(color);
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full text-xs font-semibold ${palette.chip} ${className}`}
    >
      {payerInitials(name)}
    </span>
  );
}
