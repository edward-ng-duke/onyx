"use client";
import { use } from "react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useVault } from "@/hooks/vaults/useVault";

export interface VaultLayoutProps {
  children: React.ReactNode;
  params: Promise<{ vaultId: string }>;
}

export default function VaultLayout({ children, params }: VaultLayoutProps) {
  const t = useTranslations("vault.tabs");
  const router = useRouter();
  const pathname = usePathname();
  const { vaultId } = use(params);
  const { data: vault } = useVault(vaultId);

  const tabs = [
    { key: "chat", path: `/app/vaults/${vaultId}/chat`, label: t("chat") },
    { key: "docs", path: `/app/vaults/${vaultId}/docs`, label: t("docs") },
    { key: "kg", path: `/app/vaults/${vaultId}/kg`, label: t("kg") },
  ];

  return (
    <div className="flex flex-col h-full">
      <header className="px-4 py-3 border-b">
        <h1 className="text-lg font-semibold">{vault?.display_name ?? "…"}</h1>
        <nav className="flex gap-3 mt-2 text-sm">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => router.push(tab.path as Route)}
              className={
                pathname.startsWith(tab.path) ? "font-semibold" : "opacity-70"
              }
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
