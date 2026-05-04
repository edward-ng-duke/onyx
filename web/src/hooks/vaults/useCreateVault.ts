import { mutate } from "swr";
import { SWR_KEYS } from "@/lib/swr-keys";
import type { VaultDetail } from "./useVault";

export type CreateVaultBody = {
  display_name: string;
  description?: string;
  visibility: "private" | "workspace";
  storage_quota_mb: number;
};

export async function createVault(body: CreateVaultBody): Promise<VaultDetail> {
  const r = await fetch(SWR_KEYS.vaults, {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`create vault failed: ${r.status}`);
  const data = (await r.json()) as VaultDetail;
  await mutate(SWR_KEYS.vaults);
  return data;
}
