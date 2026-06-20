"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requirePersonalSpaceId } from "@/helpers/spaces";
import { parseYearMonthFromYmd } from "@/helpers/date";
import { financingDetailUrl, monthUrl } from "@/helpers/paths";

const UNIQUE_VIOLATION = "23505";

// Marks/unmarks a financing installment paid from the financing detail page.
//
// Unlike toggleInstallmentPaid (used in the monthly view), this does NOT gate
// on the month lock: the detail page is the financing admin surface and this
// is how you backfill history for a financing that started in the past, whose
// months are already locked. `date` is the installment's scheduled date and
// is stored as paid_on.
export async function setInstallmentPaid(
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

  if (newPaid) {
    const { error } = await supabase
      .from("financing_installment_payments")
      .insert({
        space_id: spaceId,
        financing_id: financingId,
        installment_number: installmentNumber,
        paid_on: date,
      });
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

  revalidatePath(financingDetailUrl(financingId));
  const parsed = parseYearMonthFromYmd(date);
  if (parsed) revalidatePath(monthUrl(parsed.year, parsed.month));
}
