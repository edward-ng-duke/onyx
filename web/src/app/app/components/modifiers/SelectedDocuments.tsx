import { useTranslations } from "next-intl";
import { BasicClickable } from "@/components/BasicClickable";
import { OnyxDocument } from "@/lib/search/interfaces";
import { FiBook } from "react-icons/fi";

export function SelectedDocuments({
  selectedDocuments,
}: {
  selectedDocuments: OnyxDocument[];
}) {
  const t = useTranslations("chat.modifiers");
  if (selectedDocuments.length === 0) {
    return null;
  }

  const count = selectedDocuments.length;
  const label =
    count === 1
      ? t("chattingWithDocsSingular", { count })
      : t("chattingWithDocsPlural", { count });

  return (
    <BasicClickable>
      <div className="flex text-xs max-w-md overflow-hidden">
        <FiBook className="my-auto mr-1" />{" "}
        <div className="w-fit whitespace-nowrap">{label}</div>
      </div>
    </BasicClickable>
  );
}
