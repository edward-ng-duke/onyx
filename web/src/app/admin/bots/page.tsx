"use client";

import { ErrorCallout } from "@/components/ErrorCallout";
import { ThreeDotsLoader } from "@/components/Loading";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import { SlackBotTable } from "./SlackBotTable";
import { useSlackBots } from "./[bot-id]/hooks";
import { SettingsLayouts } from "@opal/layouts";
import { ADMIN_ROUTES } from "@/lib/admin-routes";
import { useAdminRouteI18n } from "@/hooks/useAdminRouteI18n";
import { Button } from "@opal/components";
import { SvgPlusCircle } from "@opal/icons";
import { DOCS_ADMINS_PATH } from "@/lib/constants";
import { useTranslations } from "next-intl";

const route = ADMIN_ROUTES.SLACK_BOTS;

function Main() {
  const t = useTranslations("admin.bots");
  const {
    data: slackBots,
    isLoading: isSlackBotsLoading,
    error: slackBotsError,
  } = useSlackBots();

  if (isSlackBotsLoading) {
    return <ThreeDotsLoader />;
  }

  if (slackBotsError || !slackBots) {
    const errorMsg =
      slackBotsError?.info?.message ||
      slackBotsError?.info?.detail ||
      t("unknownError");

    return (
      <ErrorCallout
        errorTitle={t("errorLoadingApps")}
        errorMsg={`${errorMsg}`}
      />
    );
  }

  return (
    <div className="mb-8">
      <p className="mb-2 text-sm text-muted-foreground">
        {t("headerDescriptionIntro")}
      </p>

      <div className="mb-2">
        <ul className="list-disc mt-2 ml-4 text-sm text-muted-foreground">
          <li>{t("bulletAutoAnswer")}</li>
          <li>{t("bulletDocumentSets")}</li>
          <li>{t("bulletDirectMessage")}</li>
        </ul>
      </div>

      <p className="mb-6 text-sm text-muted-foreground">
        {t("guidePrefix")}{" "}
        <a
          className="text-blue-500 hover:underline"
          href={`${DOCS_ADMINS_PATH}/getting_started/slack_bot_setup`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("guideLink")}{" "}
        </a>
        {t("guideSuffix")}
      </p>

      <Button
        icon={SvgPlusCircle}
        prominence="secondary"
        href="/admin/bots/new"
      >
        {t("newSlackBot")}
      </Button>

      <SlackBotTable slackBots={slackBots} />
    </div>
  );
}

export default function Page() {
  const { title } = useAdminRouteI18n(route);
  return (
    <SettingsLayouts.Root>
      <SettingsLayouts.Header icon={route.icon} title={title} divider />
      <SettingsLayouts.Body>
        <InstantSSRAutoRefresh />
        <Main />
      </SettingsLayouts.Body>
    </SettingsLayouts.Root>
  );
}
