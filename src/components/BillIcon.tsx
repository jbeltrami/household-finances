import { createElement } from "react";
import { iconFor } from "@/lib/icons/registry";

type Props = {
  iconKey: string | null | undefined;
  className?: string;
  strokeWidth?: number;
};

// Resolves an icon key from `recurring_bill_templates.icon` to the
// matching lucide component. Falls back to a Receipt icon when the
// key is null or not in the registry.
//
// `createElement` is used (rather than `<Icon />`) so React's
// static-components rule doesn't flag this as "component created
// during render" — the lookup returns a stable, module-scoped
// component.
export default function BillIcon({
  iconKey,
  className = "h-4 w-4",
  strokeWidth = 2,
}: Props) {
  return createElement(iconFor(iconKey), { className, strokeWidth });
}
