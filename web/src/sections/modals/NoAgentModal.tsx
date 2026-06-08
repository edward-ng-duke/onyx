"use client";

import Modal from "@/refresh-components/Modal";
import { Button } from "@opal/components";
import Text from "@/refresh-components/texts/Text";
import { useUser } from "@/providers/UserProvider";
import { SvgUser } from "@opal/icons";
import { useTranslations } from "next-intl";

export default function NoAgentModal() {
  const { isAdmin } = useUser();
  const t = useTranslations("modals.noAgent");

  return (
    <Modal open>
      <Modal.Content width="sm" height="sm">
        <Modal.Header icon={SvgUser} title={t("title")} />
        <Modal.Body>
          <Text as="p">{t("body")}</Text>
          {isAdmin ? (
            <>
              <Text as="p">{t("adminHelp")}</Text>
              <Button width="full" href="/admin/agents">
                {t("goToAdminPanel")}
              </Button>
            </>
          ) : (
            <Text as="p">{t("userHelp")}</Text>
          )}
        </Modal.Body>
      </Modal.Content>
    </Modal>
  );
}
