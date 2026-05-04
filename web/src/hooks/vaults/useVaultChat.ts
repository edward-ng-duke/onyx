import { useCallback, useRef, useState } from "react";
import { mutate } from "swr";

import { parseSSE } from "@/lib/vaults/sse-parser";
import { SWR_KEYS } from "@/lib/swr-keys";

export type Source = {
  document_id?: string; file_name?: string; chunk_id?: string;
  score?: number; snippet?: string; modality?: string;
  page?: number | null; bbox?: number[] | null;
};

export type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  tokens?: Record<string, number>;
  error?: { code: string; message: string; retryable: boolean };
  streaming?: boolean;
};

export function useVaultChat(vaultId: string, sessionId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => setMessages([]), []);

  const send = useCallback(async (
    question: string,
    opts: { mode?: string; vlmEnhanced?: boolean } = {},
  ) => {
    abortRef.current = new AbortController();
    setStreaming(true);
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [
      ...prev,
      { role: "user", content: question },
      { role: "assistant", content: "", streaming: true },
    ]);
    try {
      const resp = await fetch(`/api/onyx/vaults/${vaultId}/query`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          session_id: sessionId, question, history,
          mode: opts.mode || "hybrid", top_k: 10,
          vlm_enhanced: !!opts.vlmEnhanced,
          include_sources: true, max_history_turns: 5,
        }),
        signal: abortRef.current.signal,
      });
      if (!resp.ok || !resp.body) {
        throw new Error(`stream failed: ${resp.status}`);
      }
      for await (const ev of parseSSE(resp.body)) {
        if (ev.event === "chunk" && typeof ev.data?.text === "string") {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (!last) return prev;
            next[next.length - 1] = { ...last, content: last.content + ev.data.text };
            return next;
          });
        } else if (ev.event === "done") {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (!last) return prev;
            next[next.length - 1] = {
              ...last,
              streaming: false,
              sources: ev.data?.sources,
              tokens: ev.data?.tokens,
              content: ev.data?.answer ?? last.content,
            };
            return next;
          });
        } else if (ev.event === "error") {
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            if (!last) return prev;
            next[next.length - 1] = {
              ...last, streaming: false, error: ev.data,
            };
            return next;
          });
        }
      }
    } finally {
      setStreaming(false);
      if (sessionId) await mutate(SWR_KEYS.vaultChatMessages(vaultId, sessionId));
    }
  }, [messages, sessionId, vaultId]);

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  return { messages, send, cancel, isStreaming, reset };
}
