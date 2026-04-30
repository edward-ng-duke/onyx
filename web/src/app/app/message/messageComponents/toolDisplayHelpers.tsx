import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { FiCircle, FiList, FiTool } from "react-icons/fi";
import {
  Packet,
  PacketType,
  SearchToolPacket,
} from "@/app/app/services/streamingModels";
import { constructCurrentSearchState } from "./timeline/renderers/search/searchStateUtils";
import {
  SvgGlobe,
  SvgSearchMenu,
  SvgTerminal,
  SvgLink,
  SvgImage,
  SvgUser,
  SvgCircle,
  SvgBookOpen,
  SvgSlowTime,
  SvgXCircle,
} from "@opal/icons";

/**
 * Check if a packet group contains an ERROR packet (tool failed)
 */
export function hasToolError(packets: Packet[]): boolean {
  return packets.some((p) => p.obj.type === PacketType.ERROR);
}

/**
 * Check if a tool group is complete.
 * For research agents, we only look at parent-level SECTION_END packets (sub_turn_index is undefined/null),
 * not the SECTION_END packets from nested tools (which have sub_turn_index as a number).
 */
export function isToolComplete(packets: Packet[]): boolean {
  const firstPacket = packets[0];
  if (!firstPacket) return false;

  // For research agents, only parent-level SECTION_END indicates completion
  // Nested tools (search, fetch, etc.) within the research agent have sub_turn_index set
  if (firstPacket.obj.type === PacketType.RESEARCH_AGENT_START) {
    return packets.some(
      (p) =>
        (p.obj.type === PacketType.SECTION_END ||
          p.obj.type === PacketType.ERROR) &&
        (p.placement.sub_turn_index === undefined ||
          p.placement.sub_turn_index === null)
    );
  }

  // For other tools, any SECTION_END or ERROR indicates completion
  return packets.some(
    (p) =>
      p.obj.type === PacketType.SECTION_END || p.obj.type === PacketType.ERROR
  );
}

/**
 * Get an error icon for failed tools
 */
export function getToolErrorIcon(): React.ReactNode {
  return <SvgXCircle className="w-3.5 h-3.5 text-error" />;
}

export function getToolKey(turn_index: number, tab_index: number): string {
  return `${turn_index}-${tab_index}`;
}

export function parseToolKey(key: string): {
  turn_index: number;
  tab_index: number;
} {
  const parts = key.split("-");
  return {
    turn_index: parseInt(parts[0] ?? "0", 10),
    tab_index: parseInt(parts[1] ?? "0", 10),
  };
}

/**
 * Hook that returns a memoized localized tool-name resolver.
 * Use this in components to translate tool names; the returned function is stable
 * for the lifetime of the translation locale.
 */
export function useToolName(): (packets: Packet[]) => string {
  const t = useTranslations("chat.tools");
  return useCallback(
    (packets: Packet[]): string => {
      const firstPacket = packets[0];
      if (!firstPacket) return t("tool");

      switch (firstPacket.obj.type) {
        case PacketType.SEARCH_TOOL_START: {
          const searchState = constructCurrentSearchState(
            packets as SearchToolPacket[]
          );
          return searchState.isInternetSearch
            ? t("webSearch")
            : t("internalSearch");
        }
        case PacketType.PYTHON_TOOL_START:
          return t("codeInterpreter");
        case PacketType.FETCH_TOOL_START:
          return t("openUrls");
        case PacketType.CUSTOM_TOOL_START:
          return (
            (firstPacket.obj as { tool_name?: string }).tool_name ||
            t("customTool")
          );
        case PacketType.IMAGE_GENERATION_TOOL_START:
          return t("generateImage");
        case PacketType.DEEP_RESEARCH_PLAN_START:
          return t("generatePlan");
        case PacketType.RESEARCH_AGENT_START:
          return t("researchAgent");
        case PacketType.REASONING_START:
          return t("thinking");
        case PacketType.MEMORY_TOOL_START:
        case PacketType.MEMORY_TOOL_NO_ACCESS:
          return t("memory");
        default:
          return t("tool");
      }
    },
    [t]
  );
}

/**
 * Plain (non-localized) helper used for completion-state checks where a name
 * is needed for log/data purposes only — not for UI rendering.
 * Falls back to packet metadata where present.
 */
export function getToolNameRaw(packets: Packet[]): string {
  const firstPacket = packets[0];
  if (!firstPacket) return "Tool";

  switch (firstPacket.obj.type) {
    case PacketType.CUSTOM_TOOL_START:
      return (
        (firstPacket.obj as { tool_name?: string }).tool_name || "Custom Tool"
      );
    case PacketType.SEARCH_TOOL_START:
      return "Search";
    case PacketType.PYTHON_TOOL_START:
      return "Python";
    case PacketType.FETCH_TOOL_START:
      return "Fetch";
    case PacketType.IMAGE_GENERATION_TOOL_START:
      return "Image";
    case PacketType.DEEP_RESEARCH_PLAN_START:
      return "Plan";
    case PacketType.RESEARCH_AGENT_START:
      return "Research";
    case PacketType.REASONING_START:
      return "Reasoning";
    case PacketType.MEMORY_TOOL_START:
    case PacketType.MEMORY_TOOL_NO_ACCESS:
      return "Memory";
    default:
      return "Tool";
  }
}

export function getToolIcon(packets: Packet[]): React.ReactNode {
  const firstPacket = packets[0];
  if (!firstPacket) return <FiCircle className="w-3.5 h-3.5" />;

  switch (firstPacket.obj.type) {
    case PacketType.SEARCH_TOOL_START: {
      const searchState = constructCurrentSearchState(
        packets as SearchToolPacket[]
      );
      return searchState.isInternetSearch ? (
        <SvgGlobe className="w-3.5 h-3.5" />
      ) : (
        <SvgSearchMenu className="w-3.5 h-3.5" />
      );
    }
    case PacketType.PYTHON_TOOL_START:
      return <SvgTerminal className="w-3.5 h-3.5" />;
    case PacketType.FETCH_TOOL_START:
      return <SvgLink className="w-3.5 h-3.5" />;
    case PacketType.CUSTOM_TOOL_START:
      return <FiTool className="w-3.5 h-3.5" />;
    case PacketType.IMAGE_GENERATION_TOOL_START:
      return <SvgImage className="w-3.5 h-3.5" />;
    case PacketType.DEEP_RESEARCH_PLAN_START:
      return <FiList className="w-3.5 h-3.5" />;
    case PacketType.RESEARCH_AGENT_START:
      return <SvgUser className="w-3.5 h-3.5" />;
    case PacketType.REASONING_START:
      return <SvgSlowTime className="w-3.5 h-3.5" />;
    case PacketType.MEMORY_TOOL_START:
    case PacketType.MEMORY_TOOL_NO_ACCESS:
      return <SvgBookOpen className="w-3.5 h-3.5" />;
    default:
      return <SvgCircle className="w-3.5 h-3.5" />;
  }
}
