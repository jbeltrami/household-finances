import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { financingUrl } from "@/helpers/paths";
import { createClient } from "@/lib/supabase/server";
import { getPersonalSpaceId } from "@/helpers/spaces";
import { getCategories } from "@/helpers/taxonomy";
import NewFinancingForm from "../_components/NewFinancingForm/NewFinancingForm";

export default async function NewFinancingPage() {
  const supabase = await createClient();
  const spaceId = await getPersonalSpaceId(supabase);
  if (!spaceId) notFound();

  const categories = await getCategories(supabase, spaceId, "outflow");

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <Link
        href={financingUrl()}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
        Financiamentos
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-fg">Novo financiamento</h1>
      <p className="mt-1 text-sm text-muted">
        Preencha os dados para simular a tabela de amortização. Quando estiver
        certo, salve para acompanhá-lo mês a mês.
      </p>

      <div className="mt-6">
        <NewFinancingForm categories={categories} />
      </div>
    </div>
  );
}
