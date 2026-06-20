import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-subtle">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-muted sm:flex-row">
        <p className="font-display text-base text-fg">
          Home <span className="font-semibold italic text-accent">Finances</span>
        </p>
        <nav className="flex items-center gap-6">
          <Link href="/about" className="transition-colors hover:text-fg">
            Sobre
          </Link>
          <Link href="/guide" className="transition-colors hover:text-fg">
            Guia
          </Link>
          <Link href="/login" className="transition-colors hover:text-fg">
            Entrar
          </Link>
        </nav>
        <p className="text-xs text-muted">Planejador de finanças pessoais</p>
      </div>
    </footer>
  );
}
