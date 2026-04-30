import { cookies, headers } from "next/headers";

const SUPPORTED = ["en", "zh"] as const;
export type Locale = (typeof SUPPORTED)[number];

export async function getLocale(): Promise<Locale> {
  const cookie = (await cookies()).get("NEXT_LOCALE")?.value;
  if (cookie && (SUPPORTED as readonly string[]).includes(cookie)) {
    return cookie as Locale;
  }
  const accept = (await headers()).get("accept-language") ?? "";
  if (/\bzh\b/i.test(accept)) return "zh";
  return "en";
}
