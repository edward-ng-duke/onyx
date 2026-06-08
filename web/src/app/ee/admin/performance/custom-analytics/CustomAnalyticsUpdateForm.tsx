"use client";

import { useTranslations } from "next-intl";
import { Label, SubLabel } from "@/components/Field";
import { toast } from "@/hooks/useToast";
import { SettingsContext } from "@/providers/SettingsProvider";
import { Button, Text } from "@opal/components";
import { markdown } from "@opal/utils";
import { Callout } from "@/components/ui/callout";
import { useContext, useState } from "react";
import InputTextArea from "@/refresh-components/inputs/InputTextArea";
import { Spacer } from "@opal/components";

export function CustomAnalyticsUpdateForm() {
  const t = useTranslations("admin.performance.customAnalytics");
  const settings = useContext(SettingsContext);
  const customAnalyticsScript = settings?.customAnalyticsScript;

  const [newCustomAnalyticsScript, setNewCustomAnalyticsScript] =
    useState<string>(customAnalyticsScript || "");
  const [secretKey, setSecretKey] = useState<string>("");

  if (!settings) {
    return <Callout type="danger" title={t("settingsLoadFailed")}></Callout>;
  }

  return (
    <div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();

          const response = await fetch(
            "/api/admin/enterprise-settings/custom-analytics-script",
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                script: newCustomAnalyticsScript.trim(),
                secret_key: secretKey,
              }),
            }
          );
          if (response.ok) {
            toast.success(t("updateSuccess"));
          } else {
            const errorMsg = (await response.json()).detail;
            toast.error(t("updateFailed", { error: errorMsg }));
          }
          setSecretKey("");
        }}
      >
        <div className="mb-4">
          <Label>{t("scriptLabel")}</Label>
          <Text as="p">{t("scriptHelp")}</Text>
          <Spacer rem={0.75} />
          <Text as="p">{markdown(t("scriptHelpDetail"))}</Text>
          <Spacer rem={0.5} />
          <InputTextArea
            value={newCustomAnalyticsScript}
            onChange={(event) =>
              setNewCustomAnalyticsScript(event.target.value)
            }
          />
        </div>

        <Label>{t("secretKeyLabel")}</Label>
        <SubLabel>
          <>
            {t("secretKeyHelpPrefix")}
            <i>CUSTOM_ANALYTICS_SECRET_KEY</i>
            {t("secretKeyHelpSuffix")}
          </>
        </SubLabel>
        <input
          className={`
            border
            border-border
            rounded
            w-full
            py-2
            px-3
            mt-1`}
          type="password"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
        />
        <Spacer rem={1} />
        <Button type="submit">{t("submitButton")}</Button>
      </form>
    </div>
  );
}
