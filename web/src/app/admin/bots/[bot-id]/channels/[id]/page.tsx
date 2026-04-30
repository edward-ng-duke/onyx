"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { SlackChannelConfigCreationForm } from "@/app/admin/bots/[bot-id]/channels/SlackChannelConfigCreationForm";
import { ErrorCallout } from "@/components/ErrorCallout";
import SimpleLoader from "@/refresh-components/loaders/SimpleLoader";
import * as SettingsLayouts from "@/layouts/settings-layouts";
import { SvgSlack } from "@opal/logos";
import { useSlackChannelConfigs } from "@/app/admin/bots/[bot-id]/hooks";
import { useDocumentSets } from "@/app/admin/documents/sets/hooks";
import { useAgents } from "@/hooks/useAgents";
import { useStandardAnswerCategories } from "@/app/ee/admin/standard-answer/hooks";
import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";
import type { StandardAnswerCategoryResponse } from "@/components/standardAnswers/getStandardAnswerCategoriesIfEE";

function EditSlackChannelConfigContent({ id }: { id: string }) {
  const t = useTranslations("admin.bots.channels");
  const isPaidEnterprise = usePaidEnterpriseFeaturesEnabled();

  const {
    data: slackChannelConfigs,
    isLoading: isChannelsLoading,
    error: channelsError,
  } = useSlackChannelConfigs();

  const {
    data: documentSets,
    isLoading: isDocSetsLoading,
    error: docSetsError,
  } = useDocumentSets();

  const {
    agents,
    isLoading: isAgentsLoading,
    error: agentsError,
  } = useAgents();

  const {
    data: standardAnswerCategories,
    isLoading: isStdAnswerLoading,
    error: stdAnswerError,
  } = useStandardAnswerCategories();

  const isLoading =
    isChannelsLoading ||
    isDocSetsLoading ||
    isAgentsLoading ||
    (isPaidEnterprise && isStdAnswerLoading);

  const slackChannelConfig = slackChannelConfigs?.find(
    (config) => config.id === Number(id)
  );

  const title = slackChannelConfig?.is_default
    ? t("editDefaultTitle")
    : t("editChannelTitle");

  return (
    <SettingsLayouts.Root>
      <SettingsLayouts.Header
        icon={SvgSlack}
        title={title}
        divider
        backButton
      />
      <SettingsLayouts.Body>
        {isLoading ? (
          <SimpleLoader />
        ) : channelsError || !slackChannelConfigs ? (
          <ErrorCallout
            errorTitle={t("fetchFailedTitle")}
            errorMsg={t("fetchChannelsFailed", {
              error: channelsError?.message ?? t("unknownError"),
            })}
          />
        ) : !slackChannelConfig ? (
          <ErrorCallout
            errorTitle={t("fetchFailedTitle")}
            errorMsg={t("channelNotFound", { id })}
          />
        ) : docSetsError || !documentSets ? (
          <ErrorCallout
            errorTitle={t("fetchFailedTitle")}
            errorMsg={t("fetchDocumentSetsFailed", {
              error: docSetsError?.message ?? t("unknownError"),
            })}
          />
        ) : agentsError ? (
          <ErrorCallout
            errorTitle={t("fetchFailedTitle")}
            errorMsg={t("fetchAgentsFailed", {
              error: agentsError?.message ?? t("unknownError"),
            })}
          />
        ) : (
          <SlackChannelConfigCreationForm
            slack_bot_id={slackChannelConfig.slack_bot_id}
            documentSets={documentSets}
            personas={agents}
            standardAnswerCategoryResponse={
              isPaidEnterprise
                ? {
                    paidEnterpriseFeaturesEnabled: true,
                    categories: standardAnswerCategories ?? [],
                    ...(stdAnswerError
                      ? { error: { message: String(stdAnswerError) } }
                      : {}),
                  }
                : { paidEnterpriseFeaturesEnabled: false }
            }
            existingSlackChannelConfig={slackChannelConfig}
          />
        )}
      </SettingsLayouts.Body>
    </SettingsLayouts.Root>
  );
}

export default function Page(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params);

  return <EditSlackChannelConfigContent id={params.id} />;
}
