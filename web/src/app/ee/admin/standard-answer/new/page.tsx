import { StandardAnswerCreationForm } from "@/app/ee/admin/standard-answer/StandardAnswerCreationForm";
import { fetchSS } from "@/lib/utilsSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import { SettingsLayouts } from "@opal/layouts";
import { ADMIN_ROUTES } from "@/lib/admin-routes";
import { StandardAnswerCategory } from "@/lib/types";
import { getTranslations } from "next-intl/server";

const route = ADMIN_ROUTES.STANDARD_ANSWERS;

async function Page() {
  const t = await getTranslations("admin.standardAnswer");
  const standardAnswerCategoriesResponse = await fetchSS(
    "/manage/admin/standard-answer/category"
  );

  if (!standardAnswerCategoriesResponse.ok) {
    return (
      <ErrorCallout
        errorTitle={t("somethingWentWrong")}
        errorMsg={t("fetchCategoriesFailedDetail", {
          error: await standardAnswerCategoriesResponse.text(),
        })}
      />
    );
  }
  const standardAnswerCategories =
    (await standardAnswerCategoriesResponse.json()) as StandardAnswerCategory[];

  return (
    <SettingsLayouts.Root>
      <SettingsLayouts.Header
        icon={route.icon}
        title={t("newTitle")}
        backButton
        divider
      />
      <SettingsLayouts.Body>
        <StandardAnswerCreationForm
          standardAnswerCategories={standardAnswerCategories}
        />
      </SettingsLayouts.Body>
    </SettingsLayouts.Root>
  );
}

export default Page;
