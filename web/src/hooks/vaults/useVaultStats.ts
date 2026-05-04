import useSWR from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { SWR_KEYS } from "@/lib/swr-keys";

export type Stats = { entities: number; relations: number; chunks: number };

export function useVaultStats(vaultId: string | undefined) {
  return useSWR<Stats>(
    vaultId ? SWR_KEYS.vaultKgStats(vaultId) : null, errorHandlingFetcher,
  );
}
