import useSWR from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { SWR_KEYS } from "@/lib/swr-keys";

export type KGNode = { id: string; label?: string; properties?: Record<string, any> };
export type KGEdge = { source?: string; target?: string; type?: string;
                       properties?: Record<string, any> };
export type Subgraph = { nodes: KGNode[]; edges: KGEdge[] };

export function useVaultEntityNeighbors(vaultId: string | undefined,
                                        eid: string | undefined, depth = 1) {
  return useSWR<Subgraph>(
    vaultId && eid ? SWR_KEYS.vaultKgEntityNeighbors(vaultId, eid, depth) : null,
    errorHandlingFetcher,
  );
}
