"use client";

import { markdown } from "@opal/utils";
import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { SvgOnyxLogo } from "@opal/logos";
import Modal from "@/refresh-components/Modal";
import InputComboBoxField from "@/refresh-components/form/InputComboBoxField";
import InputTypeInField from "@/refresh-components/form/InputTypeInField";
import PasswordInputTypeInField from "@/refresh-components/form/PasswordInputTypeInField";
import InputSelectField from "@/refresh-components/form/InputSelectField";
import InputSelect from "@/refresh-components/inputs/InputSelect";
import { InputVertical } from "@opal/layouts";
import { Section } from "@/layouts/general-layouts";
import { SvgArrowExchange, SvgUnplug } from "@opal/icons";
import { Button, Text } from "@opal/components";
import { toast } from "@/hooks/useToast";
import { useModalClose } from "@/refresh-components/contexts/ModalContext";
import type {
  VoiceProviderView,
  VoiceFormValues,
  VoiceOption,
} from "@/lib/voice/interfaces";
import {
  testVoiceProvider,
  upsertVoiceProvider,
  fetchVoicesByType,
} from "@/lib/voice/svc";
import {
  getProviderIcon as getProviderIconUtil,
  getProviderLabel as getProviderLabelUtil,
  PROVIDER_LABELS,
  PROVIDER_API_KEY_URLS,
  PROVIDER_DOCS_URLS,
  PROVIDER_VOICE_DOCS_URLS,
  OPENAI_STT_MODELS,
  OPENAI_TTS_MODELS,
  resolveModelId,
  type ProviderMode,
} from "@/lib/voice/utils";
import SimpleLoader from "@/refresh-components/loaders/SimpleLoader";

// Re-export for consumers that import from shared
export { type ProviderMode } from "@/lib/voice/utils";
export const getProviderIcon = getProviderIconUtil;
export const getProviderLabel = getProviderLabelUtil;

// ---------------------------------------------------------------------------
// VoiceProviderSetupModal
// ---------------------------------------------------------------------------

interface VoiceProviderSetupModalProps {
  providerType: string;
  existingProvider: VoiceProviderView | null;
  mode: ProviderMode;
  defaultModelId?: string | null;
  onSuccess: () => void;
}

