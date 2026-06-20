"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePersonalSpaceId } from "@/helpers/spaces";
import { checkDateEditable } from "@/helpers/lock";
import { parseYearMonthFromYmd, todayYmd } from "@/helpers/date";
import { financingDetailUrl, monthUrl } from "@/helpers/paths";

const UNIQUE_VIOLATION = "23505";

// Marks/unmarks installment N of a financing as paid. Keyed by installment
// number (stable across schedule reshaping). Toggle-style — throws on
// failure; the lock check uses the installment's own date.
export async function toggleInstallmentPaid(
  financingId: string,
  installmentNumber: number,
  date: string,
  newPaid: boolean
) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Não autenticado");

  const spaceId = await requirePersonalSpaceId(supabase);

  const check = await checkDateEditable(supabase, spaceId, date);
  if (!check.ok) throw new Error(check.error);

  if (newPaid) {
    const { error } = await supabase
      .from("financing_installment_payments")
      .insert({
        space_id: spaceId,
        financing_id: financingId,
        installment_number: installmentNumber,
        paid_on: todayYmd(),
      });
    // Already-paid (unique violation) is a no-op, not an error.
    if (error && error.code !== UNIQUE_VIOLATION) {
      throw new Error(`Falha ao marcar a parcela: ${error.message}`);
    }
  } else {
    const { error } = await supabase
      .from("financing_installment_payments")
      .delete()
      .eq("financing_id", financingId)
      .eq("installment_number", installmentNumber);
    if (error) {
      throw new Error(`Falha ao desmarcar a parcela: ${error.message}`);
    }
  }

  const parsed = parseYearMonthFromYmd(date);
  if (parsed) revalidatePath(monthUrl(parsed.year, parsed.month));
  revalidatePath(financingDetailUrl(financingId));
}
