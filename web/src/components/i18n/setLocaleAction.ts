"use server";
import { cookies } from "next/headers";

import { locales, type Locale } from "../../../next-intl.config";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

/**
 * Persist the user's UI locale to the NEXT_LOCALE cookie.
 *
 * Server-rendered pages pick the value up via `getLocale()` in
 * `src/i18n/getLocale.ts`. The cookie is non-HTTPOnly so client code can
 * read the current selection if needed.
 *
 * Cross-device persistence is not wired yet — `setLanguage()` from
 * `@/lib/userSettings` POSTs the choice to the backend, but the handler
 * currently discards it (see web i18n follow-up T4 / T4-bis). Today this
 * cookie is the single source of truth for UI language.
 */
export async function setLocaleCookieAction(locale: Locale): Promise<void> {
  // Defense in depth: the `Locale` type is erased at the wire boundary, so a
  // crafted server-action invocation could send any string. Silently ignore
  // anything not in the supported set rather than writing it.
  if (!(locales as readonly string[]).includes(locale)) {
    return;
  }
  const c = await cookies();
  c.set("NEXT_LOCALE", locale, {
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
    sameSite: "lax",
    httpOnly: false,
    secure: process.env.NODE_ENV === "production",
  });
}
