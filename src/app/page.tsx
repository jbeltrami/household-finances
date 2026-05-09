import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPersonalSpaceId } from "@/helpers/spaces";
import { spaceMonthUrl } from "@/helpers/paths";

// With one space per user, a "list of spaces" landing page is
// noise — send the user straight to their current month.
export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const spaceId = await getPersonalSpaceId(supabase);
  if (!spaceId) {
    // Trigger should have created a personal space at signup. If it
    // didn't, fall back to login rather than render a broken page.
    redirect("/login");
  }

  const now = new Date();
  redirect(spaceMonthUrl(spaceId, now.getFullYear(), now.getMonth() + 1));
}
