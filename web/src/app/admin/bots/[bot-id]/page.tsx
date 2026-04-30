"use client";

import { use } from "react";
import { useTranslations } from "next-intl";
import { ErrorCallout } from "@/components/ErrorCallout";
import SimpleLoader from "@/refresh-components/loaders/SimpleLoader";
import SlackChannelConfigsTable from "./SlackChannelConfigsTable";
import { useSlackBot, useSlackChannelConfigsByBot } from "./hooks";
import { ExistingSlackBotForm } from "../SlackBotUpdateForm";
import * as SettingsLayouts from "@/layouts/settings-layouts";
import { SvgSlack } from "@opal/logos";
import { getErrorMsg } from "@/lib/error";

function SlackBotEditContent({ botId }: { botId: string }) {
  const t = useTranslations("admin.bots");
  const {
    data: slackBot,
    isLoading: isSlackBotLoading,
    error: slackBotError,
    refreshSlackBot,
  } = useSlackBot(Number(botId));

  const {
    data: slackChannelConfigs,
    isLoading: isSlackChannelConfigsLoading,
    error: slackChannelConfigsError,
    refreshSlackChannelConfigs,
  } = useSlackChannelConfigsByBot(Number(botId));

  if (isSlackBotLoading || isSlackChannelConfigsLoading) {
    return <SimpleLoader />;
  }

  if (slackBotError || !slackBot) {
    return (
      <ErrorCallout
        errorTitle={t("fetchSlackBotFailedTitle")}
        errorMsg={t("fetchSlackBotFailedMsg", {
          botId,
          error: getErrorMsg(slackBotError),
        })}
      />
    );
  }

  if (slackChannelConfigsError || !slackChannelConfigs) {
    return (
      <ErrorCallout
        errorTitle={t("fetchSlackBotFailedTitle")}
        errorMsg={t("fetchSlackBotFailedMsg", {
          botId,
          error: getErrorMsg(slackChannelConfigsError),
        })}
      />
    );
  }

  return (
    <>
      <ExistingSlackBotForm
        existingSlackBot={slackBot}
        refreshSlackBot={refreshSlackBot}
      />

      <div className="mt-8">
        <SlackChannelConfigsTable
          slackBotId={slackBot.id}
          slackChannelConfigs={slackChannelConfigs}
          refresh={refreshSlackChannelConfigs}
        />
      </div>
    </>
  );
}

export default function Page({
  params,
}: {
  params: Promise<{ "bot-id": string }>;
}) {
  const unwrappedParams = use(params);
  const t = useTranslations("admin.bots");

  return (
    <SettingsLayouts.Root>
      <SettingsLayouts.Header
        icon={SvgSlack}
        title={t("editSlackBotPageTitle")}
        backButton
        divider
      />
      <SettingsLayouts.Body>
        <SlackBotEditContent botId={unwrappedParams["bot-id"]} />
      </SettingsLayouts.Body>
    </SettingsLayouts.Root>
  );
}
