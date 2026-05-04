"use client";
import { use, useState } from "react";
import type { Route } from "next";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { useVault } from "@/hooks/vaults/useVault";
import { VaultShareModal } from "@/sections/vault/VaultShareModal";
import { VaultDeleteConfirm } from "@/sections/vault/VaultDeleteConfirm";

export interface VaultLayoutProps {
  children: React.ReactNode;
  params: Promise<{ vaultId: string }>;
}

export default function VaultLayout({ children, params }: VaultLayoutProps) {
  const tTabs = useTranslations("vault.tabs");
  const t = useTranslations("vault");
  const router = useRouter();
  const pathname = usePathname();
  const { vaultId } = use(params);
  const { data: vault } = useVault(vaultId);
  const [showShare, setShowShare] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const tabs = [
    { key: "chat", path: `/app/vaults/${vaultId}/chat`, label: tTabs("chat") },
    { key: "docs", path: `/app/vaults/${vaultId}/docs`, label: tTabs("docs") },
    { key: "kg", path: `/app/vaults/${vaultId}/kg`, label: tTabs("kg") },
  ];

  return (
    <div className="flex flex-col h-full">
      <header className="px-4 py-3 border-b">
        <h1 className="text-lg font-semibold">{vault?.display_name ?? "…"}</h1>
        {vault?.effective_role === "owner" && (
          <div className="flex gap-2 mt-1 text-sm">
            <button onClick={() => setShowShare(true)}>{t("share.title")}</button>
            <button onClick={() => setShowDelete(true)} className="text-destructive">
              {t("delete.confirmTitle")}
            </button>
          </div>
        )}
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
      {showShare && (
        <VaultShareModal vaultId={vaultId} onClose={() => setShowShare(false)} />
      )}
      {showDelete && vault && (
        <VaultDeleteConfirm
          vaultId={vaultId}
          vaultName={vault.display_name}
          onClose={() => setShowDelete(false)}
        />
      )}
    </div>
  );
}
