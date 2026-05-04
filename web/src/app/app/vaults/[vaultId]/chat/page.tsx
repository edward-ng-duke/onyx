"use client";
import { use } from "react";
import { VaultChatView } from "@/sections/vault/VaultChatView";

export default function ChatPage({ params }: { params: Promise<{ vaultId: string }> }) {
  const { vaultId } = use(params);
  return <VaultChatView vaultId={vaultId} />;
}
