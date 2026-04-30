"use client";

import { toast } from "@/hooks/useToast";
import { useTranslations } from "next-intl";
import { markdown } from "@opal/utils";

import EmbeddingModelSelection from "../EmbeddingModelSelectionForm";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import Text from "@/refresh-components/texts/Text";
import Button from "@/refresh-components/buttons/Button";
import { Button as OpalButton } from "@opal/components";
import { WarningCircle, Warning, CaretDownIcon } from "@phosphor-icons/react";
import {
  CloudEmbeddingModel,
  EmbeddingProvider,
  HostedEmbeddingModel,
} from "@/components/embedding/interfaces";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ErrorCallout } from "@/components/ErrorCallout";
import useSWR from "swr";
import { SWR_KEYS } from "@/lib/swr-keys";
import { ThreeDotsLoader } from "@/components/Loading";
import AdvancedEmbeddingFormPage from "./AdvancedEmbeddingFormPage";
import {
  AdvancedSearchConfiguration,
  EmbeddingPrecision,
  RerankingDetails,
  SavedSearchSettings,
  SwitchoverType,
} from "../interfaces";
import RerankingDetailsForm from "../RerankingFormPage";
import { useEmbeddingFormContext } from "@/components/context/EmbeddingContext";
import Modal from "@/refresh-components/Modal";
import InstantSwitchConfirmModal from "../modals/InstantSwitchConfirmModal";
import { useRouter } from "next/navigation";
import CardSection from "@/components/admin/CardSection";
import { combineSearchSettings } from "./utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip } from "@opal/components";
import { SvgAlertTriangle, SvgArrowLeft, SvgArrowRight } from "@opal/icons";
export default function EmbeddingForm() {
  const { formStep, nextFormStep, prevFormStep } = useEmbeddingFormContext();
  const router = useRouter();
  const tT = useTranslations("toasts.admin.embedding");
  const t = useTranslations("admin.embeddings");
  const tSearch = useTranslations("admin.searchSettings");

  const [advancedEmbeddingDetails, setAdvancedEmbeddingDetails] =
    useState<AdvancedSearchConfiguration>({
      index_name: "",
      multipass_indexing: true,
      enable_contextual_rag: false,
      contextual_rag_llm_name: null,
      contextual_rag_llm_provider: null,
      disable_rerank_for_streaming: false,
      api_url: null,
      num_rerank: 0,
      embedding_precision: EmbeddingPrecision.BFLOAT16,
      reduced_dimension: null,
    });

  const [rerankingDetails, setRerankingDetails] = useState<RerankingDetails>({
    rerank_api_key: "",
    rerank_provider_type: null,
    rerank_model_name: "",
    rerank_api_url: null,
  });

  const [switchoverType, setSwitchoverType] = useState<SwitchoverType>(
    SwitchoverType.REINDEX
  );

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isFormValid, setIsFormValid] = useState(true);
  const [rerankFormErrors, setRerankFormErrors] = useState<
    Record<string, string>
  >({});
  const [isRerankFormValid, setIsRerankFormValid] = useState(true);
  const advancedFormRef = useRef(null);
  const rerankFormRef = useRef(null);

  const updateAdvancedEmbeddingDetails = (
    key: keyof AdvancedSearchConfiguration,
    value: any
  ) => {
    setAdvancedEmbeddingDetails((values) => ({ ...values, [key]: value }));
  };

  async function updateSearchSettings(searchSettings: SavedSearchSettings) {
    const response = await fetch(
      "/api/search-settings/update-inference-settings",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...searchSettings,
        }),
      }
    );
    return response;
  }

  const updateSelectedProvider = (
    model: CloudEmbeddingModel | HostedEmbeddingModel
  ) => {
    setSelectedProvider(model);
  };
  const [displayPoorModelName, setDisplayPoorModelName] = useState(true);
  const [showPoorModel, setShowPoorModel] = useState(false);
  const [showInstantSwitchConfirm, setShowInstantSwitchConfirm] =
    useState(false);
  const [modelTab, setModelTab] = useState<"open" | "cloud" | null>(null);

  const {
    data: currentEmbeddingModel,
    isLoading: isLoadingCurrentModel,
    error: currentEmbeddingModelError,
  } = useSWR<CloudEmbeddingModel | HostedEmbeddingModel | null>(
    SWR_KEYS.currentSearchSettings,
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );

  const [selectedProvider, setSelectedProvider] = useState<
    CloudEmbeddingModel | HostedEmbeddingModel | null
  >(currentEmbeddingModel!);

  const { data: searchSettings, isLoading: isLoadingSearchSettings } =
    useSWR<SavedSearchSettings | null>(
      SWR_KEYS.currentSearchSettings,
      errorHandlingFetcher,
      { refreshInterval: 5000 } // 5 seconds
    );

  useEffect(() => {
    if (searchSettings) {
      setAdvancedEmbeddingDetails({
        index_name: searchSettings.index_name,
        multipass_indexing: searchSettings.multipass_indexing,
        enable_contextual_rag: searchSettings.enable_contextual_rag,
        contextual_rag_llm_name: searchSettings.contextual_rag_llm_name,
        contextual_rag_llm_provider: searchSettings.contextual_rag_llm_provider,
        disable_rerank_for_streaming:
          searchSettings.disable_rerank_for_streaming,
        num_rerank: searchSettings.num_rerank,
        api_url: null,
        embedding_precision: searchSettings.embedding_precision,
        reduced_dimension: searchSettings.reduced_dimension,
      });

      setRerankingDetails({
        rerank_api_key: searchSettings.rerank_api_key,
        rerank_provider_type: searchSettings.rerank_provider_type,
        rerank_model_name: searchSettings.rerank_model_name,
        rerank_api_url: searchSettings.rerank_api_url,
      });
    }
  }, [searchSettings]);

  const originalRerankingDetails: RerankingDetails = searchSettings
    ? {
        rerank_api_key: searchSettings.rerank_api_key,
        rerank_provider_type: searchSettings.rerank_provider_type,
        rerank_model_name: searchSettings.rerank_model_name,
        rerank_api_url: searchSettings.rerank_api_url,
      }
    : {
        rerank_api_key: "",
        rerank_provider_type: null,
        rerank_model_name: "",
        rerank_api_url: null,
      };

  useEffect(() => {
    if (currentEmbeddingModel) {
      setSelectedProvider(currentEmbeddingModel);
    }
  }, [currentEmbeddingModel]);

  const needsReIndex =
    currentEmbeddingModel != selectedProvider ||
    searchSettings?.multipass_indexing !=
      advancedEmbeddingDetails.multipass_indexing ||
    searchSettings?.embedding_precision !=
      advancedEmbeddingDetails.embedding_precision ||
    searchSettings?.reduced_dimension !=
      advancedEmbeddingDetails.reduced_dimension ||
    searchSettings?.enable_contextual_rag !=
      advancedEmbeddingDetails.enable_contextual_rag;

  const updateSearch = useCallback(async () => {
    if (!selectedProvider) {
      return false;
    }
    const searchSettings = combineSearchSettings(
      selectedProvider,
      advancedEmbeddingDetails,
      rerankingDetails,
      selectedProvider.provider_type?.toLowerCase() as EmbeddingProvider | null,
      switchoverType
    );

    const response = await updateSearchSettings(searchSettings);
    if (response.ok) {
      return true;
    } else {
      toast.error(tT("searchSettingsUpdateFailed"));
      return false;
    }
  }, [
    selectedProvider,
    advancedEmbeddingDetails,
    rerankingDetails,
    switchoverType,
  ]);

  const handleValidationChange = useCallback(
    (isValid: boolean, errors: Record<string, string>) => {
      setIsFormValid(isValid);
      setFormErrors(errors);
    },
    []
  );

  const handleRerankValidationChange = useCallback(
    (isValid: boolean, errors: Record<string, string>) => {
      setIsRerankFormValid(isValid);
      setRerankFormErrors(errors);
    },
    []
  );

  // Combine validation states for both forms
  const isOverallFormValid = isFormValid && isRerankFormValid;
  const combinedFormErrors = useMemo(() => {
    return { ...formErrors, ...rerankFormErrors };
  }, [formErrors, rerankFormErrors]);

  const ReIndexingButton = useMemo(() => {
    const ReIndexingButtonComponent = ({
      needsReIndex,
    }: {
      needsReIndex: boolean;
    }) => {
      return needsReIndex ? (
        <div className="flex mx-auto gap-x-1 ml-auto items-center">
          <div className="flex items-center h-fit">
            {/* TODO(@raunakab): migrate to opal Button once className/iconClassName is resolved */}
            <Button
              onClick={() => {
                if (switchoverType == SwitchoverType.INSTANT) {
                  setShowInstantSwitchConfirm(true);
                } else {
                  handleReIndex();
                  navigateToEmbeddingPage("search settings");
                }
              }}
              disabled={!isOverallFormValid}
              action
              className="rounded-r-none w-32 h-full"
            >
              {switchoverType == SwitchoverType.REINDEX
                ? t("reindexLabel")
                : switchoverType == SwitchoverType.ACTIVE_ONLY
                  ? t("activeOnlyLabel")
                  : t("instantSwitchLabel")}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                {/* TODO(@raunakab): migrate to opal Button once className/iconClassName is resolved */}
                <Button
                  disabled={!isOverallFormValid}
                  action
                  className="rounded-l-none border-l border-white/20 px-1 h-[36px] w-[30px] min-w-[30px]"
                >
                  <CaretDownIcon className="text-text-inverted-05" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem
                  onClick={() => {
                    setSwitchoverType(SwitchoverType.REINDEX);
                  }}
                >
                  <Tooltip tooltip={t("reindexAllTooltip")}>
                    <span className="w-full text-left">
                      {t("reindexRecommended")}
                    </span>
                  </Tooltip>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSwitchoverType(SwitchoverType.ACTIVE_ONLY);
                  }}
                >
                  <Tooltip tooltip={t("reindexActiveTooltip")}>
                    <span className="w-full text-left">
                      {t("activeConnectorsOnly")}
                    </span>
                  </Tooltip>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSwitchoverType(SwitchoverType.INSTANT);
                  }}
                >
                  <Tooltip tooltip={t("instantSwitchTooltip")}>
                    <span className="w-full text-left">
                      {t("instantSwitchLabel")}
                    </span>
                  </Tooltip>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {isOverallFormValid && (
            <div className="relative group">
              <WarningCircle
                className="text-text-800 cursor-help"
                size={20}
                weight="fill"
              />
              <div className="absolute z-10 invisible group-hover:visible bg-background-800 text-text-200 text-sm rounded-md shadow-md p-2 right-0 mt-1 w-64">
                <p className="font-semibold mb-2">{t("needsReindexDueTo")}</p>
                <ul className="list-disc pl-5">
                  {currentEmbeddingModel != selectedProvider && (
                    <li>{t("changedEmbeddingProvider")}</li>
                  )}
                  {searchSettings?.multipass_indexing !=
                    advancedEmbeddingDetails.multipass_indexing && (
                    <li>{t("multipassIndexingModification")}</li>
                  )}
                  {searchSettings?.embedding_precision !=
                    advancedEmbeddingDetails.embedding_precision && (
                    <li>{t("embeddingPrecisionModification")}</li>
                  )}
                  {searchSettings?.reduced_dimension !=
                    advancedEmbeddingDetails.reduced_dimension && (
                    <li>{t("reducedDimensionModification")}</li>
                  )}
                  {(searchSettings?.enable_contextual_rag !=
                    advancedEmbeddingDetails.enable_contextual_rag ||
                    searchSettings?.contextual_rag_llm_name !=
                      advancedEmbeddingDetails.contextual_rag_llm_name ||
                    searchSettings?.contextual_rag_llm_provider !=
                      advancedEmbeddingDetails.contextual_rag_llm_provider) && (
                    <li>{t("contextualRagModification")}</li>
                  )}
                </ul>
              </div>
            </div>
          )}
          {!isOverallFormValid &&
            Object.keys(combinedFormErrors).length > 0 && (
              <div className="relative group">
                <Warning
                  className="text-red-500 cursor-help"
                  size={20}
                  weight="fill"
                />
                <div className="absolute z-10 invisible group-hover:visible bg-background-800 text-text-200 text-sm rounded-md shadow-md p-2 right-0 mt-1 w-64">
                  <p className="font-semibold mb-2">{t("validationErrors")}</p>
                  <ul className="list-disc pl-5">
                    {Object.entries(combinedFormErrors).map(
                      ([field, error]) => (
                        <li key={field}>
                          {field}: {error}
                        </li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            )}
        </div>
      ) : (
        <div className="flex mx-auto gap-x-1 ml-auto items-center">
          <OpalButton
            disabled={!isOverallFormValid}
            onClick={() => {
              updateSearch();
              navigateToEmbeddingPage("search settings");
            }}
          >
            {t("updateSearch")}
          </OpalButton>
          {!isOverallFormValid &&
            Object.keys(combinedFormErrors).length > 0 && (
              <div className="relative group">
                <Warning
                  className="text-red-500 cursor-help"
                  size={20}
                  weight="fill"
                />
                <div className="absolute z-10 invisible group-hover:visible bg-background-800 text-text-200 text-sm rounded-md shadow-md p-2 right-0 mt-1 w-64">
                  <p className="font-semibold mb-2 text-red-400">
                    {t("validationErrors")}
                  </p>
                  <ul className="list-disc pl-5">
                    {Object.entries(combinedFormErrors).map(
                      ([field, error]) => (
                        <li key={field}>{error}</li>
                      )
                    )}
                  </ul>
                </div>
              </div>
            )}
        </div>
      );
    };
    ReIndexingButtonComponent.displayName = "ReIndexingButton";
    return ReIndexingButtonComponent;
  }, [needsReIndex, switchoverType, isOverallFormValid, combinedFormErrors]);

  if (!selectedProvider) {
    return <ThreeDotsLoader />;
  }
  if (currentEmbeddingModelError || !currentEmbeddingModel) {
    return <ErrorCallout errorTitle={tSearch("fetchStatusFailed")} />;
  }

  const updateCurrentModel = (newModel: string) => {
    setAdvancedEmbeddingDetails((values) => ({
      ...values,
      model_name: newModel,
    }));
  };

  const navigateToEmbeddingPage = (changedResource: string) => {
    router.push("/admin/configuration/search?message=search-settings");
  };

  const handleReIndex = async () => {
    if (!selectedProvider) {
      return;
    }
    let searchSettings: SavedSearchSettings;

    if (selectedProvider.provider_type != null) {
      // This is a cloud model
      searchSettings = combineSearchSettings(
        selectedProvider,
        advancedEmbeddingDetails,
        rerankingDetails,
        selectedProvider.provider_type
          ?.toLowerCase()
          .split(" ")[0] as EmbeddingProvider | null,
        switchoverType
      );
    } else {
      // This is a locally hosted model
      searchSettings = combineSearchSettings(
        selectedProvider,
        advancedEmbeddingDetails,
        rerankingDetails,
        null,
        switchoverType
      );
    }

    searchSettings.index_name = null;

    const response = await fetch(
      "/api/search-settings/set-new-search-settings",
      {
        method: "POST",
        body: JSON.stringify(searchSettings),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (response.ok) {
      navigateToEmbeddingPage("embedding model");
    } else {
      toast.error(tT("embeddingModelUpdateFailed"));
      const errorText = await response.text();
      toast.error(
        tT("embeddingModelUpdateFailedDetail", { error: errorText })
      );
    }
  };

  return (
    <div className="mx-auto mb-8 w-full">
      <div className="mx-auto max-w-4xl">
        {formStep == 0 && (
          <>
            <h2 className="text-2xl font-bold mb-4 text-text-800">
              {t("selectEmbeddingModel")}
            </h2>
            <Text as="p" className="mb-4">
              {t("embeddingIntro")}
            </Text>
            <CardSection>
              <EmbeddingModelSelection
                updateCurrentModel={updateCurrentModel}
                setModelTab={setModelTab}
                modelTab={modelTab}
                selectedProvider={selectedProvider}
                currentEmbeddingModel={currentEmbeddingModel}
                updateSelectedProvider={updateSelectedProvider}
                advancedEmbeddingDetails={advancedEmbeddingDetails}
              />
            </CardSection>
            <div className="mt-4 flex w-full justify-end">
              <OpalButton
                variant="action"
                onClick={() => {
                  if (
                    selectedProvider.model_name.includes("e5") &&
                    displayPoorModelName
                  ) {
                    setDisplayPoorModelName(false);
                    setShowPoorModel(true);
                  } else {
                    // Skip reranking step (step 1), go directly to advanced settings (step 2)
                    nextFormStep();
                    nextFormStep();
                  }
                }}
                rightIcon={SvgArrowRight}
              >
                {t("continue")}
              </OpalButton>
            </div>
          </>
        )}
        {showPoorModel && (
          <Modal open onOpenChange={() => setShowPoorModel(false)}>
            <Modal.Content>
              <Modal.Header
                icon={SvgAlertTriangle}
                title={markdown(
                  t("areYouSureSelectModel", {
                    model: selectedProvider.model_name,
                  })
                )}
                onClose={() => setShowPoorModel(false)}
              />
              <Modal.Body>
                <div className="text-lg">
                  <Text as="p">
                    {t("lowerAccuracyIntro", {
                      model: selectedProvider.model_name,
                    })}
                  </Text>
                  <ul className="list-disc list-inside mt-2 ml-4">
                    <li>
                      <Text as="p">{t("cohereCloudOption")}</Text>
                    </li>
                    <li>
                      <Text as="p">{t("nomicSelfHostedOption")}</Text>
                    </li>
                  </ul>
                </div>
              </Modal.Body>
              <Modal.Footer>
                <OpalButton
                  prominence="secondary"
                  onClick={() => setShowPoorModel(false)}
                >
                  {t("cancelUpdate")}
                </OpalButton>
                <OpalButton
                  onClick={() => {
                    setShowPoorModel(false);
                    // Skip reranking step (step 1), go directly to advanced settings (step 2)
                    nextFormStep();
                    nextFormStep();
                  }}
                >
                  {t("continueWithModel", {
                    model: selectedProvider.model_name,
                  })}
                </OpalButton>
              </Modal.Footer>
            </Modal.Content>
          </Modal>
        )}

        {showInstantSwitchConfirm && (
          <InstantSwitchConfirmModal
            onClose={() => setShowInstantSwitchConfirm(false)}
            onConfirm={() => {
              setShowInstantSwitchConfirm(false);
              handleReIndex();
              navigateToEmbeddingPage("search settings");
            }}
          />
        )}

        {formStep == 1 && (
          <>
            <h2 className="text-2xl font-bold mb-4 text-text-800">
              {t("selectRerankingModel")}
            </h2>
            <Text as="p" className="mb-4">
              {t("rerankingIntro")}
            </Text>

            <CardSection>
              <RerankingDetailsForm
                ref={rerankFormRef}
                setModelTab={setModelTab}
                modelTab={
                  originalRerankingDetails.rerank_model_name
                    ? modelTab
                    : modelTab || "cloud"
                }
                currentRerankingDetails={rerankingDetails}
                originalRerankingDetails={originalRerankingDetails}
                setRerankingDetails={setRerankingDetails}
                onValidationChange={handleRerankValidationChange}
              />
            </CardSection>

            <div className={`mt-4 w-full grid grid-cols-3`}>
              <OpalButton
                prominence="secondary"
                icon={SvgArrowLeft}
                onClick={() => prevFormStep()}
              >
                {t("previous")}
              </OpalButton>

              <ReIndexingButton needsReIndex={needsReIndex} />

              <div className="flex w-full justify-end">
                <OpalButton
                  prominence="secondary"
                  onClick={() => {
                    nextFormStep();
                  }}
                  rightIcon={SvgArrowRight}
                >
                  {t("advanced")}
                </OpalButton>
              </div>
            </div>
          </>
        )}
        {formStep == 2 && (
          <>
            <h2 className="text-2xl font-bold mb-4 text-text-800">
              {t("advancedSearchConfig")}
            </h2>
            <Text as="p" className="mb-4">
              {t("advancedIntro")}
            </Text>

            <CardSection>
              <AdvancedEmbeddingFormPage
                ref={advancedFormRef}
                advancedEmbeddingDetails={advancedEmbeddingDetails}
                updateAdvancedEmbeddingDetails={updateAdvancedEmbeddingDetails}
                embeddingProviderType={selectedProvider.provider_type}
                onValidationChange={handleValidationChange}
              />
            </CardSection>

            <div className={`mt-4 grid  grid-cols-3 w-full `}>
              <OpalButton
                prominence="secondary"
                onClick={() => {
                  // Skip reranking step (step 1), go back to embedding model (step 0)
                  prevFormStep();
                  prevFormStep();
                }}
                icon={SvgArrowLeft}
              >
                {t("previous")}
              </OpalButton>

              <ReIndexingButton needsReIndex={needsReIndex} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
