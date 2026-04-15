import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { spaceBillsUrl, spaceSavingsUrl } from "@/helpers/paths";
import { getPersonalSpaceId } from "@/helpers/spaces";
import SignOutButton from "./SignOutButton";

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The middleware redirects unauthenticated users to /login before any page
  // renders, so if there's no user we don't render the navbar at all.
  if (!user) return null;

  // Bills and Savings both live under /spaces/[spaceId]/... now, so we
  // need a space to link to. For Piece 8 Step 3 we default every user to
  // their own personal space. Step 4 replaces this with a space switcher
  // dropdown once shared spaces actually exist.
  const personalSpaceId = await getPersonalSpaceId(supabase);

  const fullName = user.user_metadata?.full_name as string | undefined;
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const displayName = fullName ?? user.email ?? "User";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className="text-lg font-semibold text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300"
          >
            Home Finances
          </Link>
          {personalSpaceId && (
            <>
              <Link
                href={spaceBillsUrl(personalSpaceId)}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
              >
                Bills
              </Link>
              <Link
                href={spaceSavingsUrl(personalSpaceId)}
                className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
              >
                Savings
              </Link>
            </>
          )}
        </div>

        <div className="flex items-center gap-3">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={32}
              height={32}
              className="rounded-full"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
              {initial}
            </div>
          )}
          <span className="text-sm text-gray-700 dark:text-gray-300">
            {displayName}
          </span>
          <SignOutButton />
        </div>
      </div>
    </nav>
  );
}
