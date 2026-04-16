"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  spaceBillsUrl,
  spaceMonthUrl,
  spaceSavingsUrl,
} from "@/helpers/paths";

// Shape of a single switcher entry. Kept as a named export so the
// server Navbar can type the prop exactly once.
export type NavbarSpace = {
  id: string;
  name: string;
  type: "personal" | "shared";
};

type Props = {
  spaces: NavbarSpace[];
};

// The personal space's DB name is the user's Google display name (set
// by the on_auth_user_created trigger). Showing that in your own
// navbar is odd — "Personal Space" reads better. Shared spaces keep
// their real names since those are how they're meaningfully identified.
function displayLabel(space: NavbarSpace): string {
  return space.type === "personal" ? "Personal Space" : space.name;
}

// Client half of the Navbar. Owns everything that depends on the
// current URL — the space switcher dropdown and the Bills/Savings
// links both need to know which space the user is viewing to render
// correctly. The server Navbar handles auth + data fetching and
// passes the memberships down as a plain prop.
export default function NavbarNav({ spaces }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  // Defensive: an authenticated user always has at least their
  // personal space (created by the on_auth_user_created trigger),
  // so this branch should never fire in practice. Render just the
  // brand if it somehow does — better than crashing the layout.
  if (spaces.length === 0) {
    return (
      <Link
        href="/"
        className="text-lg font-semibold text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300"
      >
        Home Finances
      </Link>
    );
  }

  // Extract the current spaceId from the URL. Every authenticated
  // route lives under /spaces/[id]/... after Piece 8 Step 3, so
  // this match almost always succeeds. The fallback to spaces[0]
  // covers the brief window where `/` is still redirecting and for
  // any future non-space routes we add.
  const match = pathname.match(/^\/spaces\/([^/]+)/);
  const currentSpaceId = match ? match[1] : spaces[0].id;

  const handleSpaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSpaceId = e.target.value;
    if (newSpaceId === currentSpaceId) return;
    // Always land on the target space's current month. Switching
    // cross-route (e.g. from /bills on space A to /bills on space B)
    // would feel nicer in theory but it's a brittle rule once savings
    // fund detail pages, edit pages, etc. enter the picture.
    const now = new Date();
    router.push(
      spaceMonthUrl(newSpaceId, now.getFullYear(), now.getMonth() + 1)
    );
  };

  return (
    <>
      <Link
        href="/"
        className="text-lg font-semibold text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300"
      >
        Home Finances
      </Link>

      {spaces.length === 1 ? (
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {displayLabel(spaces[0])}
        </span>
      ) : (
        <select
          value={currentSpaceId}
          onChange={handleSpaceChange}
          aria-label="Current space"
          className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
        >
          {spaces.map((s) => (
            <option key={s.id} value={s.id}>
              {displayLabel(s)}
            </option>
          ))}
        </select>
      )}

      <Link
        href="/spaces/new"
        className="rounded-md border border-dashed border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800"
      >
        + New
      </Link>

      <Link
        href={spaceBillsUrl(currentSpaceId)}
        className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
      >
        Bills
      </Link>
      <Link
        href={spaceSavingsUrl(currentSpaceId)}
        className="text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100"
      >
        Savings
      </Link>
    </>
  );
}
