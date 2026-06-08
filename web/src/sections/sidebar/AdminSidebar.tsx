"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useSettingsContext } from "@/providers/SettingsProvider";
import SidebarSection from "@/sections/sidebar/SidebarSection";
import * as SidebarLayouts from "@/layouts/sidebar-layouts";
import { useSidebarFolded, useSidebarState } from "@/layouts/sidebar-layouts";
import { useCustomAnalyticsEnabled } from "@/lib/hooks/useCustomAnalyticsEnabled";
import { useUser } from "@/providers/UserProvider";
import { UserRole } from "@/lib/types";
import { CombinedSettings, Tier } from "@/interfaces/settings";
import { tierAtLeast } from "@/lib/tiers";
import { Divider, InputTypeIn, Spacer, SidebarTab } from "@opal/components";
import { SvgArrowUpCircle, SvgSearch, SvgX } from "@opal/icons";
import {
  useBillingInformation,
  useLicense,
  hasActiveSubscription,
} from "@/lib/billing";
import {
  ADMIN_ROUTES,
  AdminRouteEntry,
  sidebarItem,
} from "@/lib/admin-routes";
import { NEXT_PUBLIC_CLOUD_ENABLED } from "@/lib/constants";
import { markdown } from "@opal/utils";
import useFilter from "@/hooks/useFilter";
import { IconFunctionComponent } from "@opal/types";
import AccountPopover from "@/sections/sidebar/AccountPopover";
import { useTranslations } from "next-intl";

const SECTION_KEYS = {
  UNLABELED: "",
  AGENTS_AND_ACTIONS: "sectionAgentsActions",
  DOCUMENTS_AND_KNOWLEDGE: "sectionDocumentsKnowledge",
  INTEGRATIONS: "sectionIntegrations",
  PERMISSIONS: "sectionPermissions",
  ORGANIZATION: "sectionOrganization",
  USAGE: "sectionUsage",
} as const;

interface SidebarItemEntry {
  section: string;
  name: string;
  icon: IconFunctionComponent;
  link: string;
  error?: boolean;
  disabled?: boolean;
  requiredTier?: Tier;
}

