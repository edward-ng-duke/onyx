"use client";

import { ThreeDotsLoader } from "@/components/Loading";
import { errorHandlingFetcher } from "@/lib/fetcher";
import * as SettingsLayouts from "@/layouts/settings-layouts";
import { Text } from "@opal/components";
import Title from "@/components/ui/title";
import { Button } from "@opal/components";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { SWR_KEYS } from "@/lib/swr-keys";
import { ModelPreview } from "@/components/embedding/ModelSelector";
import {
  HostedEmbeddingModel,
  CloudEmbeddingModel,
} from "@/components/embedding/interfaces";
import { SavedSearchSettings } from "@/app/admin/embeddings/interfaces";
import UpgradingPage from "./UpgradingPage";
import { useContext } from "react";
import { SettingsContext } from "@/providers/SettingsProvider";
import CardSection from "@/components/admin/CardSection";
import { ErrorCallout } from "@/components/ErrorCallout";
import { useToastFromQuery } from "@/hooks/useToast";
import { ADMIN_ROUTES } from "@/lib/admin-routes";
import { useAdminRouteI18n } from "@/hooks/useAdminRouteI18n";

const route = ADMIN_ROUTES.INDEX_SETTINGS;

export interface EmbeddingDetails {
  api_key: string;
  custom_config: any;
  default_model_id?: number;
  name: string;
}

function Main() {
  const t = useTranslations("admin.searchSettings");
  const settings = useContext(SettingsContext);
  useToastFromQuery({
    "search-settings": {
      message: `Changed search settings successfully`,
      type: "success",
    },
  });
  const {
    data: currentEmeddingModel,
    isLoading: isLoadingCurrentModel,
    error: currentEmeddingModelError,
  } = useSWR<CloudEmbeddingModel | HostedEmbeddingModel | null>(
    SWR_KEYS.currentSearchSettings,
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );

  const { data: searchSettings, isLoading: isLoadingSearchSettings } =
    useSWR<SavedSearchSettings | null>(
      SWR_KEYS.currentSearchSettings,
      errorHandlingFetcher,
      { refreshInterval: 5000 } // 5 seconds
    );

  const {
    data: futureEmbeddingModel,
    isLoading: isLoadingFutureModel,
    error: futureEmeddingModelError,
  } = useSWR<CloudEmbeddingModel | HostedEmbeddingModel | null>(
    SWR_KEYS.secondarySearchSettings,
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );

  if (
    isLoadingCurrentModel ||
    isLoadingFutureModel ||
    isLoadingSearchSettings
  ) {
    return <ThreeDotsLoader />;
  }

  if (
    currentEmeddingModelError ||
    !currentEmeddingModel ||
    futureEmeddingModelError
  ) {
    return <ErrorCallout errorTitle={t("fetchStatusFailed")} />;
  }

  return (
    <div>
      {!futureEmbeddingModel ? (
        <>
          {settings?.settings.needs_reindexing && (
            <p className="max-w-3xl">{t("outOfDateNotice")}</p>
          )}
          <Title className="mb-6 mt-8 !text-2xl">
            {t("embeddingModelTitle")}
          </Title>

          {currentEmeddingModel ? (
            <ModelPreview model={currentEmeddingModel} display showDetails />
          ) : (
            <Title className="mt-8 mb-4">{t("chooseEmbeddingModel")}</Title>
          )}

          <Title className="mb-2 mt-8 !text-2xl">
            {t("postProcessingTitle")}
          </Title>

          <CardSection className="!mr-auto mt-8 !w-96 shadow-lg bg-background-tint-00 rounded-16">
            {searchSettings && (
              <>
                <div className="px-1 w-full rounded-lg">
                  <div className="space-y-4">
                    <div>
                      <Text as="p" font="main-ui-action">
                        {t("multipassIndexing")}
                      </Text>
                      <Text as="p">
                        {searchSettings.multipass_indexing
                          ? t("enabled")
                          : t("disabled")}
                      </Text>
                    </div>

                    <div>
                      <Text as="p" font="main-ui-action">
                        {t("contextualRag")}
                      </Text>
                      <Text as="p">
                        {searchSettings.enable_contextual_rag
                          ? t("enabled")
                          : t("disabled")}
                      </Text>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardSection>

          <div className="mt-4">
            <Button variant="action" href="/admin/embeddings">
              {t("updateIndexSettings")}
            </Button>
          </div>
        </>
      ) : (
        <UpgradingPage futureEmbeddingModel={futureEmbeddingModel} />
      )}
    </div>
  );
}

export default function Page() {
  const { title } = useAdminRouteI18n(route);
  return (
    <SettingsLayouts.Root>
      <SettingsLayouts.Header title={title} icon={route.icon} divider />
      <SettingsLayouts.Body>
        <Main />
      </SettingsLayouts.Body>
    </SettingsLayouts.Root>
  );
}
