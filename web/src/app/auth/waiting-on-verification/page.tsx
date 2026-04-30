import {
  AuthTypeMetadata,
  getAuthTypeMetadataSS,
  getCurrentUserSS,
} from "@/lib/userSS";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { User } from "@/lib/types";
import { RequestNewVerificationEmail } from "./RequestNewVerificationEmail";
import Logo from "@/refresh-components/Logo";
import { Text } from "@opal/components";
import { markdown } from "@opal/utils";

export default async function Page() {
  // catch cases where the backend is completely unreachable here
  // without try / catch, will just raise an exception and the page
  // will not render
  let authTypeMetadata: AuthTypeMetadata | null = null;
  let currentUser: User | null = null;
  try {
    [authTypeMetadata, currentUser] = await Promise.all([
      getAuthTypeMetadataSS(),
      getCurrentUserSS(),
    ]);
  } catch (e) {
    console.log(`Some fetch failed for the login page - ${e}`);
  }

  if (!currentUser) {
    return redirect("/auth/login");
  }

  if (!authTypeMetadata?.requiresVerification || currentUser.is_verified) {
    return redirect("/app");
  }

  const t = await getTranslations("auth");

  return (
    <main>
      <div className="min-h-screen flex flex-col items-center justify-center py-12 px-4 sm:px-6 lg:px-8 gap-4">
        <Logo folded size={64} className="mx-auto w-fit" />
        <div className="flex flex-col gap-2">
          <Text as="span">
            {markdown(
              t("verify.waitingHeader", { email: `*${currentUser.email}*` })
            )}
          </Text>
          <div className="flex flex-row items-center gap-1">
            <Text as="span">{t("verify.ifNotSee")}</Text>
            <RequestNewVerificationEmail email={currentUser.email}>
              <Text as="span">{t("verify.here")}</Text>
            </RequestNewVerificationEmail>
            <Text as="span">{t("verify.toRequestNew")}</Text>
          </div>
        </div>
      </div>
    </main>
  );
}
