import { useTranslations } from "next-intl";
import { Button } from "@opal/components";
import { SvgDownload, SvgZoomIn, SvgZoomOut } from "@opal/icons";
import Text from "@/refresh-components/texts/Text";
import { Section } from "@/layouts/general-layouts";

interface DownloadButtonProps {
  fileUrl: string;
  fileName: string;
}

export function DownloadButton({ fileUrl, fileName }: DownloadButtonProps) {
  const t = useTranslations("modals.preview");
  return (
    <a href={fileUrl} download={fileName}>
      <Button
        prominence="tertiary"
        size="sm"
        icon={SvgDownload}
        tooltip={t("download")}
      />
    </a>
  );
}

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
}

export function ZoomControls({ zoom, onZoomIn, onZoomOut }: ZoomControlsProps) {
  const t = useTranslations("modals.preview");
  return (
    <div className="rounded-12 bg-background-tint-00 p-1 shadow-lg">
      <Section flexDirection="row" width="fit">
        <Button
          prominence="tertiary"
          size="sm"
          icon={SvgZoomOut}
          onClick={onZoomOut}
          tooltip={t("zoomOut")}
        />
        <Text mainUiMono text03>
          {zoom}%
        </Text>
        <Button
          prominence="tertiary"
          size="sm"
          icon={SvgZoomIn}
          onClick={onZoomIn}
          tooltip={t("zoomIn")}
        />
      </Section>
    </div>
  );
}
