import { useTranslations } from "next-intl";
import Modal from "@/refresh-components/Modal";
import { Button } from "@opal/components";
import { CloudEmbeddingModel } from "../../../../components/embedding/interfaces";
import { markdown } from "@opal/utils";
import { SvgCheck } from "@opal/icons";

export interface AlreadyPickedModalProps {
  model: CloudEmbeddingModel;
  onClose: () => void;
}

export default function AlreadyPickedModal({
  model,
  onClose,
}: AlreadyPickedModalProps) {
  const t = useTranslations("admin.embeddings.alreadyPickedModal");
  const tCommon = useTranslations("common.actions");
  return (
    <Modal open onOpenChange={onClose}>
      <Modal.Content width="sm" height="sm">
        <Modal.Header
          icon={SvgCheck}
          title={markdown(t("title", { modelName: model.model_name }))}
          description={t("description")}
          onClose={onClose}
        />
        <Modal.Footer>
          <Button onClick={onClose}>{tCommon("close")}</Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