function buildItems(
  isCurator: boolean,
  enableCloud: boolean,
  tier: Tier | undefined,
  settings: CombinedSettings | null,
  customAnalyticsEnabled: boolean,
  hasSubscription: boolean,
  hooksEnabled: boolean,
  routeLabel: (route: AdminRouteEntry) => string,
  upgradePlanLabel: string
): SidebarItemEntry[] {
  const items: SidebarItemEntry[] = [];

  const localizedItem = (route: AdminRouteEntry) => ({
    ...sidebarItem(route),
    name: routeLabel(route),
  });

  const add = (section: string, route: AdminRouteEntry) => {
    items.push({ ...localizedItem(route), section });
  };

  const addGated = (
    section: string,
    route: AdminRouteEntry,
    requiredTier: Tier
  ) => {
    items.push({
      ...localizedItem(route),
      section,
      disabled: !tierAtLeast(tier, requiredTier),
      requiredTier,
    });
  };

  // 1. No header — core configuration (admin only)
  if (!isCurator) {
    add(SECTION_KEYS.UNLABELED, ADMIN_ROUTES.LLM_MODELS);
    add(SECTION_KEYS.UNLABELED, ADMIN_ROUTES.WEB_SEARCH);
    add(SECTION_KEYS.UNLABELED, ADMIN_ROUTES.IMAGE_GENERATION);
    add(SECTION_KEYS.UNLABELED, ADMIN_ROUTES.VOICE);
    add(SECTION_KEYS.UNLABELED, ADMIN_ROUTES.CODE_INTERPRETER);
    add(SECTION_KEYS.UNLABELED, ADMIN_ROUTES.CHAT_PREFERENCES);

    if (!enableCloud && customAnalyticsEnabled) {
      addGated(
        SECTION_KEYS.UNLABELED,
        ADMIN_ROUTES.CUSTOM_ANALYTICS,
        Tier.ENTERPRISE
      );
    }
  }

  // 2. Agents & Actions
  add(SECTION_KEYS.AGENTS_AND_ACTIONS, ADMIN_ROUTES.AGENTS);
  add(SECTION_KEYS.AGENTS_AND_ACTIONS, ADMIN_ROUTES.MCP_ACTIONS);
  add(SECTION_KEYS.AGENTS_AND_ACTIONS, ADMIN_ROUTES.OPENAPI_ACTIONS);

  // 3. Documents & Knowledge
  // Shown even in Lite mode; the pages themselves render a no-indexing notice.
  add(SECTION_KEYS.DOCUMENTS_AND_KNOWLEDGE, ADMIN_ROUTES.INDEXING_STATUS);
  add(SECTION_KEYS.DOCUMENTS_AND_KNOWLEDGE, ADMIN_ROUTES.ADD_CONNECTOR);
  add(SECTION_KEYS.DOCUMENTS_AND_KNOWLEDGE, ADMIN_ROUTES.DOCUMENT_SETS);
  if (!isCurator) {
    items.push({
      ...localizedItem(ADMIN_ROUTES.INDEX_SETTINGS),
      section: SECTION_KEYS.DOCUMENTS_AND_KNOWLEDGE,
      error: settings?.settings.needs_reindexing,
    });
  }

  // 4. Integrations (admin only)
  if (!isCurator) {
    addGated(SECTION_KEYS.INTEGRATIONS, ADMIN_ROUTES.API_KEYS, Tier.BUSINESS);
    add(SECTION_KEYS.INTEGRATIONS, ADMIN_ROUTES.SLACK_BOTS);
    add(SECTION_KEYS.INTEGRATIONS, ADMIN_ROUTES.DISCORD_BOTS);
    if (hooksEnabled) {
      addGated(SECTION_KEYS.INTEGRATIONS, ADMIN_ROUTES.HOOKS, Tier.ENTERPRISE);
    }
  }

  // 5. Permissions
  if (!isCurator) {
    add(SECTION_KEYS.PERMISSIONS, ADMIN_ROUTES.USERS);
    addGated(SECTION_KEYS.PERMISSIONS, ADMIN_ROUTES.GROUPS, Tier.BUSINESS);
    addGated(SECTION_KEYS.PERMISSIONS, ADMIN_ROUTES.SCIM, Tier.ENTERPRISE);
  } else if (tierAtLeast(tier, Tier.BUSINESS)) {
    add(SECTION_KEYS.PERMISSIONS, ADMIN_ROUTES.GROUPS);
  }

  // 6. Organization (admin only)
  if (!isCurator) {
    if (hasSubscription) {
      add(SECTION_KEYS.ORGANIZATION, ADMIN_ROUTES.BILLING);
    }
    addGated(
      SECTION_KEYS.ORGANIZATION,
      ADMIN_ROUTES.TOKEN_RATE_LIMITS,
      Tier.ENTERPRISE
    );
    addGated(SECTION_KEYS.ORGANIZATION, ADMIN_ROUTES.THEME, Tier.BUSINESS);
  }

  // 7. Usage (admin only)
  if (!isCurator) {
    addGated(SECTION_KEYS.USAGE, ADMIN_ROUTES.USAGE, Tier.BUSINESS);
    if (
      settings?.settings.query_history_type !== "disabled" &&
      !settings?.settings.hide_query_history_from_admin_panel
    ) {
      addGated(SECTION_KEYS.USAGE, ADMIN_ROUTES.QUERY_HISTORY, Tier.BUSINESS);
    }
  }

  // 8. Upgrade Plan (admin only, no subscription)
  if (!isCurator && !hasSubscription) {
    items.push({
      section: SECTION_KEYS.UNLABELED,
      name: upgradePlanLabel,
      icon: SvgArrowUpCircle,
      link: ADMIN_ROUTES.BILLING.path,
    });
  }

  return items;
}

/** Preserve section ordering while grouping consecutive items by section. */
function groupBySection(items: SidebarItemEntry[]) {
  const groups: { section: string; items: SidebarItemEntry[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.section === item.section) {
      last.items.push(item);
    } else {
      groups.push({ section: item.section, items: [item] });
    }
  }
  return groups;
}

