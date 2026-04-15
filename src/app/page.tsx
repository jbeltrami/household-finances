import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { spaceMonthUrl } from "@/helpers/paths";
import { getPersonalSpaceId } from "@/helpers/spaces";

// Temporary behaviour: bounce users to their personal space's current
// month. Piece 8 Step 9 replaces this with a real dashboard that shows
// a card per space the user belongs to, including shared ones.
export default async function Home() {
  const supabase = await createClient();
  const personalSpaceId = await getPersonalSpaceId(supabase);

  if (!personalSpaceId) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-red-600 dark:text-red-400">
          No personal space found. This should have been created
          automatically on signup — contact support.
        </p>
      </div>
    );
  }

  const now = new Date();
  redirect(
    spaceMonthUrl(personalSpaceId, now.getFullYear(), now.getMonth() + 1)
  );
}
