import Modal from "@/refresh-components/Modal";
import Text from "@/refresh-components/texts/Text";
import { Button } from "@opal/components";
import { Callout } from "@/components/ui/callout";
import {
  CloudEmbeddingProvider,
  getFormattedProviderName,
} from "../../../../components/embedding/interfaces";
import { SvgTrash } from "@opal/icons";
import { markdown } from "@opal/utils";
import { useTranslations } from "next-intl";

export interface DeleteCredentialsModalProps {
  modelProvider: CloudEmbeddingProvider;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteCredentialsModal({
  modelProvider,
  onConfirm,
  onCancel,
}: DeleteCredentialsModalProps) {
  const t = useTranslations("admin.embeddings");
  const providerName = getFormattedProviderName(modelProvider.provider_type);
  return (
    <Modal open onOpenChange={onCancel}>
      <Modal.Content width="sm" height="sm">
        <Modal.Header
          icon={SvgTrash}
          title={markdown(
            t("deleteCredentialsTitle", { provider: providerName })
          )}
          onClose={onCancel}
        />
        <Modal.Body>
          <Text as="p">
            {t("deleteCredentialsBody", { provider: providerName })}
          </Text>
          <Callout type="danger" title={t("pointOfNoReturn")} />
        </Modal.Body>
        <Modal.Footer>
          <Button prominence="secondary" onClick={onCancel}>
            {t("keepCredentials")}
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            {t("deleteCredentials")}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