function AdminSidebarInner() {
  const { setFolded } = useSidebarState();
  const folded = useSidebarFolded();
  const searchRef = useRef<HTMLInputElement>(null);
  const [focusSearch, setFocusSearch] = useState(false);

  useEffect(() => {
    if (focusSearch && !folded && searchRef.current) {
      searchRef.current.focus();
      setFocusSearch(false);
    }
  }, [focusSearch, folded]);
  const pathname = usePathname();
  const { customAnalyticsEnabled } = useCustomAnalyticsEnabled();
  const { user } = useUser();
  const settings = useSettingsContext();
  const tier = settings?.settings.tier;
  const { data: billingData, isLoading: billingLoading } =
    useBillingInformation();
  const { data: licenseData, isLoading: licenseLoading } = useLicense();
  const isCurator =
    user?.role === UserRole.CURATOR || user?.role === UserRole.GLOBAL_CURATOR;
  // Default to true while loading to avoid flashing "Upgrade Plan"
  const hasSubscriptionOrLicense =
    billingLoading || licenseLoading
      ? true
      : Boolean(
          (billingData && hasActiveSubscription(billingData)) ||
          licenseData?.has_license
        );
  // Hooks are ENTERPRISE-only and only available for self-hosted single-tenant.
  const hooksEnabled =
    tierAtLeast(tier, Tier.ENTERPRISE) &&
    (settings?.settings.hooks_enabled ?? false);

  const tRoutes = useTranslations("admin.routes");
  const tNav = useTranslations("nav.sidebar");
  const routeLabel = useCallback(
    (route: AdminRouteEntry) =>
      route.sidebarLabelKey
        ? tRoutes(`${route.sidebarLabelKey}.label`)
        : route.sidebarLabel,
    [tRoutes]
  );

  const allItems = buildItems(
    isCurator,
    NEXT_PUBLIC_CLOUD_ENABLED,
    tier,
    settings,
    customAnalyticsEnabled,
    hasSubscriptionOrLicense,
    hooksEnabled,
    routeLabel,
    tNav("upgradePlan")
  );

  const itemExtractor = useCallback((item: SidebarItemEntry) => item.name, []);

  const { query, setQuery, filtered } = useFilter(allItems, itemExtractor);

  const enabled = filtered.filter((item) => !item.disabled);
  const disabled = filtered.filter((item) => item.disabled);
  const enabledGroups = groupBySection(enabled);
  const disabledGroups = groupBySection(disabled);

  return (
    <>
      <SidebarLayouts.Header>
        {folded ? (
          <SidebarTab
            icon={SvgSearch}
            folded
            onClick={() => {
              setFolded(false);
              setFocusSearch(true);
            }}
          >
            {tNav("searchFolded")}
          </SidebarTab>
        ) : (
          <InputTypeIn
            ref={searchRef}
            variant="internal"
            searchIcon
            placeholder={tNav("searchPlaceholder")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            clearButton
          />
        )}
      </SidebarLayouts.Header>

      <SidebarLayouts.Body scrollKey="admin-sidebar">
        {enabledGroups.map((group, groupIndex) => {
          const tabs = group.items.map(({ link, icon, name }) => (
            <SidebarTab
              key={link}
              icon={icon}
              href={link}
              selected={pathname.startsWith(link)}
            >
              {name}
            </SidebarTab>
          ));

          if (!group.section) {
            return <div key={groupIndex}>{tabs}</div>;
          }

          return (
            <SidebarSection key={groupIndex} title={tNav(group.section as any)}>
              {tabs}
            </SidebarSection>
          );
        })}

        {disabledGroups.length > 0 && <Divider paddingPerpendicular="fit" />}

        {disabledGroups.map((group, groupIndex) => (
          <SidebarSection
            key={`disabled-${groupIndex}`}
            title={group.section ? tNav(group.section as any) : ""}
            disabled
          >
            {group.items.map(({ link, icon, name, requiredTier }) => (
              <SidebarTab
                key={link}
                disabled
                icon={icon}
                tooltip={markdown(
                  requiredTier === Tier.ENTERPRISE
                    ? "This feature is available on the [Enterprise version of Onyx](/admin/billing) only."
                    : "This feature is available on the [Business or Enterprise version of Onyx](/admin/billing) only."
                )}
              >
                {name}
              </SidebarTab>
            ))}
          </SidebarSection>
        ))}
      </SidebarLayouts.Body>

      <SidebarLayouts.Footer>
        {!folded && (
          <>
            <Divider paddingPerpendicular="fit" />
            <Spacer rem={0.5} />
          </>
        )}
        <SidebarTab
          icon={SvgX}
          href="/app"
          variant="sidebar-light"
          folded={folded}
        >
          {tNav("exitAdminPanel")}
        </SidebarTab>
        <AccountPopover folded={folded} />
      </SidebarLayouts.Footer>
    </>
  );
}

export default function AdminSidebar() {
  return (
    <SidebarLayouts.Root>
      <AdminSidebarInner />
    </SidebarLayouts.Root>
  );
}
