import { mutate } from "swr";
import { SWR_KEYS } from "@/lib/swr-keys";

export async function removeMember(vaultId: string, userId: string) {
  const r = await fetch(`${SWR_KEYS.vaultMembers(vaultId)}/${userId}`, {
    method: "DELETE", credentials: "include",
  });
  if (!r.ok) throw new Error(`remove member failed: ${r.status}`);
  await mutate(SWR_KEYS.vaultMembers(vaultId));
}
