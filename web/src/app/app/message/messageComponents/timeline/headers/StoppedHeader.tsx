import React from "react";
import { useTranslations } from "next-intl";
import { SvgFold, SvgExpand } from "@opal/icons";
import { Button } from "@opal/components";
import Text from "@/refresh-components/texts/Text";
import { noProp } from "@/lib/utils";
import { cn } from "@opal/utils";

export interface StoppedHeaderProps {
  totalSteps: number;
  collapsible: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}

/** Header when user stopped/cancelled */
export const StoppedHeader = React.memo(function StoppedHeader({
  totalSteps,
  collapsible,
  isExpanded,
  onToggle,
}: StoppedHeaderProps) {
  const tSession = useTranslations("chat.session");
  const t = useTranslations("chat.timeline");
  const isInteractive = collapsible && totalSteps > 0;
  const stepsLabel =
    totalSteps === 1
      ? t("stepSingular", { count: totalSteps })
      : t("stepPlural", { count: totalSteps });

  return (
    <div
      role={isInteractive ? "button" : undefined}
      onClick={isInteractive ? onToggle : undefined}
      className={cn(
        "flex items-center justify-between w-full rounded-12",
        isInteractive ? "cursor-pointer" : "cursor-default"
      )}
      aria-disabled={isInteractive ? undefined : true}
    >
      <div className="px-(--timeline-header-text-padding-x) py-(--timeline-header-text-padding-y)">
        <Text as="p" mainUiAction text03>
          {tSession("interruptedThinking")}
        </Text>
      </div>

      {isInteractive && (
        <Button
          prominence="tertiary"
          size="md"
          onClick={noProp(onToggle)}
          rightIcon={isExpanded ? SvgFold : SvgExpand}
          aria-label={
            isExpanded ? t("collapseTimeline") : t("expandTimeline")
          }
          aria-expanded={isExpanded}
        >
          {stepsLabel}
        </Button>
      )}
    </div>
  );
});
