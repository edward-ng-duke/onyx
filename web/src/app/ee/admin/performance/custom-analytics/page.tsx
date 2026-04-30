"use client";

import { useTranslations } from "next-intl";
import * as SettingsLayouts from "@/layouts/settings-layouts";
import { CUSTOM_ANALYTICS_ENABLED } from "@/lib/constants";
import { Callout } from "@/components/ui/callout";
import { ADMIN_ROUTES } from "@/lib/admin-routes";
import { useAdminRouteI18n } from "@/hooks/useAdminRouteI18n";
import { Text } from "@opal/components";
import Spacer from "@/refresh-components/Spacer";
import { CustomAnalyticsUpdateForm } from "./CustomAnalyticsUpdateForm";

const route = ADMIN_ROUTES.CUSTOM_ANALYTICS;

function Main() {
  const t = useTranslations("admin.performance.customAnalytics");
  if (!CUSTOM_ANALYTICS_ENABLED) {
    return (
      <div>
        <div className="mt-4">
          <Callout type="danger" title={t("notEnabledTitle")}>
            {t("notEnabledBodyPrefix")}
            <i>CUSTOM_ANALYTICS_SECRET_KEY</i>
            {t("notEnabledBodySuffix")}
          </Callout>
        </div>
      </div>
    );
  }

  return (
    <div>
      <Text as="p">{t("intro")}</Text>
      <Spacer rem={2} />

      <CustomAnalyticsUpdateForm />
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
