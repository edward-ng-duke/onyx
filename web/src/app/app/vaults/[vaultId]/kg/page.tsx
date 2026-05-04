"use client";
import { use } from "react";
import { VaultGraphView } from "@/sections/vault/VaultGraphView";

export default function KgPage({ params }: { params: Promise<{ vaultId: string }> }) {
  const { vaultId } = use(params);
  return <VaultGraphView vaultId={vaultId} />;
}
