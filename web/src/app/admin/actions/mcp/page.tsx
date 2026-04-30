"use client";

import { useTranslations } from "next-intl";
import MCPPageContent from "@/sections/actions/MCPPageContent";
import * as SettingsLayouts from "@/layouts/settings-layouts";
import { ADMIN_ROUTES } from "@/lib/admin-routes";
import { useAdminRouteI18n } from "@/hooks/useAdminRouteI18n";

const route = ADMIN_ROUTES.MCP_ACTIONS;

export default function Main() {
  const { title } = useAdminRouteI18n(route);
  const t = useTranslations("admin.actions.mcp");
  return (
    <SettingsLayouts.Root>
      <SettingsLayouts.Header
        icon={route.icon}
        title={title}
        description={t("headerDescription")}
        divider
      />
      <SettingsLayouts.Body>
        <MCPPageContent />
      </SettingsLayouts.Body>
    </SettingsLayouts.Root>
  );
}
