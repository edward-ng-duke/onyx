"use client";

import { useTranslations } from "next-intl";
import Modal from "@/refresh-components/Modal";
import { SvgBarChartSmall } from "@opal/icons";
import StageMetricsPanel from "./stage-metrics/StageMetricsPanel";

interface StageMetricsModalProps {
  indexAttemptId: number;
  onClose: () => void;
}

export default function StageMetricsModal({
  indexAttemptId,
  onClose,
}: StageMetricsModalProps) {
  const t = useTranslations("admin.connectorDetail.stageMetricsModal");
  return (
    <Modal open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <Modal.Content width="lg" height="lg">
        <Modal.Header
          icon={SvgBarChartSmall}
          title={t("title")}
          description={t("description")}
          onClose={onClose}
        />
        <Modal.Body>
          <StageMetricsPanel indexAttemptId={indexAttemptId} />
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );
}
