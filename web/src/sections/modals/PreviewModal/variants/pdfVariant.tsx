import { useTranslations } from "next-intl";
import { Section } from "@/layouts/general-layouts";
import { PreviewVariant } from "@/sections/modals/PreviewModal/interfaces";
import { DownloadButton } from "@/sections/modals/PreviewModal/variants/shared";

function PdfFrame({ fileUrl }: { fileUrl: string }) {
  const t = useTranslations("modals.preview");
  return (
    <iframe
      src={`${fileUrl}#toolbar=0`}
      className="w-full h-full flex-1 min-h-0 border-none"
      title={t("pdfViewer")}
    />
  );
}

export const pdfVariant: PreviewVariant = {
  matches: (_name, mime) => mime === "application/pdf",
  width: "full",
  height: "full",
  needsTextContent: false,
  codeBackground: false,
  headerDescription: () => "",

  renderContent: (ctx) => <PdfFrame fileUrl={ctx.fileUrl} />,

  renderFooterLeft: () => null,
  renderFooterRight: (ctx) => (
    <Section flexDirection="row" width="fit">
      <DownloadButton fileUrl={ctx.fileUrl} fileName={ctx.fileName} />
    </Section>
  ),
};
