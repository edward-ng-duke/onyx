"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

import { useVaultChat, type Message } from "@/hooks/vaults/useVaultChat";
import { createChatSession, useVaultChatSessions } from "@/hooks/vaults/useVaultChatSessions";
import { VaultChatComposer } from "./VaultChatComposer";
import { VaultCitationCard } from "./VaultCitationCard";

export function VaultChatView({ vaultId }: { vaultId: string }) {
  const t = useTranslations("vault.chat");
  const { data: sessions } = useVaultChatSessions(vaultId);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const { messages, send, cancel, isStreaming } = useVaultChat(vaultId, sessionId);

  // Auto-create session on first send if none active.
  const ensureSession = async () => {
    if (sessionId) return sessionId;
    const s = await createChatSession(vaultId, null);
    setSessionId(s.id);
    return s.id;
  };

  useEffect(() => {
    if (!sessionId && sessions && sessions.length > 0) {
      const first = sessions[0];
      if (first) setSessionId(first.id);
    }
  }, [sessions, sessionId]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-sm opacity-50">{t("empty")}</div>
        )}
        {messages.map((m, i) => <MessageBlock key={i} m={m} />)}
      </div>
      <VaultChatComposer
        isStreaming={isStreaming}
        onCancel={cancel}
        onSend={async (q, opts) => {
          await ensureSession();
          send(q, opts);
        }}
      />
    </div>
  );
}

function MessageBlock({ m }: { m: Message }) {
  const t = useTranslations("vault.chat");
  return (
    <div>
      <div className={m.role === "user" ? "font-medium" : ""}>{m.content}</div>
      {m.error && (
        <div className="mt-2 text-sm text-destructive">{m.error.message}</div>
      )}
      {m.sources && m.sources.length > 0 && (
        <div className="mt-2 space-y-1">
          <div className="text-xs uppercase opacity-50">{t("sourcesTitle")}</div>
          {m.sources.map((s, i) => <VaultCitationCard key={i} source={s} idx={i} />)}
        </div>
      )}
    </div>
  );
}
