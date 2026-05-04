import useSWR from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { SWR_KEYS } from "@/lib/swr-keys";
import type { Entity } from "./useVaultEntities";

export function useVaultEntity(vaultId: string | undefined, eid: string | undefined) {
  return useSWR<Entity>(
    vaultId && eid ? SWR_KEYS.vaultKgEntity(vaultId, eid) : null,
    errorHandlingFetcher,
  );
}
