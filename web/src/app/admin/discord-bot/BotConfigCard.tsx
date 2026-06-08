"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Section } from "@/layouts/general-layouts";
import Text from "@/refresh-components/texts/Text";
import Card from "@/refresh-components/cards/Card";
import { Button } from "@opal/components";
import { Badge } from "@/components/ui/badge";
import PasswordInputTypeIn from "@/refresh-components/inputs/PasswordInputTypeIn";
import { ThreeDotsLoader } from "@/components/Loading";
import { Tooltip } from "@opal/components";
import {
  useDiscordBotConfig,
  useDiscordGuilds,
} from "@/app/admin/discord-bot/hooks";
import { createBotConfig, deleteBotConfig } from "@/app/admin/discord-bot/lib";
import { toast } from "@/hooks/useToast";
import { ConfirmEntityModal } from "@/sections/modals/ConfirmEntityModal";
import { getFormattedDateTime } from "@/lib/dateUtils";

export function BotConfigCard() {
  const t = useTranslations("admin.discordBot");
  const {
    data: botConfig,
    isLoading,
    isManaged,
    refreshBotConfig,
  } = useDiscordBotConfig();
  const { data: guilds } = useDiscordGuilds();

  const [botToken, setBotToken] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Don't render anything if managed externally (Cloud or env var)
  if (isManaged) {
    return null;
  }

  // Show loading while fetching initial state
  if (isLoading) {
    return (
      <Card>
        <Section
          flexDirection="row"
          justifyContent="between"
          alignItems="center"
        >
          <Text mainContentEmphasis text05>
            {t("botToken")}
          </Text>
        </Section>
        <ThreeDotsLoader />
      </Card>
    );
  }

  const isConfigured = botConfig?.configured ?? false;
  const hasServerConfigs = (guilds?.length ?? 0) > 0;

  const handleSaveToken = async () => {
    if (!botToken.trim()) {
      toast.error(t("saveTokenEmpty"));
      return;
    }

    setIsSubmitting(true);
    try {
      await createBotConfig(botToken.trim());
      setBotToken("");
      refreshBotConfig();
      toast.success(t("saveTokenSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveTokenFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteToken = async () => {
    setIsSubmitting(true);
    try {
      await deleteBotConfig();
      refreshBotConfig();
      toast.success(t("deleteTokenSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("deleteTokenFailed"));
    } finally {
      setIsSubmitting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      {showDeleteConfirm && (
        <ConfirmEntityModal
          danger
          entityType={t("deleteTokenEntityType")}
          entityName={t("deleteTokenEntityName")}
          onClose={() => setShowDeleteConfirm(false)}
          onSubmit={handleDeleteToken}
          additionalDetails={t("deleteTokenAdditionalDetails")}
        />
      )}
      <Card>
        <Section flexDirection="row" justifyContent="between">
          <Section flexDirection="row" gap={0.5} width="fit">
            <Text mainContentEmphasis text05>
              {t("botToken")}
            </Text>
            {isConfigured ? (
              <Badge variant="success">{t("configured")}</Badge>
            ) : (
              <Badge variant="secondary">{t("notConfigured")}</Badge>
            )}
          </Section>
          {isConfigured && (
            <Tooltip
              tooltip={
                hasServerConfigs ? t("deleteServerConfigsFirst") : undefined
              }
            >
              <Button
                disabled={isSubmitting || hasServerConfigs}
                variant="danger"
                onClick={() => setShowDeleteConfirm(true)}
              >
                {t("deleteDiscordToken")}
              </Button>
            </Tooltip>
          )}
        </Section>

        {isConfigured ? (
          <Section flexDirection="column" alignItems="start" gap={0.5}>
            <Text text03 secondaryBody>
              {t("configuredHint")}
              {botConfig?.created_at && (
                <>
                  {" "}
                  {t("addedAt", {
                    date:
                      getFormattedDateTime(
                        new Date(botConfig.created_at)
                      ) ?? "",
                  })}
                </>
              )}
            </Text>
            <Text text03 secondaryBody>
              {t("changeTokenHint")}
            </Text>
          </Section>
        ) : (
          <Section flexDirection="column" alignItems="start" gap={0.75}>
            <Text text03 secondaryBody>
              {t("enterTokenPrompt")}
            </Text>
            <Section flexDirection="row" alignItems="end" gap={0.5}>
              <PasswordInputTypeIn
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                placeholder={t("tokenPlaceholder")}
                disabled={isSubmitting}
              />
              <Button
                disabled={isSubmitting || !botToken.trim()}
                onClick={handleSaveToken}
              >
                {isSubmitting ? t("savingToken") : t("saveToken")}
              </Button>
            </Section>
          </Section>
        )}
      </Card>
    </>
  );
}
