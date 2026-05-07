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
import { fetchBifrostModels } from "@/lib/languageModels/svc";
import {
  useInitialValues,
  buildValidationSchema,
  BaseLLMFormValues,
  mergeFetchedModelConfigurations,
} from "@/sections/modals/languageModels/utils";
import { submitProvider } from "@/sections/modals/languageModels/svc";
import { LLMProviderConfiguredSource } from "@/lib/analytics";
import {
  APIBaseField,
  APIKeyField,
  ModelSelectionField,
  DisplayNameField,
  ModelAccessField,
  ModalWrapper,
} from "@/sections/modals/languageModels/shared";
import { toast } from "@/hooks/useToast";
import { refreshLlmProviderCaches } from "@/lib/languageModels/cache";

interface BifrostModalValues extends BaseLLMFormValues {
  api_key: string;
  api_base: string;
}

interface BifrostModalInternalsProps {
  existingLlmProvider: LLMProviderView | undefined;
  isOnboarding: boolean;
}

function BifrostModalInternals({
  existingLlmProvider,
  isOnboarding,
}: BifrostModalInternalsProps) {
  const t = useTranslations("modals.llmConfig.bifrost");
  const formikProps = useFormikContext<BifrostModalValues>();

  const isFetchDisabled = !formikProps.values.api_base;

  const handleFetchModels = async () => {
    const { models, error } = await fetchBifrostModels({
      api_base: formikProps.values.api_base,
      api_key: formikProps.values.api_key || undefined,
      provider_name: existingLlmProvider?.name ?? undefined,
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
        subDescription={t("endpointDescription")}
        placeholder="https://your-bifrost-gateway.com/v1"
      />

      <APIKeyField
        optional
        subDescription={markdown(t("apiKeyDescription"))}
      />

      {!isOnboarding && (
        <>
          <InputDivider />
          <DisplayNameField />
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

export default function BifrostModal({
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

  const initialValues: BifrostModalValues = useInitialValues(
    isOnboarding,
    LLMProviderName.BIFROST,
    existingLlmProvider
  ) as BifrostModalValues;

  const validationSchema = buildValidationSchema(isOnboarding, tValLlm, {
    apiBase: true,
  });

  return (
    <ModalWrapper
      providerName={LLMProviderName.BIFROST}
      llmProvider={existingLlmProvider}
      onClose={onClose}
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={async (values, { setSubmitting, setStatus }) => {
        await submitProvider({
          analyticsSource: isOnboarding
            ? LLMProviderConfiguredSource.CHAT_ONBOARDING
            : LLMProviderConfiguredSource.ADMIN_PAGE,
          providerName: LLMProviderName.BIFROST,
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
      <BifrostModalInternals
        existingLlmProvider={existingLlmProvider}
        isOnboarding={isOnboarding}
      />
    </ModalWrapper>
  );
}
