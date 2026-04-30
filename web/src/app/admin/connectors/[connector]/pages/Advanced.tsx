import React from "react";
import NumberInput from "./ConnectorInput/NumberInput";
import { TextFormField } from "@/components/Field";
import { Button } from "@opal/components";
import { SvgTrash } from "@opal/icons";
import { useTranslations } from "next-intl";

interface AdvancedFormPageProps {
  defaultPruneFreqHours?: number;
}

export default function AdvancedFormPage({
  defaultPruneFreqHours = 600,
}: AdvancedFormPageProps) {
  const t = useTranslations("admin.connectors.add");
  const tCommon = useTranslations("common.actions");
  return (
    <div className="py-4 flex flex-col gap-y-6 rounded-lg max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-text-800">
        {t("advancedConfiguration")}
      </h2>

      <NumberInput
        description={t("pruneFreqDescription", {
          hours: defaultPruneFreqHours,
          days: Math.round(defaultPruneFreqHours / 24),
        })}
        label={t("pruneFreqLabel")}
        name="pruneFreq"
      />

      <NumberInput
        description={t("refreshFreqDescription")}
        label={t("refreshFreqLabel")}
        name="refreshFreq"
      />

      <TextFormField
        type="date"
        subtext={t("indexingStartSubtext")}
        optional
        label={t("indexingStartLabel")}
        name="indexingStart"
      />
      <div className="mt-4 flex w-full mx-auto max-w-2xl justify-start">
        <Button variant="danger" icon={SvgTrash} type="submit">
          {tCommon("reset")}
        </Button>
      </div>
    </div>
  );
}
