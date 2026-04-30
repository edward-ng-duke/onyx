import "@testing-library/jest-dom";
import { TextEncoder, TextDecoder } from "util";

// next-intl global mock.
//
// Most components on the i18n branch call `useTranslations(...)` directly
// without their tests wrapping in <NextIntlClientProvider>. Wiring a real
// provider into every test file is high-churn for zero benefit — many
// existing tests assert on the literal English copy that components used
// to render verbatim. We resolve keys via the real `en.json` so those
// assertions keep working transparently. Tests that want a different
// locale or want to assert keys directly can override per-file with
// `jest.mock("next-intl", ...)`.
jest.mock("next-intl", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const en = require("../../src/i18n/messages/en.json");

  function resolve(namespace: string | undefined, key: string): unknown {
    const path = namespace ? `${namespace}.${key}` : key;
    let cursor: unknown = en;
    for (const segment of path.split(".")) {
      if (cursor && typeof cursor === "object" && segment in cursor) {
        cursor = (cursor as Record<string, unknown>)[segment];
      } else {
        return path;
      }
    }
    return cursor;
  }

  function applyIcu(
    template: string,
    values: Record<string, unknown> = {}
  ): string {
    // Minimal ICU substitution: replaces top-level {name} and resolves
    // simple plural blocks `{count, plural, one {…} other {…}}`. Anything
    // beyond that returns the template unchanged — good enough for tests.
    let out = template;
    out = out.replace(
      /\{(\w+),\s*plural,([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g,
      (_full, name: string, body: string) => {
        const n = Number(values[name]);
        const oneMatch = body.match(/one\s*\{([^{}]*)\}/);
        const otherMatch = body.match(/other\s*\{([^{}]*)\}/);
        const branch =
          n === 1 && oneMatch ? oneMatch[1]! : (otherMatch?.[1] ?? "");
        return branch.replace(/#/g, String(values[name] ?? ""));
      }
    );
    out = out.replace(/\{(\w+)\}/g, (_, name: string) =>
      values[name] === undefined ? `{${name}}` : String(values[name])
    );
    return out;
  }

  function makeTranslator(namespace?: string) {
    function t(key: string, values?: Record<string, unknown>): string {
      const resolved = resolve(namespace, key);
      if (typeof resolved !== "string") return namespace ? `${namespace}.${key}` : key;
      return applyIcu(resolved, values);
    }
    t.rich = (key: string) => key;
    t.markup = (key: string) => key;
    t.raw = (key: string) => resolve(namespace, key);
    t.has = (key: string) => typeof resolve(namespace, key) === "string";
    return t;
  }

  return {
    useTranslations: (namespace?: string) => makeTranslator(namespace),
    useLocale: () => "en",
    useFormatter: () => ({
      dateTime: (v: Date) => v.toISOString(),
      number: (v: number) => String(v),
      relativeTime: (v: Date) => v.toISOString(),
      list: (v: Iterable<string>) => Array.from(v).join(", "),
    }),
    useNow: () => new Date(0),
    useTimeZone: () => "UTC",
    useMessages: () => en,
    NextIntlClientProvider: ({ children }: { children: React.ReactNode }) =>
      children,
  };
});

// Tell React 18+ this is a test environment where act() is available
// This suppresses "not configured to support act(...)" warnings
// @ts-ignore
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

// Polyfill TextEncoder/TextDecoder (required for some libraries)
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Only set up browser-specific mocks if we're in a jsdom environment
if (typeof window !== "undefined") {
  // Polyfill fetch for jsdom
  // @ts-ignore
  import("whatwg-fetch");

  // Mock BroadcastChannel for JSDOM
  global.BroadcastChannel = class BroadcastChannel {
    constructor(public name: string) {}
    postMessage() {}
    close() {}
    addEventListener() {}
    removeEventListener() {}
    dispatchEvent() {
      return true;
    }
  } as any;

  // Mock window.matchMedia for responsive components
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: jest.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(), // deprecated
      removeListener: jest.fn(), // deprecated
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });

  // Mock IntersectionObserver
  global.IntersectionObserver = class IntersectionObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    takeRecords() {
      return [];
    }
    unobserve() {}
  } as any;

  // Mock ResizeObserver
  global.ResizeObserver = class ResizeObserver {
    constructor() {}
    disconnect() {}
    observe() {}
    unobserve() {}
  } as any;

  // Mock window.scrollTo
  global.scrollTo = jest.fn();
}

// Suppress specific known console errors that are not actionable in tests.
// This pattern is recommended for handling third-party library warnings:
// https://github.com/testing-library/user-event/issues/1114#issuecomment-1876164351
//
// Radix UI's compose-refs package triggers state updates during component unmount
// which causes React to emit "not configured to support act" warnings. This happens
// because the updates occur in React's commit phase, outside of any act() boundary.
// The IS_REACT_ACT_ENVIRONMENT flag doesn't help because jsdom's globalThis is set
// up before our setup file runs.
const SUPPRESSED_ERRORS = [
  "The current testing environment is not configured to support act",
] as const;

const originalError = console.error;
console.error = (...args: any[]) => {
  if (
    typeof args[0] === "string" &&
    SUPPRESSED_ERRORS.some((error) => args[0].includes(error))
  ) {
    return;
  }
  originalError.call(console, ...args);
};
