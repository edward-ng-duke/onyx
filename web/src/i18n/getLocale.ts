import { cookies, headers } from "next/headers";

import { defaultLocale, locales, type Locale } from "../../next-intl.config";

export function parseAcceptLanguage(header: string): string[] {
  // Returns BCP-47 tag prefixes (e.g. "en", "zh") sorted by descending q.
  return header
    .split(",")
    .map((part) => {
      const [tagRaw, ...params] = part.trim().split(";");
      const tag = (tagRaw ?? "").trim().toLowerCase();
      const qParam = params
        .map((p) => p.trim())
        .find((p) => p.startsWith("q="));
      const q = qParam ? Number.parseFloat(qParam.slice(2)) : 1;
      return { tag, q: Number.isFinite(q) ? q : 0 };
    })
    .filter((entry) => entry.tag.length > 0)
    .sort((a, b) => b.q - a.q)
    .map((entry) => entry.tag.split("-")[0] ?? entry.tag);
}

export async function getLocale(): Promise<Locale> {
  const cookie = (await cookies()).get("NEXT_LOCALE")?.value;
  if (cookie && (locales as readonly string[]).includes(cookie)) {
    return cookie as Locale;
  }
  const accept = (await headers()).get("accept-language") ?? "";
  for (const tag of parseAcceptLanguage(accept)) {
    if ((locales as readonly string[]).includes(tag)) {
      return tag as Locale;
    }
  }
  return defaultLocale;
}
