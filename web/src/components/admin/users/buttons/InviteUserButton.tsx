import {
  type InvitedUserSnapshot,
  type AcceptedUserSnapshot,
} from "@/lib/types";

import { toast } from "@/hooks/useToast";
import useSWRMutation from "swr/mutation";
import { Button } from "@opal/components";
import GenericConfirmModal from "@/components/modals/GenericConfirmModal";
import { useState } from "react";
import { useTranslations } from "next-intl";

export const InviteUserButton = ({
  user,
  invited,
  mutate,
}: {
  user: AcceptedUserSnapshot | InvitedUserSnapshot;
  invited: boolean;
  mutate: (() => void) | (() => void)[];
}) => {
  const tToasts = useTranslations("toasts.admin.users");
  const tActions = useTranslations("common.actions");
  const tModals = useTranslations("modals.inviteUser");

  const { trigger: inviteTrigger, isMutating: isInviting } = useSWRMutation(
    "/api/manage/admin/users",
    async (url, { arg }: { arg: { emails: string[] } }) => {
      const response = await fetch(url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(arg),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    {
      onSuccess: () => {
        setShowInviteModal(false);
        if (typeof mutate === "function") {
          mutate();
        } else {
          mutate.forEach((fn) => fn());
        }
        toast.success(tToasts("inviteSuccess"));
      },
      onError: (errorMsg) => {
        setShowInviteModal(false);
        toast.error(tToasts("inviteFailed", { error: String(errorMsg) }));
      },
    }
  );

  const { trigger: uninviteTrigger, isMutating: isUninviting } = useSWRMutation(
    "/api/manage/admin/remove-invited-user",
    async (url, { arg }: { arg: { user_email: string } }) => {
      const response = await fetch(url, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(arg),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    {
      onSuccess: () => {
        setShowInviteModal(false);
        if (typeof mutate === "function") {
          mutate();
        } else {
          mutate.forEach((fn) => fn());
        }
        toast.success(tToasts("uninviteSuccess"));
      },
      onError: (errorMsg) => {
        setShowInviteModal(false);
        toast.error(tToasts("uninviteFailed", { error: String(errorMsg) }));
      },
    }
  );

  const [showInviteModal, setShowInviteModal] = useState(false);

  const handleConfirm = () => {
    const normalizedEmail = user.email.toLowerCase();
    if (invited) {
      uninviteTrigger({ user_email: normalizedEmail });
    } else {
      inviteTrigger({ emails: [normalizedEmail] });
    }
  };

  const isMutating = isInviting || isUninviting;

  return (
    <>
      {showInviteModal && (
        <GenericConfirmModal
          title={invited ? tModals("titleUninvite") : tModals("titleInvite")}
          message={
            invited
              ? tModals("bodyUninvite", { email: user.email })
              : tModals("bodyInvite", { email: user.email })
          }
          onClose={() => setShowInviteModal(false)}
          onConfirm={handleConfirm}
        />
      )}

      <Button disabled={isMutating} onClick={() => setShowInviteModal(true)}>
        {invited ? tActions("uninvite") : tActions("invite")}
      </Button>
    </>
  );
};
