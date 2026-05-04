"use client";
import { use } from "react";
import { VaultDocumentsView } from "@/sections/vault/VaultDocumentsView";

export default function DocsPage({ params }: { params: Promise<{ vaultId: string }> }) {
  const { vaultId } = use(params);
  return <VaultDocumentsView vaultId={vaultId} />;
}
