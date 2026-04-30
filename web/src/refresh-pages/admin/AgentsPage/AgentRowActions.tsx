"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@opal/components";
// TODO(@raunakab): migrate to Opal LineItemButton once it supports danger variant
import LineItem from "@/refresh-components/buttons/LineItem";
import { cn, markdown } from "@opal/utils";
import {
  SvgMoreHorizontal,
  SvgEdit,
  SvgEye,
  SvgEyeOff,
  SvgStar,
  SvgStarOff,
  SvgShare,
  SvgBarChart,
  SvgTrash,
} from "@opal/icons";
import Popover, { PopoverMenu } from "@/refresh-components/Popover";
import ConfirmationModalLayout from "@/refresh-components/layouts/ConfirmationModalLayout";
import Text from "@/refresh-components/texts/Text";
import { toast } from "@/hooks/useToast";
import { useRouter } from "next/navigation";
import {
  deleteAgent,
  toggleAgentFeatured,
  toggleAgentListed,
} from "@/refresh-pages/admin/AgentsPage/svc";
import type { AgentRow } from "@/refresh-pages/admin/AgentsPage/interfaces";
import type { Route } from "next";
import ShareAgentModal from "@/sections/modals/ShareAgentModal";
import { useCreateModal } from "@/refresh-components/contexts/ModalContext";
import { useAgent } from "@/hooks/useAgents";
import {
  updateAgentSharedStatus,
  updateAgentFeaturedStatus,
} from "@/lib/agents";
import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";
import { useUser } from "@/providers/UserProvider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentRowActionsProps {
  agent: AgentRow;
  onMutate: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AgentRowActions({
  agent,
  onMutate,
}: AgentRowActionsProps) {
  const t = useTranslations("admin.adminAgents");
  const router = useRouter();
  const { isAdmin, isCurator } = useUser();
  const isPaidEnterpriseFeaturesEnabled = usePaidEnterpriseFeaturesEnabled();
  const canUpdateFeaturedStatus = isAdmin || isCurator;
  const { agent: fullAgent, refresh: refreshAgent } = useAgent(agent.id);
  const shareModal = useCreateModal();

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [featuredOpen, setFeaturedOpen] = useState(false);
  const [unlistOpen, setUnlistOpen] = useState(false);

  async function handleAction(action: () => Promise<void>, close: () => void) {
    setIsSubmitting(true);
    try {
      await action();
      onMutate();
      toast.success(t("updateSuccess", { name: agent.name }));
      close();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("updateError"));
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleShare = useCallback(
    async (
      userIds: string[],
      groupIds: number[],
      isPublic: boolean,
      isFeatured: boolean,
      labelIds: number[]
    ) => {
      const shareError = await updateAgentSharedStatus(
        agent.id,
        userIds,
        groupIds,
        isPublic,
        isPaidEnterpriseFeaturesEnabled,
        labelIds
      );

      if (shareError) {
        toast.error(t("shareFailed", { error: shareError }));
        return;
      }

      if (canUpdateFeaturedStatus) {
        const featuredError = await updateAgentFeaturedStatus(
          agent.id,
          isFeatured
        );
        if (featuredError) {
          toast.error(t("shareFeaturedFailed", { error: featuredError }));
          refreshAgent();
          return;
        }
      }

      refreshAgent();
      onMutate();
      shareModal.toggle(false);
    },
    [
      agent.id,
      isPaidEnterpriseFeaturesEnabled,
      canUpdateFeaturedStatus,
      refreshAgent,
      onMutate,
      t,
      shareModal,
    ]
  );

  return (
    <>
      <shareModal.Provider>
        <ShareAgentModal
          agentId={agent.id}
          userIds={fullAgent?.users?.map((u) => u.id) ?? []}
          groupIds={fullAgent?.groups ?? []}
          isPublic={fullAgent?.is_public ?? false}
          isFeatured={fullAgent?.is_featured ?? false}
          labelIds={fullAgent?.labels?.map((l) => l.id) ?? []}
          onShare={handleShare}
        />
      </shareModal.Provider>

      <div className="flex items-center gap-0.5">
        {/* TODO(@raunakab): abstract a more standardized way of doing this
            appear-on-hover animation. Making Hoverable more extensible
            (e.g. supporting table row groups) would let us use it here
            instead of raw Tailwind group-hover. */}
        {!agent.builtin_persona && (
          <div className="opacity-0 group-hover/row:opacity-100 transition-opacity">
            <Button
              prominence="tertiary"
              icon={SvgEdit}
              tooltip={t("editAgent")}
              onClick={() =>
                router.push(
                  `/app/agents/edit/${
                    agent.id
                  }?u=${Date.now()}&admin=true` as Route
                )
              }
            />
          </div>
        )}
        {!agent.is_listed ? (
          <Button
            prominence="tertiary"
            icon={SvgEyeOff}
            tooltip={t("relistAgent")}
            onClick={() =>
              handleAction(
                () => toggleAgentListed(agent.id, agent.is_listed),
                () => {}
              )
            }
          />
        ) : (
          <div
            className={cn(
              !agent.is_featured &&
                "opacity-0 group-hover/row:opacity-100 transition-opacity"
            )}
          >
            <Button
              prominence="tertiary"
              icon={SvgStar}
              interaction={featuredOpen ? "hover" : "rest"}
              tooltip={
                agent.is_featured ? t("removeFeatured") : t("setAsFeatured")
              }
              onClick={() => {
                setPopoverOpen(false);
                setFeaturedOpen(true);
              }}
            />
          </div>
        )}

        {/* Overflow menu */}
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <div
            className={cn(
              !popoverOpen &&
                "opacity-0 group-hover/row:opacity-100 transition-opacity"
            )}
          >
            <Popover.Trigger asChild>
              <Button prominence="tertiary" icon={SvgMoreHorizontal} />
            </Popover.Trigger>
          </div>
          <Popover.Content align="end" width="sm">
            <PopoverMenu>
              {[
                <LineItem
                  key="visibility"
                  icon={agent.is_listed ? SvgEyeOff : SvgEye}
                  onClick={() => {
                    setPopoverOpen(false);
                    if (agent.is_listed) {
                      setUnlistOpen(true);
                    } else {
                      handleAction(
                        () => toggleAgentListed(agent.id, agent.is_listed),
                        () => {}
                      );
                    }
                  }}
                >
                  {agent.is_listed ? t("unlistAgent") : t("listAgent")}
                </LineItem>,
                <LineItem
                  key="share"
                  icon={SvgShare}
                  onClick={() => {
                    setPopoverOpen(false);
                    shareModal.toggle(true);
                  }}
                >
                  {t("share")}
                </LineItem>,
                isPaidEnterpriseFeaturesEnabled ? (
                  <LineItem
                    key="stats"
                    icon={SvgBarChart}
                    onClick={() => {
                      setPopoverOpen(false);
                      router.push(`/ee/agents/stats/${agent.id}` as Route);
                    }}
                  >
                    {t("stats")}
                  </LineItem>
                ) : undefined,
                !agent.builtin_persona ? null : undefined,
                !agent.builtin_persona ? (
                  <LineItem
                    key="delete"
                    icon={SvgTrash}
                    danger
                    onClick={() => {
                      setPopoverOpen(false);
                      setDeleteOpen(true);
                    }}
                  >
                    {t("delete")}
                  </LineItem>
                ) : undefined,
              ]}
            </PopoverMenu>
          </Popover.Content>
        </Popover>
      </div>

      {deleteOpen && (
        <ConfirmationModalLayout
          icon={SvgTrash}
          title={t("deleteAgentTitle")}
          onClose={isSubmitting ? undefined : () => setDeleteOpen(false)}
          submit={
            <Button
              disabled={isSubmitting}
              variant="danger"
              onClick={() => {
                handleAction(
                  () => deleteAgent(agent.id),
                  () => setDeleteOpen(false)
                );
              }}
            >
              {t("delete")}
            </Button>
          }
        >
          <Text as="p" text03>
            {t("deleteAgentBodyPrefix")}{" "}
            <Text as="span" text05>
              {agent.name}
            </Text>
            {t("deleteAgentBodySuffix")}
          </Text>
        </ConfirmationModalLayout>
      )}

      {featuredOpen && (
        <ConfirmationModalLayout
          icon={agent.is_featured ? SvgStarOff : SvgStar}
          title={
            agent.is_featured
              ? t("removeFeaturedTitle", { name: agent.name })
              : t("featureTitle", { name: agent.name })
          }
          onClose={isSubmitting ? undefined : () => setFeaturedOpen(false)}
          submit={
            <Button
              disabled={isSubmitting}
              onClick={() => {
                handleAction(
                  () => toggleAgentFeatured(agent.id, agent.is_featured),
                  () => setFeaturedOpen(false)
                );
              }}
            >
              {agent.is_featured ? t("unfeatureSubmit") : t("featureSubmit")}
            </Button>
          }
        >
          <div className="flex flex-col gap-2">
            <Text as="p" text03>
              {agent.is_featured
                ? t("featuredBodyRemove", { name: agent.name })
                : t("featuredBodyAdd")}
            </Text>
            <Text as="p" text03>
              {t("doesNotChangeAccess")}
            </Text>
          </div>
        </ConfirmationModalLayout>
      )}

      {unlistOpen && (
        <ConfirmationModalLayout
          icon={SvgEyeOff}
          title={markdown(t("unlistTitle", { name: agent.name }))}
          onClose={isSubmitting ? undefined : () => setUnlistOpen(false)}
          submit={
            <Button
              disabled={isSubmitting}
              onClick={() => {
                handleAction(
                  () => toggleAgentListed(agent.id, agent.is_listed),
                  () => setUnlistOpen(false)
                );
              }}
            >
              {t("unlistSubmit")}
            </Button>
          }
        >
          <div className="flex flex-col gap-2">
            <Text as="p" text03>
              {t("unlistBody")}
            </Text>
            <Text as="p" text03>
              {t("doesNotChangeAccess")}
            </Text>
          </div>
        </ConfirmationModalLayout>
      )}
    </>
  );
}
