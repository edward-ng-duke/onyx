"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@opal/components";
import { SvgUserPlus, SvgUserX, SvgXCircle, SvgKey } from "@opal/icons";
import ConfirmationModalLayout from "@/refresh-components/layouts/ConfirmationModalLayout";
import Text from "@/refresh-components/texts/Text";
import { toast } from "@/hooks/useToast";
import {
  deactivateUser,
  activateUser,
  deleteUser,
  cancelInvite,
  resetPassword,
} from "./svc";

// ---------------------------------------------------------------------------
// Shared helper
// ---------------------------------------------------------------------------

async function runAction(
  action: () => Promise<void>,
  successMessage: string,
  onDone: () => void,
  setIsSubmitting: (v: boolean) => void,
  errorFallback: string
) {
  setIsSubmitting(true);
  try {
    await action();
    onDone();
    toast.success(successMessage);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : errorFallback);
  } finally {
    setIsSubmitting(false);
  }
}

// ---------------------------------------------------------------------------
// Cancel Invite Modal
// ---------------------------------------------------------------------------

interface CancelInviteModalProps {
  email: string;
  onClose: () => void;
  onMutate: () => void;
}

export function CancelInviteModal({
  email,
  onClose,
  onMutate,
}: CancelInviteModalProps) {
  const tT = useTranslations("toasts.admin.users");
  const tShared = useTranslations("toasts.admin.shared");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <ConfirmationModalLayout
      icon={(props) => (
        <SvgUserX {...props} className="text-action-danger-05" />
      )}
      title="Cancel Invite"
      onClose={isSubmitting ? undefined : onClose}
      submit={
        <Button
          disabled={isSubmitting}
          variant="danger"
          onClick={() =>
            runAction(
              () => cancelInvite(email),
              tT("inviteCancelled"),
              () => {
                onMutate();
                onClose();
              },
              setIsSubmitting,
              tShared("anErrorOccurred")
            )
          }
        >
          Cancel Invite
        </Button>
      }
    >
      <Text as="p" text03>
        <Text as="span" text05>
          {email}
        </Text>{" "}
        will no longer be able to join Onyx with this invite.
      </Text>
    </ConfirmationModalLayout>
  );
}

// ---------------------------------------------------------------------------
// Deactivate User Modal
// ---------------------------------------------------------------------------

interface DeactivateUserModalProps {
  email: string;
  onClose: () => void;
  onMutate: () => void;
}

export function DeactivateUserModal({
  email,
  onClose,
  onMutate,
}: DeactivateUserModalProps) {
  const tT = useTranslations("toasts.admin.users");
  const tShared = useTranslations("toasts.admin.shared");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <ConfirmationModalLayout
      icon={(props) => (
        <SvgUserX {...props} className="text-action-danger-05" />
      )}
      title="Deactivate User"
      onClose={isSubmitting ? undefined : onClose}
      submit={
        <Button
          disabled={isSubmitting}
          variant="danger"
          onClick={() =>
            runAction(
              () => deactivateUser(email),
              tT("userDeactivated"),
              () => {
                onMutate();
                onClose();
              },
              setIsSubmitting,
              tShared("anErrorOccurred")
            )
          }
        >
          Deactivate
        </Button>
      }
    >
      <Text as="p" text03>
        <Text as="span" text05>
          {email}
        </Text>{" "}
        will immediately lose access to Onyx. Their sessions and agents will be
        preserved. Their license seat will be freed. You can reactivate this
        account later.
      </Text>
    </ConfirmationModalLayout>
  );
}

// ---------------------------------------------------------------------------
// Activate User Modal
// ---------------------------------------------------------------------------

interface ActivateUserModalProps {
  email: string;
  onClose: () => void;
  onMutate: () => void;
}

export function ActivateUserModal({
  email,
  onClose,
  onMutate,
}: ActivateUserModalProps) {
  const tT = useTranslations("toasts.admin.users");
  const tShared = useTranslations("toasts.admin.shared");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <ConfirmationModalLayout
      icon={SvgUserPlus}
      title="Activate User"
      onClose={isSubmitting ? undefined : onClose}
      submit={
        <Button
          disabled={isSubmitting}
          onClick={() =>
            runAction(
              () => activateUser(email),
              tT("userActivated"),
              () => {
                onMutate();
                onClose();
              },
              setIsSubmitting,
              tShared("anErrorOccurred")
            )
          }
        >
          Activate
        </Button>
      }
    >
      <Text as="p" text03>
        <Text as="span" text05>
          {email}
        </Text>{" "}
        will regain access to Onyx.
      </Text>
    </ConfirmationModalLayout>
  );
}

// ---------------------------------------------------------------------------
// Delete User Modal
// ---------------------------------------------------------------------------

interface DeleteUserModalProps {
  email: string;
  onClose: () => void;
  onMutate: () => void;
}

export function DeleteUserModal({
  email,
  onClose,
  onMutate,
}: DeleteUserModalProps) {
  const tT = useTranslations("toasts.admin.users");
  const tShared = useTranslations("toasts.admin.shared");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <ConfirmationModalLayout
      icon={(props) => (
        <SvgUserX {...props} className="text-action-danger-05" />
      )}
      title="Delete User"
      onClose={isSubmitting ? undefined : onClose}
      submit={
        <Button
          disabled={isSubmitting}
          variant="danger"
          onClick={() =>
            runAction(
              () => deleteUser(email),
              tT("userDeleted"),
              () => {
                onMutate();
                onClose();
              },
              setIsSubmitting,
              tShared("anErrorOccurred")
            )
          }
        >
          Delete
        </Button>
      }
    >
      <Text as="p" text03>
        <Text as="span" text05>
          {email}
        </Text>{" "}
        will be permanently removed from Onyx. All of their session history will
        be deleted. Deletion cannot be undone.
      </Text>
    </ConfirmationModalLayout>
  );
}

// ---------------------------------------------------------------------------
// Reset Password Modal
// ---------------------------------------------------------------------------

interface ResetPasswordModalProps {
  email: string;
  onClose: () => void;
}

export function ResetPasswordModal({
  email,
  onClose,
}: ResetPasswordModalProps) {
  const tT = useTranslations("toasts.admin.users");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState<string | null>(null);

  const handleClose = () => {
    onClose();
    setNewPassword(null);
  };

  return (
    <ConfirmationModalLayout
      icon={SvgKey}
      title={newPassword ? "Password Reset" : "Reset Password"}
      onClose={isSubmitting ? undefined : handleClose}
      submit={
        newPassword ? (
          <Button onClick={handleClose}>Done</Button>
        ) : (
          <Button
            disabled={isSubmitting}
            variant="danger"
            onClick={async () => {
              setIsSubmitting(true);
              try {
                const result = await resetPassword(email);
                setNewPassword(result.new_password);
              } catch (err) {
                toast.error(
                  err instanceof Error
                    ? err.message
                    : tT("passwordResetFailed")
                );
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            Reset Password
          </Button>
        )
      }
    >
      {newPassword ? (
        <div className="flex flex-col gap-2">
          <Text as="p" text03>
            The password for{" "}
            <Text as="span" text05>
              {email}
            </Text>{" "}
            has been reset. Copy the new password below — it will not be shown
            again.
          </Text>
          <code className="rounded-xs bg-background-neutral-02 px-3 py-2 text-sm select-all">
            {newPassword}
          </code>
        </div>
      ) : (
        <Text as="p" text03>
          This will generate a new random password for{" "}
          <Text as="span" text05>
            {email}
          </Text>
          . Their current password will stop working immediately.
        </Text>
      )}
    </ConfirmationModalLayout>
  );
}
