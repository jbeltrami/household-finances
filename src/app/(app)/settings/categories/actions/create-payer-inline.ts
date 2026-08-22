"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePersonalSpaceId } from "@/helpers/spaces";
import { settingsCategoriesUrl } from "@/helpers/paths";
import type { PayerRow } from "@/helpers/taxonomy";
import { UNIQUE_VIOLATION } from "./_helpers";

export type CreatePayerResult = {
  error: string | null;
  payer: PayerRow | null;
};

// Creates a Pagador and hands the row back, so a form that is mid-edit can
// add it to its own list and select it without navigating away.
//
// `createPayer` (the management-screen version) returns only FormState,
// because a <form action> has nowhere to put a returned row. Rather than
// widen that one and make every caller destructure something it ignores,
// this is its own action — same insert, different return shape.
//
// Reactivates rather than duplicating: the partial unique index only covers
// active rows, so a name freed by deactivation is insertable again, and
// silently creating a second "Empresa X" would be worse than reviving the
// first.
export async function createPayerInline(
  name: string
): Promise<CreatePayerResult> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado", payer: null };

    const trimmed = name.trim();
    if (!trimmed) return { error: "O nome é obrigatório", payer: null };
    if (trimmed.length < 2) {
      return { error: "O nome precisa ter pelo menos 2 caracteres", payer: null };
    }

    const spaceId = await requirePersonalSpaceId(supabase);

    const { data: existing } = await supabase
      .from("payers")
      .select("id, name, color, active")
      .eq("space_id", spaceId)
      .ilike("name", trimmed)
      .maybeSingle();

    if (existing) {
      if (!existing.active) {
        const { error } = await supabase
          .from("payers")
          .update({ active: true })
          .eq("id", existing.id);
        if (error) {
          return { error: `Falha ao reativar o pagador: ${error.message}`, payer: null };
        }
      }
      revalidatePath(settingsCategoriesUrl());
      return {
        error: null,
        payer: { ...(existing as PayerRow), active: true },
      };
    }

    const id = crypto.randomUUID();
    const { error } = await supabase
      .from("payers")
      .insert({ id, space_id: spaceId, name: trimmed });

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return { error: `Já existe um pagador chamado "${trimmed}"`, payer: null };
      }
      return { error: `Falha ao criar o pagador: ${error.message}`, payer: null };
    }

    revalidatePath(settingsCategoriesUrl());
    return {
      error: null,
      payer: { id, name: trimmed, color: "slate", active: true },
    };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Algo deu errado",
      payer: null,
    };
  }
}
