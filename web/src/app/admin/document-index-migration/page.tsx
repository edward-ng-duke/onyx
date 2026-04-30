"use client";

import { useState } from "react";
import useSWR from "swr";
import { useTranslations } from "next-intl";
import { SWR_KEYS } from "@/lib/swr-keys";
import * as SettingsLayouts from "@/layouts/settings-layouts";
import { ADMIN_ROUTES } from "@/lib/admin-routes";
import { useAdminRouteI18n } from "@/hooks/useAdminRouteI18n";

const route = ADMIN_ROUTES.INDEX_MIGRATION;

import Card from "@/refresh-components/cards/Card";
import { Content, ContentAction } from "@opal/layouts";
import Text from "@/refresh-components/texts/Text";
import InputSelect from "@/refresh-components/inputs/InputSelect";
import Button from "@/refresh-components/buttons/Button";
import { errorHandlingFetcher } from "@/lib/fetcher";

interface MigrationStatus {
  total_chunks_migrated: number;
  created_at: string | null;
  migration_completed_at: string | null;
  approx_chunk_count_in_vespa: number | null;
}

interface RetrievalStatus {
  enable_opensearch_retrieval: boolean;
  toggling_retrieval_is_disabled?: boolean;
}

function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString();
}

function MigrationStatusSection() {
  const t = useTranslations("admin.documentIndexMigration");
  const { data, isLoading, error } = useSWR<MigrationStatus>(
    SWR_KEYS.opensearchMigrationStatus,
    errorHandlingFetcher
  );

  if (isLoading) {
    return (
      <Card>
        <Text headingH3>{t("migrationStatus")}</Text>
        <Text mainUiBody text03>
          {t("loading")}
        </Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Text headingH3>{t("migrationStatus")}</Text>
        <Text mainUiBody text03>
          {t("loadStatusFailed")}
        </Text>
      </Card>
    );
  }

  const hasStarted = data?.created_at != null;
  const hasCompleted = data?.migration_completed_at != null;
  const isOngoing = hasStarted && !hasCompleted;

  const totalChunksMigrated = data?.total_chunks_migrated ?? 0;
  const approxTotalChunks = data?.approx_chunk_count_in_vespa;

  // Calculate percentage progress if migration is ongoing and we have approx
  // total chunks.
  const shouldShowProgress = isOngoing && approxTotalChunks;
  const progressPercentage = shouldShowProgress
    ? Math.min(99, (totalChunksMigrated / approxTotalChunks) * 100)
    : null;

  return (
    <Card>
      <Text headingH3>{t("migrationStatus")}</Text>

      <ContentAction
        title={t("started")}
        sizePreset="main-ui"
        variant="section"
        rightChildren={
          <Text mainUiBody>
            {hasStarted ? formatTimestamp(data.created_at!) : t("notStarted")}
          </Text>
        }
      />

      <ContentAction
        title={t("chunksMigrated")}
        sizePreset="main-ui"
        variant="section"
        rightChildren={
          <Text mainUiBody>
            {progressPercentage !== null
              ? t("chunksProgress", {
                  count: totalChunksMigrated,
                  percent: Math.round(progressPercentage),
                })
              : String(totalChunksMigrated)}
          </Text>
        }
      />

      <ContentAction
        title={t("completed")}
        sizePreset="main-ui"
        variant="section"
        rightChildren={
          <Text mainUiBody>
            {hasCompleted
              ? formatTimestamp(data.migration_completed_at!)
              : hasStarted
                ? t("inProgress")
                : t("notStarted")}
          </Text>
        }
      />
    </Card>
  );
}

function RetrievalSourceSection() {
  const t = useTranslations("admin.documentIndexMigration");
  const { data, isLoading, error, mutate } = useSWR<RetrievalStatus>(
    SWR_KEYS.opensearchMigrationRetrieval,
    errorHandlingFetcher
  );
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const serverValue = data?.enable_opensearch_retrieval
    ? "opensearch"
    : "vespa";
  const currentValue = selectedSource ?? serverValue;
  const hasChanges = selectedSource !== null && selectedSource !== serverValue;
  const togglingDisabled = data?.toggling_retrieval_is_disabled ?? false;

  async function handleUpdate() {
    setUpdating(true);
    try {
      const response = await fetch(SWR_KEYS.opensearchMigrationRetrieval, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enable_opensearch_retrieval: currentValue === "opensearch",
        }),
      });
      if (!response.ok) {
        throw new Error("Failed to update retrieval setting");
      }
      await mutate();
      setSelectedSource(null);
    } finally {
      setUpdating(false);
    }
  }

  if (isLoading) {
    return (
      <Card>
        <Text headingH3>{t("retrievalSource")}</Text>
        <Text mainUiBody text03>
          {t("loading")}
        </Text>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <Text headingH3>{t("retrievalSource")}</Text>
        <Text mainUiBody text03>
          {t("loadRetrievalFailed")}
        </Text>
      </Card>
    );
  }

  return (
    <Card>
      <Content
        title={t("retrievalSource")}
        description={t("retrievalSourceDescription")}
        sizePreset="main-ui"
        variant="section"
      />

      <InputSelect
        value={currentValue}
        onValueChange={setSelectedSource}
        disabled={updating || togglingDisabled}
      >
        <InputSelect.Trigger
          placeholder={t("selectRetrievalSourcePlaceholder")}
        />
        <InputSelect.Content>
          <InputSelect.Item value="vespa">{t("vespa")}</InputSelect.Item>
          <InputSelect.Item value="opensearch">
            {t("opensearch")}
          </InputSelect.Item>
        </InputSelect.Content>
      </InputSelect>

      {togglingDisabled && (
        <Text mainUiBody text03>
          {t("togglingDisabled")}
        </Text>
      )}

      {hasChanges && (
        // TODO(@raunakab): migrate to opal Button once className/iconClassName is resolved
        <Button
          className="self-center"
          onClick={handleUpdate}
          disabled={updating}
        >
          {updating ? t("updating") : t("updateSettings")}
        </Button>
      )}
    </Card>
  );
}

export default function Page() {
  const { title } = useAdminRouteI18n(route);
  const t = useTranslations("admin.documentIndexMigration");
  return (
    <SettingsLayouts.Root>
      <SettingsLayouts.Header
        icon={route.icon}
        title={title}
        description={t("headerDescription")}
        divider
      />
      <SettingsLayouts.Body>
        <MigrationStatusSection />
        <RetrievalSourceSection />
      </SettingsLayouts.Body>
    </SettingsLayouts.Root>
  );
}
