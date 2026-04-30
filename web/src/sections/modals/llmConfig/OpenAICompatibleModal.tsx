"use client";

import { useTranslations } from "next-intl";
import { markdown } from "@opal/utils";
import { useSWRConfig } from "swr";
import { useFormikContext } from "formik";
import { InputDivider } from "@opal/layouts";
import {
  LLMProviderFormProps,
  LLMProviderName,
  LLMProviderView,
} from "@/interfaces/llm";
import { fetchOpenAICompatibleModels } from "@/lib/llmConfig/svc";
import {
  useInitialValues,
  buildValidationSchema,
  BaseLLMFormValues,
  mergeFetchedModelConfigurations,
} from "@/sections/modals/llmConfig/utils";
import { submitProvider } from "@/sections/modals/llmConfig/svc";
import { LLMProviderConfiguredSource } from "@/lib/analytics";
import {
  APIBaseField,
  APIKeyField,
  ModelSelectionField,
  DisplayNameField,
  ModelAccessField,
  ModalWrapper,
} from "@/sections/modals/llmConfig/shared";
import { toast } from "@/hooks/useToast";
import { refreshLlmProviderCaches } from "@/lib/llmConfig/cache";

interface OpenAICompatibleModalValues extends BaseLLMFormValues {
  api_key: string;
  api_base: string;
}

interface OpenAICompatibleModalInternalsProps {
  existingLlmProvider: LLMProviderView | undefined;
  isOnboarding: boolean;
}

function OpenAICompatibleModalInternals({
  existingLlmProvider,
  isOnboarding,
}: OpenAICompatibleModalInternalsProps) {
  const t = useTranslations("modals.llmConfig.openAICompatible");
  const formikProps = useFormikContext<OpenAICompatibleModalValues>();

  const isFetchDisabled = !formikProps.values.api_base;

  const handleFetchModels = async () => {
    const { models, error } = await fetchOpenAICompatibleModels({
      api_base: formikProps.values.api_base,
      api_key: formikProps.values.api_key || undefined,
      provider_name: existingLlmProvider?.name,
    });
    if (error) {
      throw new Error(error);
    }
    formikProps.setFieldValue(
      "model_configurations",
      mergeFetchedModelConfigurations(
        models,
        formikProps.values.model_configurations
      )
    );
  };

  return (
    <>
      <APIBaseField
        subDescription={markdown(t("endpointDescription"))}
        placeholder="http://localhost:8000/v1"
      />

      <APIKeyField
        optional
        subDescription={t("apiKeyDescription")}
      />

      {!isOnboarding && (
        <>
          <InputDivider />
          <DisplayNameField disabled={!!existingLlmProvider} />
        </>
      )}

      <InputDivider />
      <ModelSelectionField
        shouldShowAutoUpdateToggle={false}
        onRefetch={isFetchDisabled ? undefined : handleFetchModels}
      />

      {!isOnboarding && (
        <>
          <InputDivider />
          <ModelAccessField />
        </>
      )}
    </>
  );
}

export default function OpenAICompatibleModal({
  variant = "llm-configuration",
  existingLlmProvider,
  shouldMarkAsDefault,
  onOpenChange,
  onSuccess,
}: LLMProviderFormProps) {
  const t = useTranslations("modals.llmConfig.openAICompatible");
  const tToast = useTranslations("toasts.admin.llm");
  const tValLlm = useTranslations("validation.llm");
  const isOnboarding = variant === "onboarding";
  const { mutate } = useSWRConfig();

  const onClose = () => onOpenChange?.(false);

  const initialValues = useInitialValues(
    isOnboarding,
    LLMProviderName.OPENAI_COMPATIBLE,
    existingLlmProvider
  ) as OpenAICompatibleModalValues;

  const validationSchema = buildValidationSchema(isOnboarding, tValLlm, {
    apiBase: true,
  });

  return (
    <ModalWrapper
      providerName={LLMProviderName.OPENAI_COMPATIBLE}
      llmProvider={existingLlmProvider}
      onClose={onClose}
      initialValues={initialValues}
      description={t("providerCardDescription")}
      validationSchema={validationSchema}
      onSubmit={async (values, { setSubmitting, setStatus }) => {
        await submitProvider({
          analyticsSource: isOnboarding
            ? LLMProviderConfiguredSource.CHAT_ONBOARDING
            : LLMProviderConfiguredSource.ADMIN_PAGE,
          providerName: LLMProviderName.OPENAI_COMPATIBLE,
          values,
          initialValues,
          existingLlmProvider,
          shouldMarkAsDefault,
          setStatus,
          setSubmitting,
          onClose,
          onSuccess: async () => {
            if (onSuccess) {
              await onSuccess();
            } else {
              await refreshLlmProviderCaches(mutate);
              toast.success(
                existingLlmProvider
                  ? tToast("providerUpdatedSuccess")
                  : tToast("providerEnabledSuccess")
              );
            }
          },
          messages: {
            providerUpdateFailed: (error: string) =>
              tToast("providerUpdateFailedDetail", { error }),
            providerEnableFailed: (error: string) =>
              tToast("providerEnableFailedDetail", { error }),
            setProviderAsDefaultFailed: tToast("setProviderAsDefaultFailed"),
            setNewProviderAsDefaultFailed: tToast(
              "setNewProviderAsDefaultFailed"
            ),
          },
        });
      }}
    >
      <OpenAICompatibleModalInternals
        existingLlmProvider={existingLlmProvider}
        isOnboarding={isOnboarding}
      />
    </ModalWrapper>
  );
}
