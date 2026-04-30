import Modal from "@/refresh-components/Modal";
import Text from "@/refresh-components/texts/Text";
import { Callout } from "@/components/ui/callout";
import { Button, Text as OpalText } from "@opal/components";
import { HostedEmbeddingModel } from "@/components/embedding/interfaces";
import { SvgServer } from "@opal/icons";
import { useTranslations } from "next-intl";
import { markdown } from "@opal/utils";

export interface ModelSelectionConfirmationModalProps {
  selectedModel: HostedEmbeddingModel;
  isCustom: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ModelSelectionConfirmationModal({
  selectedModel,
  isCustom,
  onConfirm,
  onCancel,
}: ModelSelectionConfirmationModalProps) {
  const t = useTranslations("admin.embeddings");
  const tCommon = useTranslations("common.actions");
  return (
    <Modal open onOpenChange={onCancel}>
      <Modal.Content width="sm" height="lg">
        <Modal.Header
          icon={SvgServer}
          title={t("updateEmbeddingModel")}
          onClose={onCancel}
        />
        <Modal.Body>
          <OpalText as="p" font="main-ui-body">
            {markdown(
              t("updateModelConfirm", { model: selectedModel.model_name })
            )}
          </OpalText>
          <Text as="p">{t("reindexBackgroundNotice")}</Text>
          <OpalText as="p" font="main-ui-body">
            {markdown(t("noteRamRequirement"))}
          </OpalText>

          {isCustom && (
            <Callout type="warning" title={t("important")}>
              <OpalText font="main-ui-body">
                {markdown(t("customModelWarning"))}
              </OpalText>
            </Callout>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={onConfirm}>{tCommon("confirm")}</Button>
          <Button prominence="secondary" onClick={onCancel}>
            {tCommon("cancel")}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
