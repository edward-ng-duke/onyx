"use server";
import { cookies } from "next/headers";
import type { Locale } from "../../../next-intl.config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Persist the user's UI locale to the NEXT_LOCALE cookie.
 *
 * Writes a non-HTTPOnly cookie so the value is visible to client-side
 * code if anything else needs to read it. Server-rendered pages pick it
 * up via getLocale() in src/i18n/getLocale.ts.
 *
 * NOTE: This only handles the cookie side. The caller (e.g. LanguageSelect)
 * also calls setLanguage() from @/lib/userSettings to sync the choice to
 * the backend user_preferences JSONB column for cross-device persistence.
 */
export async function setLocaleCookieAction(locale: Locale): Promise<void> {
  const c = await cookies();
  c.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
    httpOnly: false,
  });
}
