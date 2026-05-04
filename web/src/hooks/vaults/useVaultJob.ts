import useSWR from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { SWR_KEYS } from "@/lib/swr-keys";

export type Job = {
  job_id: string;
  status: "queued" | "running" | "done" | "failed";
  job_type: string;
  document_id: string | null;
  progress: Record<string, unknown> | null;
  error_message: string | null;
};

export function useVaultJob(vaultId: string, jobId: string | null) {
  return useSWR<Job>(
    vaultId && jobId ? SWR_KEYS.vaultJob(vaultId, jobId) : null,
    errorHandlingFetcher,
    { refreshInterval: (data) =>
        data && (data.status === "done" || data.status === "failed") ? 0 : 5000 },
  );
}
