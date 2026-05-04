import useSWR from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { SWR_KEYS } from "@/lib/swr-keys";

export type Member = {
  user_id: string;
  role: "owner" | "collaborator";
  granted_at: string;
};

export function useVaultMembers(id: string | undefined) {
  return useSWR<Member[]>(id ? SWR_KEYS.vaultMembers(id) : null, errorHandlingFetcher);
}
