"use client";

import React, { useContext } from "react";
import { useTranslations } from "next-intl";
import { SettingsContext } from "@/providers/SettingsProvider";
import Text from "@/refresh-components/texts/Text";

export default function LoginText() {
  const settings = useContext(SettingsContext);
  const t = useTranslations("auth");
  const appName =
    (settings && settings?.enterpriseSettings?.application_name) || "Onyx";
  return (
    <div className="w-full flex flex-col ">
      <Text as="p" headingH2 text05>
        {t("signIn.welcome", { appName })}
      </Text>
      <Text as="p" text03 mainUiMuted>
        {t("common.tagline")}
      </Text>
    </div>
  );
}
