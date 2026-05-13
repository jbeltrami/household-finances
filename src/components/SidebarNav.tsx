"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, Receipt, FileBarChart, Settings, X } from "lucide-react";
import { billsUrl, reportsUrl, settingsUrl } from "@/helpers/paths";
import SignOutButton from "./SignOutButton";

type Props = {
  displayName: string;
  avatarUrl?: string;
  initials: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  matches: (pathname: string) => boolean;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: billsUrl(),
    label: "Contas",
    icon: Receipt,
    // The bills section starts on /bills and includes its edit pages,
    // but we also want the monthly view (the user's "home") to light
    // up this item, since Contas is conceptually the home of the app.
    matches: (p) =>
      p === "/" || p.startsWith("/bills") || p.startsWith("/months"),
  },
  {
    href: reportsUrl(),
    label: "Relatórios",
    icon: FileBarChart,
    matches: (p) => p.startsWith("/reports"),
  },
  {
    href: settingsUrl(),
    label: "Configurações",
    icon: Settings,
    matches: (p) => p.startsWith("/settings"),
  },
];

export default function SidebarNav({ displayName, avatarUrl, initials }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <>
      {/* Mobile header bar — hamburger + brand. Hidden on md+. */}
      <header className="flex items-center justify-between border-b border-subtle bg-surface px-4 py-3 md:hidden">
        <button
          type="button"
          aria-label="Abrir menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
          className="rounded-md p-1.5 text-fg hover:bg-surface-2"
        >
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/" className="text-lg font-light text-fg">
          Home <span className="font-bold">Finances</span>
        </Link>
        <div className="w-9" />
      </header>

      {/* Mobile drawer overlay */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Sidebar — fixed drawer on mobile when open, sticky column on md+ */}
      <aside
        className={
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-subtle bg-surface px-5 py-6 transition-transform duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 " +
          (open ? "translate-x-0" : "-translate-x-full")
        }
      >
        {/* Brand + mobile close button */}
        <div className="mb-8 flex items-center justify-between">
          <Link
            href="/"
            onClick={close}
            className="text-2xl font-light text-fg"
          >
            Home <span className="font-bold">Finances</span>
          </Link>
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={close}
            className="rounded-md p-1.5 text-fg hover:bg-surface-2 md:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex flex-1 flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const active = item.matches(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                aria-current={active ? "page" : undefined}
                className={
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors " +
                  (active
                    ? "bg-surface-2 text-fg"
                    : "text-muted hover:bg-surface-2 hover:text-fg")
                }
              >
                <Icon className="h-5 w-5" strokeWidth={1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User block pinned to the bottom */}
        <div className="mt-6 flex flex-col gap-3 border-t border-subtle pt-5">
          <div className="flex items-center gap-3">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={initials}
                width={36}
                height={36}
                className="rounded-full"
              />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-sm font-medium text-fg">
                {initials}
              </div>
            )}
            <span className="truncate text-sm font-medium text-fg">
              {displayName}
            </span>
          </div>
          <SignOutButton />
        </div>
      </aside>
    </>
  );
}
