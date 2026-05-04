import useSWR, { mutate } from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { SWR_KEYS } from "@/lib/swr-keys";

export type ChatSession = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export function useVaultChatSessions(vaultId: string | undefined) {
  return useSWR<ChatSession[]>(
    vaultId ? SWR_KEYS.vaultChatSessions(vaultId) : null, errorHandlingFetcher,
  );
}

export async function createChatSession(
  vaultId: string, title?: string | null,
): Promise<ChatSession> {
  const r = await fetch(SWR_KEYS.vaultChatSessions(vaultId), {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: title ?? null }),
  });
  if (!r.ok) throw new Error(`create session failed: ${r.status}`);
  const data = (await r.json()) as ChatSession;
  await mutate(SWR_KEYS.vaultChatSessions(vaultId));
  return data;
}

export async function deleteChatSession(vaultId: string, sessionId: string) {
  const r = await fetch(`${SWR_KEYS.vaultChatSessions(vaultId)}/${sessionId}`, {
    method: "DELETE", credentials: "include",
  });
  if (!r.ok) throw new Error(`delete session failed: ${r.status}`);
  await mutate(SWR_KEYS.vaultChatSessions(vaultId));
}
