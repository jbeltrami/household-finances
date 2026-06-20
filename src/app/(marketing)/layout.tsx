import { Fraunces } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { monthUrl } from "@/helpers/paths";
import MarketingHeader from "./_components/MarketingHeader/MarketingHeader";
import Footer from "./_components/Footer/Footer";

// Editorial display face for the public marketing surface. Scoped to this
// subtree via the CSS variable (see .font-display in globals.css).
const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
});

export default async function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Public pages render signed-in OR signed-out — no redirect here. We only
  // peek at the session so the header CTA can adapt ("Ir para o app" vs
  // "Entrar com o Google").
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const now = new Date();
  const appUrl = monthUrl(now.getFullYear(), now.getMonth() + 1);

  return (
    <div className={`${fraunces.variable} flex min-h-screen flex-col`}>
      <MarketingHeader isAuthed={Boolean(user)} appUrl={appUrl} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
