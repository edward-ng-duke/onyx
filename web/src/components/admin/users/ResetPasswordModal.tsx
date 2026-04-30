import { useState } from "react";
import { useTranslations } from "next-intl";
import Modal from "@/refresh-components/Modal";
import Button from "@/refresh-components/buttons/Button";
import { User } from "@/lib/types";
import { toast } from "@/hooks/useToast";
import Text from "@/refresh-components/texts/Text";
import { LoadingAnimation } from "@/components/Loading";
import CopyIconButton from "@/refresh-components/buttons/CopyIconButton";
import { SvgKey, SvgRefreshCw } from "@opal/icons";

export interface ResetPasswordModalProps {
  user: User;
  onClose: () => void;
}

export default function ResetPasswordModal({
  user,
  onClose,
}: ResetPasswordModalProps) {
  const t = useTranslations("components.resetPasswordModal");
  const [newPassword, setNewPassword] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/password/reset_password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_email: user.email }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewPassword(data.new_password);
        toast.success(t("resetSuccess"));
      } else {
        const errorData = await response.json();
        toast.error(errorData.detail || t("resetFailed"));
      }
    } catch (error) {
      toast.error(t("resetError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal open onOpenChange={onClose}>
      <Modal.Content width="sm" height="sm">
        <Modal.Header
          icon={SvgKey}
          title={t("title")}
          onClose={onClose}
          description={
            newPassword
              ? undefined
              : t("confirmDescription", { email: user.email })
          }
        />
        <Modal.Body>
          {newPassword ? (
            <div>
              <Text as="p">{t("newPasswordLabel")}</Text>
              <div className="flex items-center bg-background-tint-03 p-2 rounded gap-2">
                <Text as="p" data-testid="new-password" className="flex-grow">
                  {newPassword}
                </Text>
                <CopyIconButton getCopyText={() => newPassword} />
              </div>
              <Text as="p" text02>
                {t("communicateSecurely")}
              </Text>
            </div>
          ) : (
            // TODO(@raunakab): migrate to opal Button once it supports ReactNode children
            <Button
              onClick={handleResetPassword}
              disabled={isLoading}
              leftIcon={SvgRefreshCw}
            >
              {isLoading ? (
                <Text as="p">
                  <LoadingAnimation text={t("resetting")} />
                </Text>
              ) : (
                t("resetButton")
              )}
            </Button>
          )}
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );
}
