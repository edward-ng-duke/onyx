// Project-level i18n configuration for next-intl.
//
// next-intl v4 does NOT export `defineConfig` from `next-intl/server` (the v3
// plugin auto-config conventions were dropped). The plugin is wired up in
// `next.config.js` via `createNextIntlPlugin("./src/i18n/request.ts")`, and the
// per-request locale + messages are resolved in `src/i18n/request.ts`.
//
// This file therefore acts as the canonical declaration of the supported
// locales / default locale for the app. Application code (e.g. the helper
// in `src/i18n/getLocale.ts`) and any future language-switcher UI should
// import from here so that adding a locale is a single-file change.

export const locales = ["en", "zh"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

const config = {
  defaultLocale,
  locales,
} as const;

export default config;
