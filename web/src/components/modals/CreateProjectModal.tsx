"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@opal/components";
import { useProjectsContext } from "@/providers/ProjectsContext";
import { useKeyPress } from "@/hooks/useKeyPress";
import { InputVertical } from "@opal/layouts";
import { useAppRouter } from "@/hooks/appNavigation";
import { useModal } from "@/refresh-components/contexts/ModalContext";
import { SvgFolderPlus } from "@opal/icons";
import Modal from "@/refresh-components/Modal";
import InputTypeIn from "@/refresh-components/inputs/InputTypeIn";
import { toast } from "@/hooks/useToast";

interface CreateProjectModalProps {
  initialProjectName?: string;
}

export default function CreateProjectModal({
  initialProjectName,
}: CreateProjectModalProps) {
  const t = useTranslations("components.createProjectModal");
  const tCommon = useTranslations("common.actions");
  const { createProject } = useProjectsContext();
  const modal = useModal();
  const route = useAppRouter();
  const [projectName, setProjectName] = useState(initialProjectName ?? "");

  // Reset when prop changes (modal reopens with different value)
  useEffect(() => {
    setProjectName(initialProjectName ?? "");
  }, [initialProjectName]);

  async function handleSubmit() {
    const name = projectName.trim();
    if (!name) return;

    try {
      const newProject = await createProject(name);
      route({ projectId: newProject.id });
      modal.toggle(false);
    } catch (e) {
      toast.error(t("createFailed", { name }));
    }
  }

  useKeyPress(handleSubmit, "Enter");

  return (
    <>
      <Modal open={modal.isOpen} onOpenChange={modal.toggle}>
        <Modal.Content width="sm">
          <Modal.Header
            icon={SvgFolderPlus}
            title={t("title")}
            description={t("description")}
            onClose={() => modal.toggle(false)}
          />
          <Modal.Body>
            <InputVertical title={t("projectName")} withLabel>
              <InputTypeIn
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder={t("placeholder")}
                showClearButton
              />
            </InputVertical>
          </Modal.Body>
          <Modal.Footer>
            <Button prominence="secondary" onClick={() => modal.toggle(false)}>
              {tCommon("cancel")}
            </Button>
            <Button disabled={!projectName.trim()} onClick={handleSubmit}>
              {t("submit")}
            </Button>
          </Modal.Footer>
        </Modal.Content>
      </Modal>
    </>
  );
}
