import { mutate } from "swr";
import { SWR_KEYS } from "@/lib/swr-keys";

export type UploadResult = {
  document_id: string;
  job_id: string | null;
  status: string;
  deduplicated: boolean;
  file_name: string;
};

export async function uploadDocument(vaultId: string, file: File): Promise<UploadResult> {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`/api/onyx/vaults/${vaultId}/documents`, {
    method: "POST", credentials: "include", body: fd,
  });
  if (!r.ok) throw new Error(`upload failed: ${r.status}`);
  const data = (await r.json()) as UploadResult;
  await mutate(SWR_KEYS.vaultDocuments(vaultId));
  return data;
}
