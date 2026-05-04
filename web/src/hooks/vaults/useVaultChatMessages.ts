import useSWR from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { SWR_KEYS } from "@/lib/swr-keys";

export type ChatMessage = {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  sources_json: any[] | null;
  tokens_json: Record<string, number> | null;
  request_id: string | null;
  created_at: string;
};

export function useVaultChatMessages(vaultId: string | undefined,
                                     sessionId: string | undefined) {
  return useSWR<ChatMessage[]>(
    vaultId && sessionId ? SWR_KEYS.vaultChatMessages(vaultId, sessionId) : null,
    errorHandlingFetcher,
  );
}
