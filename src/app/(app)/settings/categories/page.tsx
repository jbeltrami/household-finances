import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPersonalSpaceId } from "@/helpers/spaces";
import { getCategories, getPayers } from "@/helpers/taxonomy";
import { settingsCategoriesUrl, settingsUrl } from "@/helpers/paths";
import CategoryTabPanel from "./_components/CategoryTabPanel/CategoryTabPanel";
import PayerTabPanel from "./_components/PayerTabPanel/PayerTabPanel";
import { TABS, parseTab } from "./_types";

type SearchParams = Promise<{ tab?: string }>;

export default async function CategoriesSettingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const spaceId = await getPersonalSpaceId(supabase);
  if (!spaceId) notFound();

  const { tab: tabRaw } = await searchParams;
  const tab = parseTab(tabRaw);

  // Only the visible tab's rows are fetched. Inactive rows are included so
  // the panel can offer them for reactivation or deletion; it splits the
  // list itself.
  const categories =
    tab === "payers"
      ? []
      : await getCategories(supabase, spaceId, tab, { includeInactive: true });
  const payers =
    tab === "payers"
      ? await getPayers(supabase, spaceId, { includeInactive: true })
      : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 md:px-6 md:py-8">
      <Link href={settingsUrl()} className="text-sm text-muted hover:text-fg">
        ← Voltar para Configurações
      </Link>

      <h1 className="mt-4 text-2xl font-semibold text-fg">Categorias</h1>
      <p className="mt-1 text-sm text-muted">
        Suas listas são só suas — renomeie, troque o ícone e a cor, ou desative
        o que não usa.
      </p>

      {/* Tabs are links, not client state: the tab belongs in the URL so it
          survives a reload and can be linked to directly. */}
      <nav
        aria-label="Listas"
        className="mt-6 flex gap-1 rounded-xl border border-subtle bg-surface p-1"
      >
        {TABS.map((t) => {
          const isActive = t.tab === tab;
          return (
            <Link
              key={t.tab}
              href={`${settingsCategoriesUrl()}?tab=${t.tab}`}
              aria-current={isActive ? "page" : undefined}
              className={
                "flex-1 rounded-lg px-3 py-2 text-center text-sm font-medium transition-colors " +
                (isActive ? "bg-surface-2 text-fg" : "text-muted hover:text-fg")
              }
            >
              {t.label}
            </Link>
          );
        })}
      </nav>

      {tab === "payers" ? (
        <PayerTabPanel payers={payers} />
      ) : (
        <CategoryTabPanel kind={tab} categories={categories} />
      )}
    </div>
  );
}
