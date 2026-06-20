"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";

type Props = {
  isAuthed: boolean;
  appUrl: string;
};

const NAV_LINKS = [
  { href: "/", label: "Início" },
  { href: "/about", label: "Sobre" },
  { href: "/guide", label: "Guia" },
];

export default function MarketingHeader({ isAuthed, appUrl }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const ctaHref = isAuthed ? appUrl : "/login";
  const ctaLabel = isAuthed ? "Ir para o app" : "Entrar com o Google";

  return (
    <header className="sticky top-0 z-40 border-b border-subtle/80 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link
          href="/"
          className="font-display text-xl text-fg"
          onClick={() => setOpen(false)}
        >
          Home <span className="font-semibold italic text-accent">Finances</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = link.href === pathname;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors " +
                  (active
                    ? "text-fg"
                    : "text-muted hover:text-fg")
                }
              >
                {link.label}
              </Link>
            );
          })}
          <Link
            href={ctaHref}
            className="ml-2 inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4" strokeWidth={2} />
          </Link>
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-1.5 text-fg hover:bg-surface-2 md:hidden"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile menu panel */}
      {open && (
        <nav className="border-t border-subtle bg-canvas px-6 py-4 md:hidden">
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => {
              const active = link.href === pathname;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={
                    "rounded-lg px-3 py-2.5 text-sm font-medium transition-colors " +
                    (active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg")
                  }
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href={ctaHref}
              onClick={() => setOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4" strokeWidth={2} />
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
