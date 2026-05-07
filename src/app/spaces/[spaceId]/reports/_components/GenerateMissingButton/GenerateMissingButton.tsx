"use client";

import { useState, useTransition } from "react";
import {
  generateMissingReports,
  type GenerateMissingResult,
} from "../../actions";

type Props = { spaceId: string };

function summarize(r: GenerateMissingResult): string {
  const parts: string[] = [];
  parts.push(`${r.generated} ${r.generated === 1 ? "report" : "reports"} generated`);
  if (r.skipped > 0) parts.push(`${r.skipped} skipped (no data)`);
  if (r.failed > 0) {
    parts.push(`${r.failed} ${r.failed === 1 ? "failure" : "failures"}`);
  }
  return parts.join(", ") + ".";
}

export default function GenerateMissingButton({ spaceId }: Props) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GenerateMissingResult | null>(null);

  const handleClick = () => {
    setError(null);
    setResult(null);
    startTransition(async () => {
      try {
        const r = await generateMissingReports(spaceId);
        setResult(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to generate reports");
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        {pending ? "Generating..." : "Generate missing reports"}
      </button>
      {error && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      {result && (
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {summarize(result)}
        </p>
      )}
    </div>
  );
}
