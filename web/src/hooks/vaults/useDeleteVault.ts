import { mutate } from "swr";
import { SWR_KEYS } from "@/lib/swr-keys";

export async function deleteVault(id: string): Promise<void> {
  const r = await fetch(SWR_KEYS.vault(id), {
    method: "DELETE", credentials: "include",
  });
  if (!r.ok) throw new Error(`delete vault failed: ${r.status}`);
  await mutate(SWR_KEYS.vaults);
}
