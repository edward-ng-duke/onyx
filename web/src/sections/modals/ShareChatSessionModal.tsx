"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@opal/utils";
import { ChatSession, ChatSessionSharedStatus } from "@/app/app/interfaces";
import { toast } from "@/hooks/useToast";
import { useChatSessionStore } from "@/app/app/stores/useChatSessionStore";
import { copyAll } from "@/app/app/message/copyingUtils";
import { Section } from "@/layouts/general-layouts";
import Modal from "@/refresh-components/Modal";
import { Button } from "@opal/components";
import CopyIconButton from "@/refresh-components/buttons/CopyIconButton";
import InputTypeIn from "@/refresh-components/inputs/InputTypeIn";
import Text from "@/refresh-components/texts/Text";
import { SvgLink, SvgShare, SvgUsers } from "@opal/icons";
import SvgCheck from "@opal/icons/check";
import SvgLock from "@opal/icons/lock";

import type { IconProps } from "@opal/types";
import useChatSessions from "@/hooks/useChatSessions";

function buildShareLink(chatSessionId: string) {
  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  return `${baseUrl}/app/shared/${chatSessionId}`;
}

async function generateShareLink(chatSessionId: string) {
  const response = await fetch(`/api/chat/chat-session/${chatSessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sharing_status: "public" }),
  });

  if (response.ok) {
    return buildShareLink(chatSessionId);
  }
  return null;
}

async function deleteShareLink(chatSessionId: string) {
  const response = await fetch(`/api/chat/chat-session/${chatSessionId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sharing_status: "private" }),
  });

  return response.ok;
}

interface PrivacyOptionProps {
  icon: React.FunctionComponent<IconProps>;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  ariaLabel?: string;
}

function PrivacyOption({
  icon: Icon,
  title,
  description,
  selected,
  onClick,
  ariaLabel,
}: PrivacyOptionProps) {
  return (
    <div
      className={cn(
        "p-1.5 rounded-08 cursor-pointer ",
        selected ? "bg-background-tint-00" : "bg-transparent",
        "hover:bg-background-tint-02"
      )}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      <div className="flex flex-row gap-1 items-center">
        <div className="flex w-5 p-[2px] self-stretch justify-center">
          <Icon
            size={16}
            className={cn(selected ? "stroke-text-05" : "stroke-text-03")}
          />
        </div>
        <div className="flex flex-col flex-1 px-0.5">
          <Text mainUiBody text05={selected} text03={!selected}>
            {title}
          </Text>
          <Text secondaryBody text03>
            {description}
          </Text>
        </div>
        {selected && (
          <div className="flex w-5 self-stretch justify-center">
            <SvgCheck size={16} className="stroke-action-link-05" />
          </div>
        )}
      </div>
    </div>
  );
}

interface ShareChatSessionModalProps {
  chatSession: ChatSession;
  onClose: () => void;
}

export default function ShareChatSessionModal({
  chatSession,
  onClose,
}: ShareChatSessionModalProps) {
  const tToast = useTranslations("toasts.chat");
  const tToastShared = useTranslations("toasts.shared");
  const t = useTranslations("modals.shareChat");
  const tCommon = useTranslations("common.actions");
  const isCurrentlyPublic =
    chatSession.shared_status === ChatSessionSharedStatus.Public;

  const [selectedPrivacy, setSelectedPrivacy] = useState<"private" | "public">(
    isCurrentlyPublic ? "public" : "private"
  );
  const [shareLink, setShareLink] = useState<string>(
    isCurrentlyPublic ? buildShareLink(chatSession.id) : ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const updateCurrentChatSessionSharedStatus = useChatSessionStore(
    (state) => state.updateCurrentChatSessionSharedStatus
  );
  const { refreshChatSessions } = useChatSessions();

  const wantsPublic = selectedPrivacy === "public";

  const isShared = shareLink && selectedPrivacy === "public";

  let submitButtonText = tCommon("done");
  if (wantsPublic && !isCurrentlyPublic && !shareLink) {
    submitButtonText = t("createShareLink");
  } else if (!wantsPublic && isCurrentlyPublic) {
    submitButtonText = t("makePrivate");
  } else if (isShared) {
    submitButtonText = t("copyLink");
  }

  async function handleSubmit() {
    setIsLoading(true);
    try {
      if (wantsPublic && !isCurrentlyPublic && !shareLink) {
        const link = await generateShareLink(chatSession.id);
        if (link) {
          setShareLink(link);
          updateCurrentChatSessionSharedStatus(ChatSessionSharedStatus.Public);
          await refreshChatSessions();
          copyAll(link);
          toast.success(tToast("shareLinkCopied"));
        } else {
          toast.error(tToast("shareLinkGenerateFailed"));
        }
      } else if (!wantsPublic && isCurrentlyPublic) {
        const success = await deleteShareLink(chatSession.id);
        if (success) {
          setShareLink("");
          updateCurrentChatSessionSharedStatus(ChatSessionSharedStatus.Private);
          await refreshChatSessions();
          toast.success(tToast("chatNowPrivate"));
          onClose();
        } else {
          toast.error(tToast("makeChatPrivateFailed"));
        }
      } else if (wantsPublic && shareLink) {
        copyAll(shareLink);
        toast.success(tToast("shareLinkCopied"));
      } else {
        onClose();
      }
    } catch (e) {
      console.error(e);
      toast.error(tToastShared("anErrorOccurred"));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Modal open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Modal.Content width="sm">
        <Modal.Header
          icon={SvgShare}
          title={isShared ? t("chatShared") : t("shareThisChat")}
          description={t("shareDescription")}
          onClose={onClose}
        />
        <Modal.Body twoTone>
          <Section
            justifyContent="start"
            alignItems="stretch"
            height="auto"
            gap={0.12}
          >
            <PrivacyOption
              icon={SvgLock}
              title={t("private")}
              description={t("privateDescription")}
              selected={selectedPrivacy === "private"}
              onClick={() => setSelectedPrivacy("private")}
              ariaLabel="share-modal-option-private"
            />
            <PrivacyOption
              icon={SvgUsers}
              title={t("organization")}
              description={t("organizationDescription")}
              selected={selectedPrivacy === "public"}
              onClick={() => setSelectedPrivacy("public")}
              ariaLabel="share-modal-option-public"
            />
          </Section>

          {isShared && (
            <InputTypeIn
              aria-label="share-modal-link-input"
              readOnly
              value={shareLink}
              rightSection={
                <CopyIconButton
                  getCopyText={() => shareLink}
                  tooltip={t("copyLinkTooltip")}
                  size="sm"
                  aria-label="share-modal-copy-link"
                />
              }
            />
          )}
        </Modal.Body>
        <Modal.Footer>
          {!isShared && (
            <Button
              prominence="secondary"
              onClick={onClose}
              aria-label="share-modal-cancel"
            >
              {tCommon("cancel")}
            </Button>
          )}
          <Button
            disabled={isLoading}
            onClick={handleSubmit}
            icon={isShared ? SvgLink : undefined}
            width={isShared ? "full" : undefined}
            aria-label="share-modal-submit"
          >
            {submitButtonText}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
