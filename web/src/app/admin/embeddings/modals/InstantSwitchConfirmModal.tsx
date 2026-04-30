import Modal from "@/refresh-components/Modal";
import { Button } from "@opal/components";
import Text from "@/refresh-components/texts/Text";
import { SvgAlertTriangle } from "@opal/icons";
import { useTranslations } from "next-intl";

export interface InstantSwitchConfirmModalProps {
  onClose: () => void;
  onConfirm: () => void;
}

export default function InstantSwitchConfirmModal({
  onClose,
  onConfirm,
}: InstantSwitchConfirmModalProps) {
  const t = useTranslations("admin.embeddings");
  const tCommon = useTranslations("common.actions");
  return (
    <Modal open onOpenChange={onClose}>
      <Modal.Content width="sm" height="sm">
        <Modal.Header
          icon={SvgAlertTriangle}
          title={t("instantSwitchConfirmTitle")}
          onClose={onClose}
        />
        <Modal.Body>
          <Text as="p">{t("instantSwitchConfirmBody")}</Text>
          <Text as="p">
            <strong>{t("notReversible")}</strong>
          </Text>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={onConfirm}>{tCommon("confirm")}</Button>
          <Button prominence="secondary" onClick={onClose}>
            {tCommon("cancel")}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
