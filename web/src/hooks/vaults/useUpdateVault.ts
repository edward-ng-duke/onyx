import { mutate } from "swr";
import { SWR_KEYS } from "@/lib/swr-keys";
import type { VaultDetail } from "./useVault";

export async function updateVault(
  id: string,
  patch: Partial<{ display_name: string; description: string;
                   visibility: "private" | "workspace" }>,
): Promise<VaultDetail> {
  const r = await fetch(SWR_KEYS.vault(id), {
    method: "PATCH", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!r.ok) throw new Error(`update vault failed: ${r.status}`);
  const data = (await r.json()) as VaultDetail;
  await mutate(SWR_KEYS.vault(id));
  await mutate(SWR_KEYS.vaults);
  return data;
}
