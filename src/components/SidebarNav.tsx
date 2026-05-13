"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  FileBarChart,
  Menu,
  Receipt,
  Settings,
  X,
} from "lucide-react";
import { billsUrl, reportsUrl, settingsUrl } from "@/helpers/paths";
import SignOutButton from "./SignOutButton";

type Props = {
  displayName: string;
  avatarUrl?: string;
  initials: string;
  defaultCollapsed: boolean;
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
    // Bills section + edit pages, plus the monthly view (the app's
    // home) lights up this item.
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

// Persist the collapsed preference in a long-lived cookie so the
// server-side Sidebar reads it on the next render — no flash of
// mismatched UI when navigating between pages.
function writeCollapsedCookie(collapsed: boolean) {
  document.cookie = `sidebar_collapsed=${collapsed ? "1" : "0"}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
}

export default function SidebarNav({
  displayName,
  avatarUrl,
  initials,
  defaultCollapsed,
}: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);                       // mobile drawer
  const [collapsed, setCollapsed] = useState(defaultCollapsed);  // desktop rail

  const close = () => setOpen(false);
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      writeCollapsedCookie(next);
      return next;
    });
  };

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

      {/* Sidebar — drawer on mobile, sticky rail on md+.
          On mobile the drawer is always w-64 (full width). On md+
          width follows the `collapsed` preference. */}
      <aside
        className={
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-subtle bg-surface px-5 py-6 transition-[width,padding] duration-200 md:sticky md:top-0 md:h-screen md:translate-x-0 " +
          (open ? "translate-x-0" : "-translate-x-full ") +
          (collapsed ? "md:w-16 md:px-2" : "md:w-64 md:px-5")
        }
      >
        {/* Top section: brand (when expanded) + desktop collapse toggle + mobile close.
            When collapsed on desktop, only the toggle is shown, centered. */}
        <div
          className={
            "mb-8 flex items-center " +
            (collapsed ? "md:justify-center" : "justify-between")
          }
        >
          {/* Brand: hidden on md+ when collapsed; always visible on mobile drawer */}
          <Link
            href="/"
            onClick={close}
            className={
              "text-2xl font-light text-fg " + (collapsed ? "md:hidden" : "")
            }
          >
            Home <span className="font-bold">Finances</span>
          </Link>

          {/* Desktop collapse/expand toggle */}
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label={collapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
            data-tooltip={collapsed ? "Expandir" : "Recolher"}
            className="hidden h-8 w-8 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-2 hover:text-fg md:flex"
          >
            {collapsed ? (
              <ChevronRight className="h-5 w-5" strokeWidth={2} />
            ) : (
              <ChevronLeft className="h-5 w-5" strokeWidth={2} />
            )}
          </button>

          {/* Mobile close button — only visible while the drawer is open on mobile */}
          <button
            type="button"
            aria-label="Fechar menu"
            onClick={close}
            className="flex h-8 w-8 items-center justify-center rounded-md text-fg hover:bg-surface-2 md:hidden"
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
                aria-label={collapsed ? item.label : undefined}
                data-tooltip={collapsed ? item.label : undefined}
                className={
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors " +
                  (collapsed ? "md:justify-center md:px-2" : "") +
                  " " +
                  (active
                    ? "bg-surface-2 text-fg"
                    : "text-muted hover:bg-surface-2 hover:text-fg")
                }
              >
                <Icon className="h-5 w-5 shrink-0" strokeWidth={1.75} />
                {/* Label is always rendered (so mobile drawer shows it), but hidden on md+ when collapsed */}
                <span className={collapsed ? "md:hidden" : ""}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User block pinned to the bottom */}
        <div
          className={
            "mt-6 flex border-t border-subtle pt-5 " +
            (collapsed
              ? "md:flex-col md:items-center md:gap-2 flex-col gap-3"
              : "flex-col gap-3")
          }
        >
          <div
            className={
              "flex items-center gap-3 " +
              (collapsed ? "md:justify-center md:gap-0" : "")
            }
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt={initials}
                width={36}
                height={36}
                className="rounded-full"
                data-tooltip={collapsed ? displayName : undefined}
              />
            ) : (
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-sm font-medium text-fg"
                data-tooltip={collapsed ? displayName : undefined}
              >
                {initials}
              </div>
            )}
            <span
              className={
                "truncate text-sm font-medium text-fg " +
                (collapsed ? "md:hidden" : "")
              }
            >
              {displayName}
            </span>
          </div>

          {/* Full sign-out button: always visible on mobile drawer; on md+ only
              when expanded. The compact (icon-only) sign-out renders separately
              below for md+ collapsed view. */}
          <div className={collapsed ? "md:hidden" : ""}>
            <SignOutButton compact={false} />
          </div>
          {collapsed && (
            <div className="hidden md:block">
              <SignOutButton compact />
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
