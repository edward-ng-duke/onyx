import { getRequestConfig } from "next-intl/server";
import { getLocale } from "./getLocale";

export default getRequestConfig(async () => {
  const locale = await getLocale();
  const messages = (await import(`./messages/${locale}.json`)).default;
  return { locale, messages };
});
