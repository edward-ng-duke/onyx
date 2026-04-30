"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button, MessageCard } from "@opal/components";
import { ToolSnapshot } from "@/lib/tools/interfaces";
import { initiateOAuthFlow } from "@/lib/oauth/api";
import { useToolOAuthStatus } from "@/lib/hooks/useToolOAuthStatus";
import { SvgArrowExchange } from "@opal/icons";

interface CustomToolAuthCardProps {
  toolName: string;
  toolId: number | null;
  tools: ToolSnapshot[];
  agentId: number;
}

function CustomToolAuthCard({
  toolName,
  toolId,
  tools,
  agentId,
}: CustomToolAuthCardProps) {
  const t = useTranslations("chat.customTool");
  const { getToolAuthStatus } = useToolOAuthStatus(agentId);
  const matchedTool = useMemo(() => {
    if (toolId == null) return null;
    return tools.find((t) => t.id === toolId) ?? null;
  }, [toolId, tools]);

  // Hide the card if the user already has a valid token
  const authStatus = matchedTool ? getToolAuthStatus(matchedTool) : undefined;
  if (authStatus?.hasToken && !authStatus.isTokenExpired) {
    return null;
  }

  const oauthConfigId = matchedTool?.oauth_config_id ?? null;

  // No OAuth config — nothing actionable to show
  if (!oauthConfigId) {
    return null;
  }

  const handleAuthenticate = () => {
    initiateOAuthFlow(
      oauthConfigId,
      window.location.pathname + window.location.search
    );
  };

  return (
    <MessageCard
      title={t("notConnectedTitle", { toolName })}
      description={t("notConnectedDescription", { toolName })}
      rightChildren={
        <Button
          prominence="primary"
          icon={SvgArrowExchange}
          onClick={handleAuthenticate}
        >
          {t("connect")}
        </Button>
      }
    />
  );
}

export default CustomToolAuthCard;
