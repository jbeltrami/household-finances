import Link from "next/link";
import { insightsUrl } from "@/helpers/paths";
import { WINDOW_OPTIONS } from "@/helpers/insights";

type Props = {
  selected: number;
};

// Tabs to pick the averaging window. Pure links — the page re-renders
// server-side with fresh averages from the `?window=` param, so there's
// no client state to lift (keeps state where it's used: the URL).
export default function WindowSelector({ selected }: Props) {
  return (
    <div className="inline-flex rounded-lg border border-subtle bg-surface p-1">
      {WINDOW_OPTIONS.map((months) => {
        const active = months === selected;
        return (
          <Link
            key={months}
            href={`${insightsUrl()}?window=${months}`}
            aria-current={active ? "page" : undefined}
            className={
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors " +
              (active
                ? "bg-surface-2 text-fg"
                : "text-muted hover:text-fg")
            }
          >
            {months} meses
          </Link>
        );
      })}
    </div>
  );
}
