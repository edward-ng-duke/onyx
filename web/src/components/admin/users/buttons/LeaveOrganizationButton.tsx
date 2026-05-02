import { type User } from "@/lib/types";
import { toast } from "@/hooks/useToast";
import userMutationFetcher from "@/lib/admin/users/userMutationFetcher";
import useSWRMutation from "swr/mutation";
import Button from "@/refresh-components/buttons/Button";
import { useState } from "react";
import { ConfirmEntityModal } from "@/components/modals/ConfirmEntityModal";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export const LeaveOrganizationButton = ({
  user,
  mutate,
  className,
  children,
}: {
  user: User;
  mutate: () => void;
  className?: string;
  children?: React.ReactNode;
}) => {
  const tToasts = useTranslations("toasts.admin.users");
  const router = useRouter();
  const { trigger, isMutating } = useSWRMutation(
    "/api/tenants/leave-team",
    userMutationFetcher,
    {
      onSuccess: () => {
        mutate();
        toast.success(tToasts("leaveSuccess"));
      },
      onError: (errorMsg) =>
        toast.error(tToasts("leaveFailed", { error: String(errorMsg) })),
    }
  );

  const [showLeaveModal, setShowLeaveModal] = useState(false);

  const handleLeaveOrganization = async () => {
    await trigger({ user_email: user.email, method: "POST" });
    router.push("/");
  };

  return (
    <>
      {showLeaveModal && (
        <ConfirmEntityModal
          actionButtonText="Leave"
          entityType="team"
          entityName="your team"
          onClose={() => setShowLeaveModal(false)}
          onSubmit={handleLeaveOrganization}
          additionalDetails="You will lose access to all team data and resources."
        />
      )}

      {/* TODO(@raunakab): migrate to opal Button once className/iconClassName is resolved */}
      <Button
        className={className}
        onClick={() => setShowLeaveModal(true)}
        disabled={isMutating}
        internal
      >
        {children}
      </Button>
    </>
  );
};
