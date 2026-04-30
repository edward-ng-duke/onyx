/**
 * Translation keys for the chat welcome greetings.
 *
 * The actual strings are stored under `chat.greetings.*` in the i18n
 * messages files; consumers should use a translator (e.g. `useTranslations`)
 * to resolve them.
 */
export const GREETING_MESSAGE_KEYS = ["howCanIHelp", "letsGetStarted"] as const;

export type GreetingMessageKey = (typeof GREETING_MESSAGE_KEYS)[number];

export function getRandomGreetingKey(): GreetingMessageKey {
  return GREETING_MESSAGE_KEYS[
    Math.floor(Math.random() * GREETING_MESSAGE_KEYS.length)
  ] as GreetingMessageKey;
}

/**
 * The English-locale greeting messages. Kept in sync with
 * `chat.greetings.*` entries in `web/src/i18n/messages/en.json`.
 *
 * Exported for Playwright e2e tests, which run against the default
 * (English) locale and need the literal strings to assert on rendered
 * UI. Production code should resolve greetings via `useTranslations`
 * instead.
 */
export const GREETING_MESSAGES = [
  "How can I help?",
  "Let's get started.",
] as const;
