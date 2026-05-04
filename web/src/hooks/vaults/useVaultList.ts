import useSWR from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { SWR_KEYS } from "@/lib/swr-keys";

export type VaultBrief = {
  id: string;
  display_name: string;
  description: string | null;
  visibility: "private" | "workspace";
  owner_user_id: string;
  document_count: number;
  storage_used_mb: number;
  storage_quota_mb: number;
  effective_role: "reader" | "collaborator" | "owner";
  created_at: string;
  updated_at: string;
};

export type VaultListResponse = {
  owned: VaultBrief[];
  collaborator: VaultBrief[];
  workspace: VaultBrief[];
};

export function useVaultList() {
  return useSWR<VaultListResponse>(SWR_KEYS.vaults, errorHandlingFetcher);
}
