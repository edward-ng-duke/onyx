import { mutate } from "swr";
import { SWR_KEYS } from "@/lib/swr-keys";

export async function addMember(vaultId: string, user_id: string,
                                role: "collaborator" | "owner" = "collaborator") {
  const r = await fetch(SWR_KEYS.vaultMembers(vaultId), {
    method: "POST", credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, role }),
  });
  if (!r.ok) throw new Error(`add member failed: ${r.status}`);
  await mutate(SWR_KEYS.vaultMembers(vaultId));
  return r.json();
}
