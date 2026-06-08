"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { SvgFold, SvgExpand, SvgAddLines, SvgMaximize2 } from "@opal/icons";
import { Button } from "@opal/components";
import Tag from "@/refresh-components/buttons/Tag";
import Text from "@/refresh-components/texts/Text";
import { Tooltip } from "@opal/components";
import { Section } from "@/layouts/general-layouts";
import { ContentAction } from "@opal/layouts";
import { formatDurationSeconds } from "@opal/time";
import { noProp } from "@/lib/utils";
import MemoriesModal from "@/refresh-components/modals/MemoriesModal";
import { useCreateModal } from "@/refresh-components/contexts/ModalContext";

// =============================================================================
// MemoryTagWithTooltip
// =============================================================================

interface MemoryTagWithTooltipProps {
  memoryText: string | null;
  memoryOperation: "add" | "update" | null;
  memoryId: number | null;
  memoryIndex: number | null;
}

function MemoryTagWithTooltip({
  memoryText,
  memoryOperation,
  memoryId,
  memoryIndex,
}: MemoryTagWithTooltipProps) {
  const t = useTranslations("chat.timeline");
  const memoriesModal = useCreateModal();

  const operationLabel =
    memoryOperation === "add" ? t("addedToMemories") : t("updatedMemory");

  const tag = <Tag icon={SvgAddLines} label={operationLabel} />;

  if (!memoryText) return tag;

  return (
    <>
      <memoriesModal.Provider>
        <MemoriesModal
          initialTargetMemoryId={memoryId}
          initialTargetIndex={memoryIndex}
          highlightOnOpen
        />
      </memoriesModal.Provider>
      {memoriesModal.isOpen ? (
        <span>{tag}</span>
      ) : (
        <Tooltip
          delayDuration={0}
          side="bottom"
          tooltip={
            <Section
              flexDirection="column"
              alignItems="start"
              padding={0.25}
              gap={0.25}
              height="auto"
            >
              <div className="p-1">
                <Text as="p" secondaryBody text03>
                  {memoryText}
                </Text>
              </div>
              <ContentAction
                icon={SvgAddLines}
                title={operationLabel}
                sizePreset="secondary"
                padding="sm"
                variant="body"
                color="muted"
                rightChildren={
                  <Button
                    prominence="tertiary"
                    size="sm"
                    icon={SvgMaximize2}
                    onClick={(e) => {
                      e.stopPropagation();
                      memoriesModal.toggle(true);
                    }}
                  />
                }
              />
            </Section>
          }
        >
          <span>{tag}</span>
        </Tooltip>
      )}
    </>
  );
}

// =============================================================================
// CompletedHeader
// =============================================================================

export interface CompletedHeaderProps {
  totalSteps: number;
  collapsible: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  processingDurationSeconds?: number;
  generatedImageCount?: number;
  isMemoryOnly?: boolean;
  memoryText?: string | null;
  memoryOperation?: "add" | "update" | null;
  memoryId?: number | null;
  memoryIndex?: number | null;
}

/** Header when completed - handles both collapsed and expanded states */
export const CompletedHeader = React.memo(function CompletedHeader({
  totalSteps,
  collapsible,
  isExpanded,
  onToggle,
  processingDurationSeconds = 0,
  generatedImageCount = 0,
  isMemoryOnly = false,
  memoryText = null,
  memoryOperation = null,
  memoryId = null,
  memoryIndex = null,
}: CompletedHeaderProps) {
  const t = useTranslations("chat.timeline");
  const stepsLabel =
    totalSteps === 1
      ? t("stepSingular", { count: totalSteps })
      : t("stepPlural", { count: totalSteps });
  if (isMemoryOnly) {
    return (
      <div className="flex w-full justify-between">
        <div className="flex items-center px-(--timeline-header-text-padding-x) py-(--timeline-header-text-padding-y)">
          <MemoryTagWithTooltip
            memoryText={memoryText}
            memoryOperation={memoryOperation}
            memoryId={memoryId}
            memoryIndex={memoryIndex}
          />
        </div>
        {collapsible && totalSteps > 0 && isExpanded && (
          <Button
            prominence="tertiary"
            size="md"
            onClick={noProp(onToggle)}
            rightIcon={isExpanded ? SvgFold : SvgExpand}
            aria-label={t("expandTimeline")}
            aria-expanded={isExpanded}
          >
            {stepsLabel}
          </Button>
        )}
      </div>
    );
  }

  const durationText = processingDurationSeconds
    ? t("thoughtForDuration", {
        duration: formatDurationSeconds(processingDurationSeconds),
      })
    : t("thoughtForSomeTime");

  const imageText =
    generatedImageCount > 0
      ? generatedImageCount === 1
        ? t("generatedImagesSingular", { count: generatedImageCount })
        : t("generatedImagesPlural", { count: generatedImageCount })
      : null;

  return (
    <div
      role="button"
      onClick={onToggle}
      className="flex items-center justify-between w-full"
    >
      <div className="flex items-center gap-2 px-(--timeline-header-text-padding-x) py-(--timeline-header-text-padding-y)">
        <Text as="p" mainUiAction text03>
          {isExpanded ? durationText : (imageText ?? durationText)}
        </Text>
        {memoryOperation && !isExpanded && (
          <MemoryTagWithTooltip
            memoryText={memoryText}
            memoryOperation={memoryOperation}
            memoryId={memoryId}
            memoryIndex={memoryIndex}
          />
        )}
      </div>

      {collapsible && totalSteps > 0 && (
        <Button
          prominence="tertiary"
          size="md"
          onClick={noProp(onToggle)}
          rightIcon={isExpanded ? SvgFold : SvgExpand}
          aria-label={t("expandTimeline")}
          aria-expanded={isExpanded}
        >
          {stepsLabel}
        </Button>
      )}
    </div>
  );
});
