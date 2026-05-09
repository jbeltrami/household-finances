"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  spaceBillsUrl,
  spaceReportsUrl,
  spaceSettingsUrl,
} from "@/helpers/paths";
import SignOutButton from "./SignOutButton";

type Props = {
  spaceId: string;
  spaceName: string;
  avatarUrl?: string;
  initials: string;
};

// Client half of the Navbar. Each user has exactly one space, so
// there's no switcher — just the per-space links and the mobile
// hamburger menu state.
export default function NavbarNav({
  spaceId,
  avatarUrl,
  initials,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

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
        <div className="hidden items-center gap-6 md:flex">
          <Link href={spaceBillsUrl(spaceId)} className={linkClass}>
            Bills
          </Link>
          <Link href={spaceReportsUrl(spaceId)} className={linkClass}>
            Reports
          </Link>
          <Link href={spaceSettingsUrl(spaceId)} className={linkClass}>
            Settings
          </Link>
        </div>

        {/* Right: sign out + avatar */}
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
      {menuOpen && (
        <div className="border-t border-gray-200 bg-white px-4 pb-4 pt-3 dark:border-gray-800 dark:bg-gray-900 md:hidden">
          <div className="flex flex-col gap-2">
            <Link
              href={spaceBillsUrl(spaceId)}
              onClick={closeMenu}
              className="rounded-md px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Bills
            </Link>
            <Link
              href={spaceReportsUrl(spaceId)}
              onClick={closeMenu}
              className="rounded-md px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Reports
            </Link>
            <Link
              href={spaceSettingsUrl(spaceId)}
              onClick={closeMenu}
              className="rounded-md px-2 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Settings
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
