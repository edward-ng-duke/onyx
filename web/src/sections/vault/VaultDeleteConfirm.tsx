"use client";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { deleteVault } from "@/hooks/vaults/useDeleteVault";

interface VaultDeleteConfirmProps {
  vaultId: string;
  vaultName: string;
  onClose: () => void;
}

export function VaultDeleteConfirm({ vaultId, vaultName, onClose }: VaultDeleteConfirmProps) {
  const t = useTranslations("vault.delete");
  const router = useRouter();
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center"
         onClick={onClose}>
      <div className="bg-background p-5 rounded w-[420px] space-y-3"
           onClick={(e) => e.stopPropagation()}>
        <h3 className="font-medium">{t("confirmTitle")}</h3>
        <p className="text-sm">{t("confirmBody", { name: vaultName })}</p>
        <div className="flex justify-end gap-2">
          <button onClick={onClose}>Cancel</button>
          <button
            onClick={async () => {
              await deleteVault(vaultId);
              router.push("/app/vaults" as Route);
            }}
            className="px-3 py-1.5 rounded bg-destructive text-destructive-foreground"
          >
            {t("confirmButton")}
          </button>
        </div>
      </div>
    </div>
  );
}
