import { BooleanFormField, TextFormField } from "@/components/Field";
import Button from "@/refresh-components/buttons/Button";
import { Form, Formik } from "formik";
import { useTranslations } from "next-intl";
import * as Yup from "yup";
import { HostedEmbeddingModel } from "./interfaces";

export function CustomModelForm({
  onSubmit,
}: {
  onSubmit: (model: HostedEmbeddingModel) => void;
}) {
  const t = useTranslations("admin.indexing.customModelForm");
  return (
    <div>
      <Formik
        initialValues={{
          model_name: "",
          model_dim: "",
          query_prefix: "",
          passage_prefix: "",
          description: "",
          normalize: true,
        }}
        validationSchema={Yup.object().shape({
          model_name: Yup.string().required(t("modelNameRequired")),
          model_dim: Yup.number().required(t("modelDimRequired")),
          query_prefix: Yup.string(),
          passage_prefix: Yup.string(),
          normalize: Yup.boolean().required(),
        })}
        onSubmit={async (values, formikHelpers) => {
          onSubmit({
            ...values,
            model_dim: parseInt(values.model_dim),
            api_key: null,
            provider_type: null,
            index_name: null,
            api_url: null,
          });
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            <TextFormField
              name="model_name"
              label={t("nameLabel")}
              subtext={t("nameSubtext")}
              placeholder={t("namePlaceholder")}
            />

            <TextFormField
              name="model_dim"
              label={t("dimLabel")}
              subtext={t("dimSubtext")}
              placeholder={t("dimPlaceholder")}
              type="number"
            />
            <TextFormField
              min={-1}
              name="description"
              label={t("descriptionLabel")}
              subtext={t("descriptionSubtext")}
              placeholder=""
            />

            <TextFormField
              name="query_prefix"
              label={t("queryPrefixLabel")}
              subtext={
                <>
                  {t.rich("queryPrefixSubtext", {
                    i: (chunks) => <i>{chunks}</i>,
                  })}
                </>
              }
              placeholder={t("queryPrefixPlaceholder")}
            />
            <TextFormField
              name="passage_prefix"
              label={t("passagePrefixLabel")}
              subtext={
                <>
                  {t.rich("passagePrefixSubtext", {
                    i: (chunks) => <i>{chunks}</i>,
                  })}
                </>
              }
              placeholder={t("passagePrefixPlaceholder")}
            />

            <BooleanFormField
              removeIndent
              name="normalize"
              label={t("normalizeLabel")}
              subtext={t("normalizeSubtext")}
            />

            {/* TODO(@raunakab): migrate to opal Button once className/iconClassName is resolved */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-64 mx-auto"
            >
              {t("submit")}
            </Button>
          </Form>
        )}
      </Formik>
    </div>
  );
}
