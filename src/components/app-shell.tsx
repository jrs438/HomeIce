"use client";

import { usePathname } from "next/navigation";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { SwRegister } from "./sw-register";

export type CurrentMember = {
  id: string;
  name: string;
  color: string;
  isAdmin: boolean;
} | null;

export function AppShell({
  member,
  children,
}: {
  member: CurrentMember;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const chromeless = pathname?.startsWith("/login");

  if (chromeless) {
    return <main className="flex-1 flex flex-col">{children}</main>;
  }

  return (
    <>
      <SwRegister />
      <Header member={member} />
      <main className="flex-1 flex flex-col pb-20">{children}</main>
      <BottomNav />
    </>
  );
}
