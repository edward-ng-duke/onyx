import useSWR from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { SWR_KEYS } from "@/lib/swr-keys";
import type { VaultBrief } from "./useVaultList";

export type VaultDetail = VaultBrief & { rag_tenant_id: string };

export function useVault(id: string | undefined) {
  return useSWR<VaultDetail>(id ? SWR_KEYS.vault(id) : null, errorHandlingFetcher);
}
