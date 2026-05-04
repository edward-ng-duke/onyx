import type { Source } from "@/hooks/vaults/useVaultChat";

export function VaultCitationCard({ source, idx }: { source: Source; idx: number }) {
  return (
    <div className="text-xs border rounded p-2 bg-muted/30">
      <span className="font-medium mr-1">[{idx + 1}]</span>
      <span>{source.file_name ?? source.document_id}</span>
      {source.page != null && <span className="opacity-60"> · p.{source.page}</span>}
      {source.snippet && (
        <div className="mt-1 opacity-70 line-clamp-2">{source.snippet}</div>
      )}
    </div>
  );
}
