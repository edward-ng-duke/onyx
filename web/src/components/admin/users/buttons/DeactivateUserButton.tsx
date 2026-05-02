import { type User } from "@/lib/types";
import { toast } from "@/hooks/useToast";
import Button from "@/refresh-components/buttons/Button";
import useSWRMutation from "swr/mutation";
import userMutationFetcher from "@/lib/admin/users/userMutationFetcher";
import { SvgXCircle } from "@opal/icons";
import { useTranslations } from "next-intl";
const DeactivateUserButton = ({
  user,
  deactivate,
  mutate,
  className,
  children,
}: {
  user: User;
  deactivate: boolean;
  mutate: () => void;
  className?: string;
  children?: string;
}) => {
  const tToasts = useTranslations("toasts.admin.users");
  const { trigger, isMutating } = useSWRMutation(
    deactivate
      ? "/api/manage/admin/deactivate-user"
      : "/api/manage/admin/activate-user",
    userMutationFetcher,
    {
      onSuccess: () => {
        mutate();
        toast.success(
          deactivate ? tToasts("userDeactivated") : tToasts("userActivated")
        );
      },
      onError: (errorMsg) => toast.error(errorMsg.message),
    }
  );
  return (
    // TODO(@raunakab): migrate to opal Button once className/iconClassName is resolved
    <Button
      className={className}
      onClick={() => trigger({ user_email: user.email })}
      disabled={isMutating}
      leftIcon={SvgXCircle}
      tertiary
    >
      {children}
    </Button>
  );
};

export default DeactivateUserButton;
