"use client";

import { useState } from "react";
import CardSection from "@/components/admin/CardSection";
import { Button } from "@opal/components";
import InputTypeIn from "@/refresh-components/inputs/InputTypeIn";
import useSWR from "swr";
import { SWR_KEYS } from "@/lib/swr-keys";
import { ThreeDotsLoader } from "@/components/Loading";
import * as SettingsLayouts from "@/layouts/settings-layouts";
import Text from "@/refresh-components/texts/Text";
import { cn } from "@opal/utils";
import { SvgLock } from "@opal/icons";
import { ADMIN_ROUTES } from "@/lib/admin-routes";
import { useAdminRouteI18n } from "@/hooks/useAdminRouteI18n";
import { useTranslations } from "next-intl";

const route = ADMIN_ROUTES.DOCUMENT_PROCESSING;

function Main() {
  const t = useTranslations("admin.documentProcessing");
  const {
    data: isApiKeySet,
    error,
    mutate,
    isLoading,
  } = useSWR<{
    unstructured_api_key: string | null;
  }>(SWR_KEYS.unstructuredApiKeySet, (url: string) =>
    fetch(url).then((res) => res.json())
  );

  const [apiKey, setApiKey] = useState("");

  const handleSave = async () => {
    try {
      await fetch(
        `/api/search-settings/upsert-unstructured-api-key?unstructured_api_key=${apiKey}`,
        {
          method: "PUT",
        }
      );
    } catch (error) {
      console.error("Failed to save API key:", error);
    }
    mutate();
  };

  const handleDelete = async () => {
    try {
      await fetch("/api/search-settings/delete-unstructured-api-key", {
        method: "DELETE",
      });
      setApiKey("");
    } catch (error) {
      console.error("Failed to delete API key:", error);
    }
    mutate();
  };

  if (isLoading) {
    return <ThreeDotsLoader />;
  }
  return (
    <div className="pb-36">
      <div className="w-full max-w-2xl">
        <CardSection className="flex flex-col gap-2">
          <Text
            as="p"
            headingH3
            text05
            className="border-b border-border-01 pb-2"
          >
            {t("sectionTitle")}
          </Text>

          <div className="flex flex-col gap-2">
            <Text as="p" mainContentBody text04 className="leading-relaxed">
              {t("description")}
            </Text>
            <Text as="p" mainContentMuted text03>
              <span className="font-main-ui-action text-text-03">
                {t("noteLabel")}
              </span>{" "}
              {t("noteBody")}
            </Text>
            <Text as="p" mainContentBody text04 className="leading-relaxed">
              {t("learnMorePrefix")}{" "}
              <a
                href="https://docs.unstructured.io/welcome"
                target="_blank"
                rel="noopener noreferrer"
                className="text-action-link-05 underline-offset-4 hover:underline"
              >
                {t("learnMoreLink")}
              </a>
              {t("learnMoreSuffix")}
            </Text>
            <div className="pt-1.5">
              {isApiKeySet ? (
                <div
                  className={cn(
                    "flex",
                    "items-center",
                    "gap-0.5",
                    "rounded-08",
                    "border",
                    "border-border-01",
                    "bg-background-neutral-01",
                    "px-2",
                    "py-1.5"
                  )}
                >
                  <Text
                    as="p"
                    mainUiMuted
                    text03
                    className="flex-1 tracking-[0.3em] text-text-03"
                  >
                    ••••••••••••••••
                  </Text>
                  <SvgLock className="h-4 w-4 stroke-text-03" aria-hidden />
                </div>
              ) : (
                <InputTypeIn
                  placeholder={t("apiKeyPlaceholder")}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              )}
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
              {isApiKeySet ? (
                <>
                  <Button variant="danger" onClick={handleDelete}>
                    {t("deleteApiKey")}
                  </Button>
                  <Text as="p" mainContentBody text04 className="sm:mt-0">
                    {t("deleteBeforeUpdate")}
                  </Text>
                </>
              ) : (
                <Button variant="action" onClick={handleSave}>
                  {t("saveApiKey")}
                </Button>
              )}
            </div>
          </div>
        </CardSection>
      </div>
    </div>
  );
}

export default function Page() {
  const { title } = useAdminRouteI18n(route);
  return (
    <SettingsLayouts.Root>
      <SettingsLayouts.Header icon={route.icon} title={title} divider />
      <SettingsLayouts.Body>
        <Main />
      </SettingsLayouts.Body>
    </SettingsLayouts.Root>
  );
}
