"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@opal/components";
import { useProjectsContext } from "@/providers/ProjectsContext";
import InputTextArea from "@/refresh-components/inputs/InputTextArea";
import { useModal } from "@/refresh-components/contexts/ModalContext";
import { SvgAddLines } from "@opal/icons";
import Modal from "@/refresh-components/Modal";

export default function AddInstructionModal() {
  const t = useTranslations("modals.addInstruction");
  const tCommon = useTranslations("common.actions");
  const modal = useModal();
  const { currentProjectDetails, upsertInstructions } = useProjectsContext();
  const [instructionText, setInstructionText] = useState("");

  useEffect(() => {
    if (!modal.isOpen) return;
    const preset = currentProjectDetails?.project?.instructions ?? "";
    setInstructionText(preset);
  }, [modal.isOpen, currentProjectDetails?.project?.instructions]);

  async function handleSubmit() {
    const value = instructionText.trim();
    try {
      await upsertInstructions(value);
    } catch (e) {
      console.error("Failed to save instructions", e);
    }
    modal.toggle(false);
  }

  return (
    <Modal open={modal.isOpen} onOpenChange={modal.toggle}>
      <Modal.Content width="sm">
        <Modal.Header
          icon={SvgAddLines}
          title={t("title")}
          description={t("description")}
          onClose={() => modal.toggle(false)}
        />
        <Modal.Body>
          <InputTextArea
            value={instructionText}
            onChange={(event) => setInstructionText(event.target.value)}
            placeholder={t("placeholder")}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button prominence="secondary" onClick={() => modal.toggle(false)}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleSubmit}>{t("save")}</Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
}
