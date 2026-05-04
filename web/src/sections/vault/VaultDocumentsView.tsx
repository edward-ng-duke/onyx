"use client";
import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";

import { deleteDocument } from "@/hooks/vaults/useDeleteDocument";
import { uploadDocument } from "@/hooks/vaults/useUploadDocument";
import { useVaultDocuments } from "@/hooks/vaults/useVaultDocuments";

export function VaultDocumentsView({ vaultId }: { vaultId: string }) {
  const t = useTranslations("vault.docs");
  const { data, isLoading } = useVaultDocuments(vaultId);
  const [uploading, setUploading] = useState(false);

  const onUpload = useCallback(async (files: FileList) => {
    setUploading(true);
    try {
      for (const f of Array.from(files)) await uploadDocument(vaultId, f);
    } finally { setUploading(false); }
  }, [vaultId]);

  return (
    <div className="p-4 space-y-4">
      <div
        className="border-2 border-dashed rounded p-6 text-center cursor-pointer"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onUpload(e.dataTransfer.files); }}
        onClick={() => {
          const inp = document.createElement("input");
          inp.type = "file"; inp.multiple = true;
          inp.accept = ".pdf,.png,.jpg,.jpeg,.doc,.docx,.txt,.md";
          inp.onchange = () => inp.files && onUpload(inp.files);
          inp.click();
        }}
      >
        <div className="font-medium">{t("dropHint")}</div>
        <div className="text-xs opacity-60 mt-1">{t("accepted")}</div>
      </div>

      {isLoading ? <div>Loading…</div> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b">
            <th className="text-left py-1">Name</th>
            <th>Size</th><th>Status</th><th>Uploaded</th><th></th>
          </tr></thead>
          <tbody>
            {data?.items.map((d) => (
              <tr key={d.document_id} className="border-b">
                <td className="py-1">{d.file_name}</td>
                <td>{d.file_size != null ? `${(d.file_size / 1024 / 1024).toFixed(1)} MB` : "—"}</td>
                <td>{statusBadge(d.status, t)}</td>
                <td>{d.uploaded_at?.slice(0, 10) ?? "—"}</td>
                <td>
                  <button
                    onClick={async () => {
                      if (confirm(t("deleteConfirm"))) {
                        await deleteDocument(vaultId, d.document_id);
                      }
                    }}
                    className="text-destructive"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {uploading && <div className="text-sm opacity-60">Uploading…</div>}
    </div>
  );
}

function statusBadge(s: string, t: ReturnType<typeof useTranslations>) {
  const map: Record<string, string> = {
    pending: t("statusPending"), parsing: t("statusParsing"),
    indexed: t("statusIndexed"), failed: t("statusFailed"),
    deleted: t("statusDeleted"),
  };
  return <span>{map[s] ?? s}</span>;
}
