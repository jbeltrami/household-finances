import { redirect } from "next/navigation";

export default function Home() {
  // Land users on the current month after sign-in. Every month has its
  // own URL under /months/[year]/[month] — this page just bounces.
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  redirect(`/months/${year}/${month}`);
}
