import Sidebar from "@/components/Sidebar";

// Authenticated app shell: the sidebar rail + the page content. The proxy
// (src/proxy.ts) guarantees a session before any route in this group renders,
// so the Sidebar can safely resolve the user/space server-side.
export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="md:flex">
      <Sidebar />
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
