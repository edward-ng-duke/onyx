import { StandardAnswerCreationForm } from "@/app/ee/admin/standard-answer/StandardAnswerCreationForm";
import { fetchSS } from "@/lib/utilsSS";
import { ErrorCallout } from "@/components/ErrorCallout";
import * as SettingsLayouts from "@/layouts/settings-layouts";
import { ADMIN_ROUTES } from "@/lib/admin-routes";
import { StandardAnswer, StandardAnswerCategory } from "@/lib/types";
import { getTranslations } from "next-intl/server";

const route = ADMIN_ROUTES.STANDARD_ANSWERS;

async function Main({ id }: { id: string }) {
  const t = await getTranslations("admin.standardAnswer");
  const tasks = [
    fetchSS("/manage/admin/standard-answer"),
    fetchSS(`/manage/admin/standard-answer/category`),
  ];
  const [standardAnswersResponse, standardAnswerCategoriesResponse] =
    await Promise.all(tasks);

  if (standardAnswersResponse === undefined) {
    return (
      <ErrorCallout
        errorTitle={t("somethingWentWrong")}
        errorMsg={t("fetchAnswersFailed")}
      />
    );
  }

  if (!standardAnswersResponse.ok) {
    return (
      <ErrorCallout
        errorTitle={t("somethingWentWrong")}
        errorMsg={t("fetchAnswersFailedDetail", {
          error: await standardAnswersResponse.text(),
        })}
      />
    );
  }
  const allStandardAnswers =
    (await standardAnswersResponse.json()) as StandardAnswer[];
  const standardAnswer = allStandardAnswers.find(
    (answer) => answer.id.toString() === id
  );

  if (!standardAnswer) {
    return (
      <ErrorCallout
        errorTitle={t("somethingWentWrong")}
        errorMsg={t("answerNotFound", { id })}
      />
    );
  }

  if (standardAnswerCategoriesResponse === undefined) {
    return (
      <ErrorCallout
        errorTitle={t("somethingWentWrong")}
        errorMsg={t("fetchCategoriesFailed")}
      />
    );
  }

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
    <StandardAnswerCreationForm
      standardAnswerCategories={standardAnswerCategories}
      existingStandardAnswer={standardAnswer}
    />
  );
}

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const t = await getTranslations("admin.standardAnswer");

  return (
    <SettingsLayouts.Root>
      <SettingsLayouts.Header
        icon={route.icon}
        title={t("editTitle")}
        backButton
        divider
      />
      <SettingsLayouts.Body>
        <Main id={params.id} />
      </SettingsLayouts.Body>
    </SettingsLayouts.Root>
  );
}