export function VoiceProviderSetupModal({
  providerType,
  existingProvider,
  mode,
  defaultModelId,
  onSuccess,
}: VoiceProviderSetupModalProps) {
  const t = useTranslations("admin.voice");
  const tCommon = useTranslations("common.actions");
  const onClose = useModalClose();
  const initialTtsModel = defaultModelId
    ? resolveModelId(defaultModelId)
    : existingProvider?.tts_model ?? "tts-1";

  const isEditing = !!existingProvider;
  const label = PROVIDER_LABELS[providerType] ?? providerType;
  const ProviderIcon = getProviderIcon(providerType);

  // Non-form state: dynamic voice options
  const [voiceOptions, setVoiceOptions] = useState<VoiceOption[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [initialDefaultVoice, setInitialDefaultVoice] = useState(
    existingProvider?.default_voice ?? ""
  );

  // Fetch voices on mount
  useEffect(() => {
    setIsLoadingVoices(true);
    fetchVoicesByType(providerType)
      .then((res) => res.json())
      .then((data: Array<{ id: string; name: string }>) => {
        const options = data.map((v) => ({
          value: v.id,
          label: v.name,
          description: v.id,
        }));
        setVoiceOptions(options);
        setInitialDefaultVoice((prev) => {
          if (!prev) return options[0]?.value ?? "";
          return options.some((o) => o.value === prev)
            ? prev
            : options[0]?.value ?? "";
        });
      })
      .catch(() => setVoiceOptions([]))
      .finally(() => setIsLoadingVoices(false));
  }, [providerType]);

  const validationSchema = Yup.object().shape({
    api_key: Yup.string().required("API key is required"),
    target_uri:
      providerType === "azure"
        ? Yup.string().required("Target URI is required")
        : Yup.string(),
    stt_model: Yup.string(),
    tts_model: Yup.string(),
    default_voice: Yup.string(),
  });

  const initialValues: VoiceFormValues = {
    api_key: existingProvider?.api_key ?? "",
    target_uri: existingProvider?.target_uri ?? "",
    stt_model: existingProvider?.stt_model ?? "whisper-1",
    tts_model: initialTtsModel,
    default_voice: initialDefaultVoice,
  };

  async function handleSubmit(
    values: VoiceFormValues,
    { setSubmitting }: { setSubmitting: (v: boolean) => void }
  ) {
    const apiKeyChanged = values.api_key !== initialValues.api_key;
    const shouldUseStoredKey = isEditing && !apiKeyChanged;

    try {
      if (!shouldUseStoredKey) {
        // Test connection
        const testResponse = await testVoiceProvider({
          provider_type: providerType,
          api_key: apiKeyChanged ? values.api_key : undefined,
          target_uri: values.target_uri || undefined,
          use_stored_key: shouldUseStoredKey,
        });

        if (!testResponse.ok) {
          const data = await testResponse.json().catch(() => ({}));
          toast.error(
            typeof data?.detail === "string"
              ? data.detail
              : "Connection test failed"
          );
          setSubmitting(false);
          return;
        }
      }

      // Save the provider
      const response = await upsertVoiceProvider({
        id: existingProvider?.id,
        name: label,
        provider_type: providerType,
        api_key: apiKeyChanged ? values.api_key : undefined,
        api_key_changed: apiKeyChanged,
        target_uri: values.target_uri || undefined,
        stt_model: values.stt_model,
        tts_model: values.tts_model,
        default_voice: values.default_voice,
        activate_stt: isEditing
          ? existingProvider?.is_default_stt ?? false
          : mode === "stt",
        activate_tts: isEditing
          ? existingProvider?.is_default_tts ?? false
          : mode === "tts",
      });

      if (response.ok) {
        onSuccess();
      } else {
        const data = await response.json().catch(() => ({}));
        toast.error(
          typeof data?.detail === "string"
            ? data.detail
            : "Failed to save provider"
        );
      }
    } catch {
      toast.error("Failed to save provider");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onOpenChange={onClose}>
      <Modal.Content width="md">
        <Formik
          initialValues={initialValues}
          validationSchema={validationSchema}
          enableReinitialize
          onSubmit={handleSubmit}
        >
          {({ isSubmitting, dirty, isValid }) => (
            <Form>
              <Modal.Header
                icon={ProviderIcon}
                moreIcon1={SvgArrowExchange}
                moreIcon2={SvgOnyxLogo}
                title={t("setupModal.title", { label })}
                description={t("setupModal.description", { label })}
                onClose={onClose}
              />
              <Modal.Body>
                <Section gap={1} alignItems="stretch">
                  {providerType === "azure" && (
                    <InputVertical
                      title={t("setupModal.targetUriLabel")}
                      subDescription={markdown(t("setupModal.targetUriHelp"))}
                      withLabel="target_uri"
                    >
                      <InputTypeInField
                        name="target_uri"
                        placeholder="https://your_resource_region.tts.speech.microsoft.com/"
                      />
                    </InputVertical>
                  )}

                  <InputVertical
                    title={t("setupModal.apiKeyLabel")}
                    subDescription={markdown(
                      t("setupModal.apiKeyHelp", {
                        url: PROVIDER_API_KEY_URLS[providerType] ?? "",
                        label,
                      })
                    )}
                    withLabel="api_key"
                  >
                    <PasswordInputTypeInField
                      name="api_key"
                      placeholder={t("setupModal.apiKeyPlaceholder")}
                    />
                  </InputVertical>

                  {mode === "stt" && providerType === "openai" && (
                    <InputVertical
                      title={t("setupModal.sttModelLabel")}
                      withLabel="stt_model"
                    >
                      <InputSelectField name="stt_model">
                        <InputSelect.Trigger />
                        <InputSelect.Content>
                          {OPENAI_STT_MODELS.map((m) => (
                            <InputSelect.Item key={m.id} value={m.id}>
                              {m.name}
                            </InputSelect.Item>
                          ))}
                        </InputSelect.Content>
                      </InputSelectField>
                    </InputVertical>
                  )}

                  {mode === "tts" && (
                    <>
                      {providerType === "openai" && (
                        <InputVertical
                          title={t("setupModal.defaultModelLabel")}
                          subDescription={t("setupModal.defaultModelHelp")}
                          withLabel="tts_model"
                        >
                          <InputSelectField name="tts_model">
                            <InputSelect.Trigger />
                            <InputSelect.Content>
                              {OPENAI_TTS_MODELS.map((m) => (
                                <InputSelect.Item key={m.id} value={m.id}>
                                  {m.name}
                                </InputSelect.Item>
                              ))}
                            </InputSelect.Content>
                          </InputSelectField>
                        </InputVertical>
                      )}

                      <InputVertical
                        title={t("setupModal.voiceLabel")}
                        subDescription={markdown(
                          t("setupModal.voiceHelp", {
                            docsLabel:
                              PROVIDER_VOICE_DOCS_URLS[providerType]?.label ??
                              label,
                            docsUrl:
                              PROVIDER_VOICE_DOCS_URLS[providerType]?.url ??
                              PROVIDER_DOCS_URLS[providerType] ??
                              "",
                          })
                        )}
                        withLabel="default_voice"
                      >
                        <InputComboBoxField
                          name="default_voice"
                          options={voiceOptions}
                          placeholder={
                            isLoadingVoices
                              ? t("setupModal.loadingVoices")
                              : t("setupModal.selectVoice")
                          }
                          disabled={isLoadingVoices}
                          strict={false}
                        />
                      </InputVertical>
                    </>
                  )}
                </Section>
              </Modal.Body>
              <Modal.Footer>
                <Button prominence="secondary" onClick={onClose}>
                  {tCommon("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting || !isValid || !dirty}
                  icon={isSubmitting ? SimpleLoader : undefined}
                >
                  {isEditing ? tCommon("save") : t("setupModal.connect")}
                </Button>
              </Modal.Footer>
            </Form>
          )}
        </Formik>
      </Modal.Content>
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// VoiceDisconnectModal
// ---------------------------------------------------------------------------

export const NO_DEFAULT_VALUE = "__none__";

interface VoiceDisconnectModalProps {
  disconnectTarget: {
    providerId: number;
    providerLabel: string;
    providerType: string;
  };
  providers: VoiceProviderView[];
  onDisconnect: () => void;
}

export function VoiceDisconnectModal({
  disconnectTarget,
  providers,
  onDisconnect,
}: VoiceDisconnectModalProps) {
  const t = useTranslations("admin.voice");
  const tCommon = useTranslations("common.actions");
  const onClose = useModalClose();
  // Find other configured providers that could serve as replacements
  const replacementOptions = providers.filter(
    (p) => p.id !== disconnectTarget.providerId && p.has_api_key
  );

  const hasReplacements = replacementOptions.length > 0;

  return (
    <Modal open onOpenChange={onClose}>
      <Modal.Content width="md">
        <Modal.Header
          icon={SvgUnplug}
          title={t("disconnect.title", {
            label: disconnectTarget.providerLabel,
          })}
          onClose={onClose}
        />
        <Modal.Body>
          <Section alignItems="start" gap={0.5}>
            <Text color="text-03">
              {markdown(
                t("disconnect.body", {
                  label: disconnectTarget.providerLabel,
                })
              )}
            </Text>
            {!hasReplacements && (
              <Text color="text-03">{t("disconnect.connectAnother")}</Text>
            )}
          </Section>
        </Modal.Body>
        <Modal.Footer>
          <Button prominence="secondary" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
          <Button variant="danger" onClick={onDisconnect}>
            {t("disconnect.confirm")}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
