"use client";

import { useTranslations } from "next-intl";
import { AdminRouteEntry } from "@/lib/admin-routes";

/**
 * Resolves the localized sidebar label and page-header title for an
 * `AdminRouteEntry`. When a route declares `sidebarLabelKey` / `titleKey`,
 * the value is looked up from the `admin.routes.<key>.label` /
 * `admin.routes.<key>.title` namespace; otherwise the literal English
 * `sidebarLabel` / `title` from the route is returned as a fallback.
 */
export function useAdminRouteI18n(route: AdminRouteEntry): {
  sidebarLabel: string;
  title: string;
} {
  const t = useTranslations("admin.routes");
  const sidebarLabel = route.sidebarLabelKey
    ? t(`${route.sidebarLabelKey}.label`)
    : route.sidebarLabel;
  const title = route.titleKey
    ? t(`${route.titleKey}.title`)
    : route.title;
  return { sidebarLabel, title };
}
