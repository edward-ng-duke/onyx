"use client";

import React, { useRef, useState } from "react";
import Modal from "@/refresh-components/Modal";
import { Callout } from "@/components/ui/callout";
import Text from "@/refresh-components/texts/Text";
import { Divider } from "@opal/components";
import Button from "@/refresh-components/buttons/Button";
import { Label } from "@/components/Field";
import {
  CloudEmbeddingProvider,
  getFormattedProviderName,
} from "@/components/embedding/interfaces";
import { EMBEDDING_PROVIDERS_ADMIN_URL } from "@/lib/llmConfig/constants";
import { markdown } from "@opal/utils";
import { mutate } from "swr";
import { SWR_KEYS } from "@/lib/swr-keys";
import { testEmbedding } from "@/app/admin/embeddings/pages/utils";
import { SvgSettings } from "@opal/icons";
import { useTranslations } from "next-intl";

export interface ChangeCredentialsModalProps {
  provider: CloudEmbeddingProvider;
  onConfirm: () => void;
  onCancel: () => void;
  onDeleted: () => void;
  useFileUpload: boolean;
  isProxy?: boolean;
  isAzure?: boolean;
}

export default function ChangeCredentialsModal({
  provider,
  onConfirm,
  onCancel,
  onDeleted,
  useFileUpload,
  isProxy = false,
  isAzure = false,
}: ChangeCredentialsModalProps) {
  const t = useTranslations("admin.embeddings");
  const [apiKey, setApiKey] = useState("");
  const [apiUrl, setApiUrl] = useState("");
  const [modelName, setModelName] = useState("");
  const [testError, setTestError] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [deletionError, setDeletionError] = useState<string>("");

  const clearFileInput = () => {
    setFileName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    setFileName("");

    if (file) {
      setFileName(file.name);
      try {
        setDeletionError("");
        const fileContent = await file.text();
        let jsonContent;
        try {
          jsonContent = JSON.parse(fileContent);
          setApiKey(JSON.stringify(jsonContent));
        } catch (parseError) {
          throw new Error(t("jsonParseError"));
        }
      } catch (error) {
        setTestError(
          error instanceof Error
            ? error.message
            : t("fileProcessingError")
        );
        setApiKey("");
        clearFileInput();
      }
    }
  };

  const handleDelete = async () => {
    setDeletionError("");

    try {
      const response = await fetch(
        `${EMBEDDING_PROVIDERS_ADMIN_URL}/${provider.provider_type.toLowerCase()}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        setDeletionError(errorData.detail);
        return;
      }

      mutate(SWR_KEYS.adminLlmProviders);
      onDeleted();
    } catch (error) {
      setDeletionError(
        error instanceof Error ? error.message : t("unknownError")
      );
    }
  };

  const handleSubmit = async () => {
    setTestError("");
    const normalizedProviderType = provider.provider_type
      .toLowerCase()
      .split(" ")[0];

    if (!normalizedProviderType) {
      setTestError(t("providerTypeInvalid"));
      return;
    }

    try {
      const testResponse = await testEmbedding({
        provider_type: normalizedProviderType,
        modelName,
        apiKey,
        apiUrl,
        apiVersion: null,
        deploymentName: null,
      });

      if (!testResponse.ok) {
        const errorMsg = (await testResponse.json()).detail;
        throw new Error(errorMsg);
      }

      const updateResponse = await fetch(EMBEDDING_PROVIDERS_ADMIN_URL, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider_type: normalizedProviderType,
          api_key: apiKey,
          api_url: apiUrl,
          is_default_provider: false,
          is_configured: true,
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(
          errorData.detail ||
            (isProxy
              ? t("updateProviderFailedApiUrl")
              : t("updateProviderFailedApiKey"))
        );
      }

      // Refresh cached provider details so the rest of the form sees the new key without forcing a re-index
      await mutate(EMBEDDING_PROVIDERS_ADMIN_URL);

      onConfirm();
    } catch (error) {
      setTestError(
        error instanceof Error ? error.message : t("unknownError")
      );
    }
  };
  return (
    <Modal open onOpenChange={onCancel}>
      <Modal.Content>
        <Modal.Header
          icon={SvgSettings}
          title={markdown(
            t("modifyConfig", {
              provider: getFormattedProviderName(provider.provider_type),
              kind: isProxy ? t("configKindConfiguration") : t("configKindKey"),
            })
          )}
          onClose={onCancel}
        />
        <Modal.Body>
          {!isAzure && (
            <>
              <Text as="p">
                {t("modifyConfigPart1")}
                {isProxy ? t("modifyConfigPart2OrUrl") : t("modifyConfigPart2End")}
              </Text>

              <div className="flex flex-col gap-2">
                <Label className="mt-2">{t("apiKeyLabel")}</Label>
                {useFileUpload ? (
                  <>
                    <Label className="mt-2">{t("uploadJsonFile")}</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="text-lg w-full p-1"
                    />
                    {fileName && <p>{t("uploadedFile", { name: fileName })}</p>}
                  </>
                ) : (
                  <>
                    <input
                      type="password"
                      className="border border-border rounded w-full py-2 px-3 bg-background-emphasis"
                      value={apiKey}
                      onChange={(e: any) => setApiKey(e.target.value)}
                      placeholder={t("pasteApiKey")}
                    />
                  </>
                )}

                {isProxy && (
                  <>
                    <Label className="mt-2">{t("apiUrlLabel")}</Label>

                    <input
                      className={`
                          border
                          border-border
                          rounded
                          w-full
                          py-2
                          px-3
                          bg-background-emphasis
                      `}
                      value={apiUrl}
                      onChange={(e: any) => setApiUrl(e.target.value)}
                      placeholder={t("pasteApiUrl")}
                    />

                    {deletionError && (
                      <Callout type="danger" title={t("error")}>
                        {deletionError}
                      </Callout>
                    )}

                    <div>
                      <Label className="mt-2">{t("testModelLabel")}</Label>
                      <Text as="p">{t("liteLLMTestModelDesc")}</Text>
                    </div>
                    <input
                      className={`
                       border
                       border-border
                       rounded
                       w-full
                       py-2
                       px-3
                       bg-background-emphasis
                   `}
                      value={modelName}
                      onChange={(e: any) => setModelName(e.target.value)}
                      placeholder={t("pasteModelName")}
                    />
                  </>
                )}

                {testError && (
                  <Callout type="danger" title={t("error")}>
                    {testError}
                  </Callout>
                )}

                {/* TODO(@raunakab): migrate to opal Button once className/iconClassName is resolved */}
                <Button
                  className="mr-auto mt-4"
                  onClick={() => handleSubmit()}
                  disabled={!apiKey}
                >
                  {t("updateConfiguration")}
                </Button>

                <Divider />
              </div>
            </>
          )}

          <Text as="p" className="mt-4 font-bold">
            {t("deleteConfigIntro")}
          </Text>
          <Text as="p">{t("deleteConfigOnlyIfSwitched")}</Text>

          {/* TODO(@raunakab): migrate to opal Button once className/iconClassName is resolved */}
          <Button className="mr-auto" onClick={handleDelete} danger>
            {t("deleteConfiguration")}
          </Button>
          {deletionError && (
            <Callout type="danger" title={t("error")}>
              {deletionError}
            </Callout>
          )}
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );
}
