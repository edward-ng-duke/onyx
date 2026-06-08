"use client";

import CardSection from "@/components/admin/CardSection";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { SlackTokensForm } from "./SlackTokensForm";
import { SettingsLayouts } from "@opal/layouts";
import { SvgSlack } from "@opal/logos";

export function NewSlackBotForm() {
  const t = useTranslations("admin.bots");
  const [formValues] = useState({
    name: "",
    enabled: true,
    bot_token: "",
    app_token: "",
    user_token: "",
  });
  const router = useRouter();

  return (
    <SettingsLayouts.Root>
      <SettingsLayouts.Header
        icon={SvgSlack}
        title={t("newSlackBotPageTitle")}
        divider
        backButton
      />
      <SettingsLayouts.Body>
        <CardSection>
          <div className="p-4">
            <SlackTokensForm
              isUpdate={false}
              initialValues={formValues}
              router={router}
            />
          </div>
        </CardSection>
      </SettingsLayouts.Body>
    </SettingsLayouts.Root>
  );
}
