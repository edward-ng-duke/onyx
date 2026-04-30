"use client";

import { useTranslations } from "next-intl";
import { useSWRConfig } from "swr";
import { useFormikContext } from "formik";
import { InputDivider } from "@opal/layouts";
import {
  LLMProviderFormProps,
  LLMProviderName,
  LLMProviderView,
} from "@/interfaces/llm";
import { fetchOpenRouterModels } from "@/lib/llmConfig/svc";
import {
  useInitialValues,
  buildValidationSchema,
  BaseLLMFormValues,
  mergeFetchedModelConfigurations,
} from "@/sections/modals/llmConfig/utils";
import { submitProvider } from "@/sections/modals/llmConfig/svc";
import { LLMProviderConfiguredSource } from "@/lib/analytics";
import {
  APIKeyField,
  APIBaseField,
  ModelSelectionField,
  DisplayNameField,
  ModelAccessField,
  ModalWrapper,
} from "@/sections/modals/llmConfig/shared";
import { toast } from "@/hooks/useToast";
import { refreshLlmProviderCaches } from "@/lib/llmConfig/cache";

const DEFAULT_API_BASE = "https://openrouter.ai/api/v1";

interface OpenRouterModalValues extends BaseLLMFormValues {
  api_key: string;
  api_base: string;
}

interface OpenRouterModalInternalsProps {
  existingLlmProvider: LLMProviderView | undefined;
  isOnboarding: boolean;
}

function OpenRouterModalInternals({
  existingLlmProvider,
  isOnboarding,
}: OpenRouterModalInternalsProps) {
  const t = useTranslations("modals.llmConfig.openRouter");
  const formikProps = useFormikContext<OpenRouterModalValues>();

  const isFetchDisabled =
    !formikProps.values.api_base || !formikProps.values.api_key;

  const handleFetchModels = async () => {
    const { models: fetched, error } = await fetchOpenRouterModels({
      api_base: formikProps.values.api_base,
      api_key: formikProps.values.api_key,
      provider_name: existingLlmProvider?.name,
    });
    if (error) {
      throw new Error(error);
    }
    formikProps.setFieldValue(
      "model_configurations",
      mergeFetchedModelConfigurations(
        fetched,
        formikProps.values.model_configurations
      )
    );
  };

  return (
    <>
      <APIBaseField
        subDescription={t("endpointDescription")}
        placeholder={t("endpointPlaceholder")}
      />

      <APIKeyField providerName="OpenRouter" />

      {!isOnboarding && (
        <>
          <InputDivider />
          <DisplayNameField disabled={!!existingLlmProvider} />
        </>
      )}

      <InputDivider />
      <ModelSelectionField
        shouldShowAutoUpdateToggle={true}
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

export default function OpenRouterModal({
  variant = "llm-configuration",
  existingLlmProvider,
  shouldMarkAsDefault,
  onOpenChange,
  onSuccess,
}: LLMProviderFormProps) {
  const tToast = useTranslations("toasts.admin.llm");
  const tValLlm = useTranslations("validation.llm");
  const isOnboarding = variant === "onboarding";
  const { mutate } = useSWRConfig();

  const onClose = () => onOpenChange?.(false);

  const initialValues: OpenRouterModalValues = {
    ...useInitialValues(
      isOnboarding,
      LLMProviderName.OPENROUTER,
      existingLlmProvider
    ),
    api_base: existingLlmProvider?.api_base ?? DEFAULT_API_BASE,
  } as OpenRouterModalValues;

  const validationSchema = buildValidationSchema(isOnboarding, tValLlm, {
    apiKey: true,
    apiBase: true,
  });

  return (
    <ModalWrapper
      providerName={LLMProviderName.OPENROUTER}
      llmProvider={existingLlmProvider}
      onClose={onClose}
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={async (values, { setSubmitting, setStatus }) => {
        await submitProvider({
          analyticsSource: isOnboarding
            ? LLMProviderConfiguredSource.CHAT_ONBOARDING
            : LLMProviderConfiguredSource.ADMIN_PAGE,
          providerName: LLMProviderName.OPENROUTER,
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
      <OpenRouterModalInternals
        existingLlmProvider={existingLlmProvider}
        isOnboarding={isOnboarding}
      />
    </ModalWrapper>
  );
}
