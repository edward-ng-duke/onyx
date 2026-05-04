"use client";
import Link from "next/link";
import type { Route } from "next";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { useVaultList, type VaultBrief } from "@/hooks/vaults/useVaultList";
import { createVault } from "@/hooks/vaults/useCreateVault";

interface VaultCardProps {
  v: VaultBrief;
}

function VaultCard({ v }: VaultCardProps) {
  const t = useTranslations("vault.list");
  return (
    <Link
      href={`/app/vaults/${v.id}` as Route}
      className="block p-4 border rounded hover:bg-muted"
    >
      <div className="font-semibold">{v.display_name}</div>
      <div className="text-xs opacity-70">
        {t("documentCount", { count: v.document_count })}
      </div>
    </Link>
  );
}

interface SectionProps {
  title: string;
  vaults: VaultBrief[];
  empty?: string;
}

function Section({ title, vaults, empty }: SectionProps) {
  return (
    <section>
      <h2 className="text-sm font-medium opacity-70 mb-2">{title}</h2>
      {vaults.length === 0 && empty ? (
        <div className="text-sm opacity-50">{empty}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {vaults.map((v) => (
            <VaultCard key={v.id} v={v} />
          ))}
        </div>
      )}
    </section>
  );
}

interface CreateDialogProps {
  onClose: () => void;
}

function CreateDialog({ onClose }: CreateDialogProps) {
  const t = useTranslations("vault.create");
  const [name, setName] = useState("");
  const [vis, setVis] = useState<"private" | "workspace">("private");
  const [busy, setBusy] = useState(false);
  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="bg-background p-5 rounded w-[400px] space-y-3"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-medium">{t("title")}</h3>
        <input
          className="w-full border rounded px-2 py-1"
          placeholder={t("namePlaceholder")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <div className="flex gap-3 text-sm">
          <label>
            <input
              type="radio"
              checked={vis === "private"}
              onChange={() => setVis("private")}
            />{" "}
            {t("visibilityPrivate")}
          </label>
          <label>
            <input
              type="radio"
              checked={vis === "workspace"}
              onChange={() => setVis("workspace")}
            />{" "}
            {t("visibilityWorkspace")}
          </label>
        </div>
        <div className="flex justify-end gap-2">
          <button onClick={onClose}>Cancel</button>
          <button
            disabled={busy || !name.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                await createVault({
                  display_name: name,
                  visibility: vis,
                  storage_quota_mb: 1024,
                });
                onClose();
              } finally {
                setBusy(false);
              }
            }}
            className="px-3 py-1.5 rounded bg-primary text-primary-foreground"
          >
            {t("submit")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function VaultSelector() {
  const t = useTranslations("vault");
  const { data, isLoading } = useVaultList();
  const [creating, setCreating] = useState(false);

  if (isLoading) return <div className="p-4">Loading…</div>;
  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">{t("nav.title")}</h1>
        <button
          onClick={() => setCreating(true)}
          className="px-3 py-1.5 rounded bg-primary text-primary-foreground"
        >
          {t("nav.createButton")}
        </button>
      </div>

      <Section
        title={t("list.tabsOwned")}
        vaults={data.owned}
        empty={t("list.emptyOwned")}
      />
      <Section title={t("list.tabsCollaborator")} vaults={data.collaborator} />
      <Section title={t("list.tabsWorkspace")} vaults={data.workspace} />

      {creating && <CreateDialog onClose={() => setCreating(false)} />}
    </div>
  );
}
