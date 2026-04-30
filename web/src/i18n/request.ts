import { getRequestConfig } from "next-intl/server";

import { defaultLocale } from "../../next-intl.config";
import { getLocale } from "./getLocale";

export default getRequestConfig(async () => {
  const locale = await getLocale();
  let messages: Record<string, unknown>;
  try {
    messages = (await import(`./messages/${locale}.json`)).default;
  } catch {
    messages = (await import(`./messages/${defaultLocale}.json`)).default;
  }
  return { locale, messages };
});
