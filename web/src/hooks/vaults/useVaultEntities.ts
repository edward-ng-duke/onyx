import useSWR from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { SWR_KEYS } from "@/lib/swr-keys";

export type Entity = { id: string; entity_name?: string; entity_type?: string;
                        content?: string; file_path?: string };
export type EntityList = { items: Entity[]; next_cursor: string | null };

export function useVaultEntities(vaultId: string | undefined,
                                 q: { type?: string; search?: string;
                                      cursor?: string; limit?: number } = {}) {
  const qs = new URLSearchParams();
  if (q.type) qs.set("type", q.type);
  if (q.search) qs.set("search", q.search);
  if (q.cursor) qs.set("cursor", q.cursor);
  qs.set("limit", String(q.limit ?? 50));
  return useSWR<EntityList>(
    vaultId ? SWR_KEYS.vaultKgEntities(vaultId, qs.toString()) : null,
    errorHandlingFetcher,
  );
}
