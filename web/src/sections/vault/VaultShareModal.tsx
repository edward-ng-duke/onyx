"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";

import { addMember } from "@/hooks/vaults/useAddMember";
import { removeMember } from "@/hooks/vaults/useRemoveMember";
import { useVaultMembers } from "@/hooks/vaults/useVaultMembers";

interface VaultShareModalProps {
  vaultId: string;
  onClose: () => void;
}

export function VaultShareModal({ vaultId, onClose }: VaultShareModalProps) {
  const t = useTranslations("vault.share");
  const { data } = useVaultMembers(vaultId);
  const [userId, setUserId] = useState("");

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center"
         onClick={onClose}>
      <div className="bg-background p-5 rounded w-[480px] space-y-3"
           onClick={(e) => e.stopPropagation()}>
        <h3 className="font-medium">{t("title")}</h3>
        <ul className="space-y-1 text-sm">
          {data?.map((m) => (
            <li key={m.user_id} className="flex items-center justify-between">
              <span>{m.user_id} · {m.role === "owner" ? t("roleOwner") : t("roleCollaborator")}</span>
              {m.role !== "owner" && (
                <button onClick={() => removeMember(vaultId, m.user_id)}
                        className="text-destructive text-xs">×</button>
              )}
            </li>
          ))}
        </ul>
        <div className="flex gap-2">
          <input className="flex-1 border rounded px-2 py-1"
                 placeholder="user id (UUID)"
                 value={userId} onChange={(e) => setUserId(e.target.value)} />
          <button onClick={() => userId && addMember(vaultId, userId)}>{t("invite")}</button>
        </div>
      </div>
    </div>
  );
}
