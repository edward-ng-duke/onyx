import { useTranslations } from "next-intl";
import { Button } from "@opal/components";
import Text from "@/refresh-components/texts/Text";
import { PreviewVariant } from "@/sections/modals/PreviewModal/interfaces";
import { DownloadButton } from "@/sections/modals/PreviewModal/variants/shared";

interface UnsupportedContentProps {
  fileUrl: string;
  fileName: string;
}

function UnsupportedContent({ fileUrl, fileName }: UnsupportedContentProps) {
  const t = useTranslations("modals.preview");
  return (
    <div className="flex flex-col items-center justify-center flex-1 w-full min-h-0 gap-4 p-6">
      <Text as="p" text03 mainUiBody>
        {t("unsupportedDescription")}
      </Text>
      <a href={fileUrl} download={fileName}>
        <Button>{t("downloadFile")}</Button>
      </a>
    </div>
  );
}

export const unsupportedVariant: PreviewVariant = {
  matches: () => true,
  width: "xl",
  height: "full",
  needsTextContent: false,
  codeBackground: false,
  headerDescription: () => "",

  renderContent: (ctx) => (
    <UnsupportedContent fileUrl={ctx.fileUrl} fileName={ctx.fileName} />
  ),

  renderFooterLeft: () => null,
  renderFooterRight: (ctx) => (
    <DownloadButton fileUrl={ctx.fileUrl} fileName={ctx.fileName} />
  ),
};
