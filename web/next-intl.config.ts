// Project-level i18n configuration for next-intl.
//
// next-intl v4 does NOT export `defineConfig` from `next-intl/server` (the v3
// plugin auto-config conventions were dropped). The plugin is wired up in
// `next.config.js` via `createNextIntlPlugin("./src/i18n/request.ts")`, and the
// per-request locale + messages are resolved in `src/i18n/request.ts`.
//
// This file is the single source of truth for the supported locales / default
// locale of the app. Application code (e.g. `src/i18n/getLocale.ts`,
// `src/i18n/request.ts`, and any future language-switcher UI) imports from
// here so that adding a locale is a single-file change.

export const locales = ["en", "zh"] as const;
export const defaultLocale: (typeof locales)[number] = "en";
export type Locale = (typeof locales)[number];

const config = {
  defaultLocale,
  locales,
} as const;

export default config;
