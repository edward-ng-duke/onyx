"use client";

import { useTransition } from "react";
import { useLocale } from "next-intl";

import InputSelect from "@/refresh-components/inputs/InputSelect";
import { setLanguage } from "@/lib/userSettings";
import { setLocaleCookieAction } from "@/components/i18n/setLocaleAction";
import type { Locale } from "../../../next-intl.config";

/**
 * Client-side dropdown for switching the UI locale.
 *
 * - Reflects the current locale via `useLocale()` from next-intl.
 * - On change: writes the NEXT_LOCALE cookie via `setLocaleCookieAction`,
 *   syncs the choice to the backend via `setLanguage` (best-effort — anonymous
 *   users may receive an error which we intentionally swallow), then reloads
 *   so RSC re-renders with the new locale.
 * - Disabled while the transition is pending so the user can't fire multiple
 *   switches in flight.
 */
export function LanguageSelect() {
  const locale = useLocale() as Locale;
  const [pending, startTransition] = useTransition();

  return (
    <InputSelect
      value={locale}
      disabled={pending}
      onValueChange={(value) => {
        const next = value as Locale;
        if (next === locale) return;
        startTransition(async () => {
          await setLocaleCookieAction(next);
          // Sync to backend; ignore errors (anonymous users still allowed to switch).
          try {
            await setLanguage(next);
          } catch {
            // intentional no-op
          }
          window.location.reload();
        });
      }}
    >
      <InputSelect.Trigger />
      <InputSelect.Content>
        <InputSelect.Item value="en">English</InputSelect.Item>
        <InputSelect.Item value="zh">中文</InputSelect.Item>
      </InputSelect.Content>
    </InputSelect>
  );
}
