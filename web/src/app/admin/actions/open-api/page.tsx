"use client";

import { useTranslations } from "next-intl";
import * as SettingsLayouts from "@/layouts/settings-layouts";
import OpenApiPageContent from "@/sections/actions/OpenApiPageContent";
import { ADMIN_ROUTES } from "@/lib/admin-routes";
import { useAdminRouteI18n } from "@/hooks/useAdminRouteI18n";

const route = ADMIN_ROUTES.OPENAPI_ACTIONS;

export default function Main() {
  const { title } = useAdminRouteI18n(route);
  const t = useTranslations("admin.actions.openApi");
  return (
    <SettingsLayouts.Root>
      <SettingsLayouts.Header
        icon={route.icon}
        title={title}
        description={t("headerDescription")}
        divider
      />
      <SettingsLayouts.Body>
        <OpenApiPageContent />
      </SettingsLayouts.Body>
    </SettingsLayouts.Root>
  );
}
