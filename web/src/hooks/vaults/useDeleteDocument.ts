import { mutate } from "swr";
import { SWR_KEYS } from "@/lib/swr-keys";

export async function deleteDocument(vaultId: string, documentId: string) {
  const r = await fetch(SWR_KEYS.vaultDocument(vaultId, documentId), {
    method: "DELETE", credentials: "include",
  });
  if (!r.ok) throw new Error(`delete document failed: ${r.status}`);
  await mutate(SWR_KEYS.vaultDocuments(vaultId));
}
