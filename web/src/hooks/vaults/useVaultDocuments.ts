import useSWR from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { SWR_KEYS } from "@/lib/swr-keys";

export type DocumentItem = {
  document_id: string;
  file_name: string;
  file_size: number | null;
  content_hash: string;
  mime_type: string | null;
  status: "pending" | "parsing" | "indexed" | "failed" | "deleted";
  uploaded_at: string | null;
  indexed_at: string | null;
  error_message: string | null;
};

export type DocumentList = { items: DocumentItem[]; next_cursor: string | null };

export function useVaultDocuments(
  id: string | undefined,
  query?: { cursor?: string; limit?: number; status?: string },
) {
  const q = query
    ? new URLSearchParams(
        Object.entries(query).filter(([_, v]) => v != null).map(([k, v]) => [k, String(v)]),
      ).toString()
    : "";
  return useSWR<DocumentList>(
    id ? SWR_KEYS.vaultDocuments(id, q || undefined) : null,
    errorHandlingFetcher,
  );
}
