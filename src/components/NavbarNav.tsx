"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  spaceBillsUrl,
  spaceMonthUrl,
  spaceReportsUrl,
  spaceSavingsUrl,
  spaceSettingsUrl,
} from "@/helpers/paths";
import SignOutButton from "./SignOutButton";

// Shape of a single switcher entry. Kept as a named export so the
// server Navbar can type the prop exactly once.
export type NavbarSpace = {
  id: string;
  name: string;
  type: "personal" | "shared";
};

type Props = {
  spaces: NavbarSpace[];
  avatarUrl?: string;
  initials: string;
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
// correctly. Also owns the mobile hamburger menu state.
export default function NavbarNav({ spaces, avatarUrl, initials }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Extract the current spaceId from the URL.
  const match = pathname.match(/^\/spaces\/([^/]+)/);
  const currentSpaceId =
    match?.[1] ?? (spaces.length > 0 ? spaces[0].id : undefined);
  const currentSpace = spaces.find((s) => s.id === currentSpaceId);

  const handleSpaceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSpaceId = e.target.value;
    if (newSpaceId === currentSpaceId) return;
    const now = new Date();
    router.push(
      spaceMonthUrl(newSpaceId, now.getFullYear(), now.getMonth() + 1)
    );
    setMenuOpen(false);
  };

  const closeMenu = () => setMenuOpen(false);

  // Shared link styling
  const linkClass =
    "text-sm font-medium text-gray-700 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-100";

  return (
    <nav className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* Left: hamburger (mobile) + brand */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 md:hidden"
          >
            {menuOpen ? (
              // X icon
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              // Hamburger icon
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
                />
              </svg>
            )}
          </button>

          <Link
            href="/"
            onClick={closeMenu}
            className="text-lg font-semibold text-gray-900 hover:text-gray-700 dark:text-gray-100 dark:hover:text-gray-300"
          >
            Home Finances
          </Link>
        </div>

        {/* Center: desktop nav links (hidden on mobile) */}
        {spaces.length > 0 && currentSpaceId && (
          <div className="hidden items-center gap-6 md:flex">
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

            <Link href="/spaces/new" className="rounded-md border border-dashed border-gray-300 px-2 py-1 text-xs font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800">
              + New
            </Link>

            <Link href={spaceBillsUrl(currentSpaceId)} className={linkClass}>
              Bills
            </Link>
            <Link href={spaceSavingsUrl(currentSpaceId)} className={linkClass}>
              Savings
            </Link>
            {currentSpace?.type === "personal" && (
              <Link
                href={spaceReportsUrl(currentSpaceId)}
                className={linkClass}
              >
                Reports
              </Link>
            )}
            {currentSpace?.type === "shared" && (
              <Link
                href={spaceSettingsUrl(currentSpaceId)}
                className={linkClass}
              >
                Settings
              </Link>
            )}
          </div>
        )}

        {/* Right: sign out + avatar (swapped per user request) */}
        <div className="flex items-center gap-3">
          <SignOutButton />
          <Link href="/" onClick={closeMenu}>
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={initials}
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-700 dark:bg-gray-700 dark:text-gray-200">
                {initials}
              </div>
            )}
          </Link>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && spaces.length > 0 && currentSpaceId && (
        <div className="border-t border-gray-200 bg-white px-4 pb-4 pt-3 dark:border-gray-800 dark:bg-gray-900 md:hidden">
          <div className="flex flex-col gap-3">
            {spaces.length === 1 ? (
              <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                {displayLabel(spaces[0])}
              </span>
            ) : (
              <select
                value={currentSpaceId}
                onChange={handleSpaceChange}
                aria-label="Current space"
                className="rounded-md border border-gray-300 bg-white px-2 py-2 text-sm font-medium text-gray-700 focus:border-gray-500 focus:outline-none dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
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
              onClick={closeMenu}
              className="rounded-md border border-dashed border-gray-300 px-2 py-2 text-center text-xs font-medium text-gray-600 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:bg-gray-800"
            >
              + New shared space
            </Link>

            <div className="border-t border-gray-100 pt-3 dark:border-gray-800">
              <div className="flex flex-col gap-2">
                <Link
                  href={spaceBillsUrl(currentSpaceId)}
                  onClick={closeMenu}
                  className="rounded-md px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Bills
                </Link>
                <Link
                  href={spaceSavingsUrl(currentSpaceId)}
                  onClick={closeMenu}
                  className="rounded-md px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Savings
                </Link>
                {currentSpace?.type === "personal" && (
                  <Link
                    href={spaceReportsUrl(currentSpaceId)}
                    onClick={closeMenu}
                    className="rounded-md px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Reports
                  </Link>
                )}
                {currentSpace?.type === "shared" && (
                  <Link
                    href={spaceSettingsUrl(currentSpaceId)}
                    onClick={closeMenu}
                    className="rounded-md px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    Settings
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
