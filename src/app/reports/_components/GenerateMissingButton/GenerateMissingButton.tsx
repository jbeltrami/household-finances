"use client";

import { useState, useTransition } from "react";
import {
  generateMissingReports,
  type GenerateMissingResult,
} from "../../actions";

type Props = { spaceId: string };

function summarize(r: GenerateMissingResult): string {
  const parts: string[] = [];
  parts.push(
    `${r.generated} ${r.generated === 1 ? "relatório gerado" : "relatórios gerados"}`
  );
  if (r.skipped > 0) parts.push(`${r.skipped} ignorado(s) (sem dados)`);
  if (r.failed > 0) {
    parts.push(`${r.failed} ${r.failed === 1 ? "falha" : "falhas"}`);
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
        setError(e instanceof Error ? e.message : "Falha ao gerar relatórios");
      }
    });
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="rounded-lg border border-subtle bg-surface px-4 py-2 text-sm font-medium text-fg transition-colors hover:bg-surface-2 disabled:opacity-50"
      >
        {pending ? "Gerando…" : "Gerar relatórios pendentes"}
      </button>
      {error && (
        <p className="mt-2 text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      {result && <p className="mt-2 text-sm text-muted">{summarize(result)}</p>}
    </div>
  );
}
