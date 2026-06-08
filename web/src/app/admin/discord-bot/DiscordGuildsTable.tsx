"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DeleteButton } from "@/components/DeleteButton";
import { Button } from "@opal/components";
import { Switch } from "@opal/components";
import { SvgEdit, SvgServer } from "@opal/icons";
import { EmptyMessageCard } from "@opal/components";
import { DiscordGuildConfig } from "@/app/admin/discord-bot/types";
import {
  deleteGuildConfig,
  updateGuildConfig,
} from "@/app/admin/discord-bot/lib";
import { toast } from "@/hooks/useToast";
import { ConfirmEntityModal } from "@/sections/modals/ConfirmEntityModal";

interface Props {
  guilds: DiscordGuildConfig[];
  onRefresh: () => void;
}

export function DiscordGuildsTable({ guilds, onRefresh }: Props) {
  const t = useTranslations("admin.discordBot");
  const router = useRouter();
  const [guildToDelete, setGuildToDelete] = useState<DiscordGuildConfig | null>(
    null
  );
  const [updatingGuildIds, setUpdatingGuildIds] = useState<Set<number>>(
    new Set()
  );

  const handleDelete = async (guildId: number) => {
    try {
      await deleteGuildConfig(guildId);
      onRefresh();
      toast.success(t("deleteGuildSuccess"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("deleteGuildFailed"));
    } finally {
      setGuildToDelete(null);
    }
  };

  const handleToggleEnabled = async (guild: DiscordGuildConfig) => {
    if (!guild.guild_id) {
      toast.error(t("guildToggleNotRegistered"));
      return;
    }

    setUpdatingGuildIds((prev) => new Set(prev).add(guild.id));
    try {
      await updateGuildConfig(guild.id, {
        enabled: !guild.enabled,
        default_persona_id: guild.default_persona_id,
      });
      onRefresh();
      toast.success(
        !guild.enabled ? t("guildToggleEnabled") : t("guildToggleDisabled")
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("guildToggleFailed"));
    } finally {
      setUpdatingGuildIds((prev) => {
        const next = new Set(prev);
        next.delete(guild.id);
        return next;
      });
    }
  };

  if (guilds.length === 0) {
    return (
      <EmptyMessageCard
        sizePreset="main-ui"
        icon={SvgServer}
        title={t("guildsEmptyTitle")}
        description={t("guildsEmptyDescription")}
      />
    );
  }

  return (
    <>
      {guildToDelete && (
        <ConfirmEntityModal
          danger
          entityType={t("deleteGuildEntityType")}
          entityName={
            guildToDelete.guild_name ||
            t("fallbackServerName", { id: guildToDelete.id })
          }
          onClose={() => setGuildToDelete(null)}
          onSubmit={() => handleDelete(guildToDelete.id)}
          additionalDetails={t("deleteGuildAdditionalDetails")}
        />
      )}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("columnServer")}</TableHead>
            <TableHead>{t("columnStatus")}</TableHead>
            <TableHead>{t("columnRegistered")}</TableHead>
            <TableHead>{t("columnEnabled")}</TableHead>
            <TableHead>{t("columnActions")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {guilds.map((guild) => (
            <TableRow key={guild.id}>
              <TableCell>
                <Button
                  disabled={!guild.guild_id}
                  prominence="internal"
                  onClick={() => router.push(`/admin/discord-bot/${guild.id}`)}
                  icon={SvgEdit}
                >
                  {guild.guild_name ||
                    t("fallbackServerName", { id: guild.id })}
                </Button>
              </TableCell>
              <TableCell>
                {guild.guild_id ? (
                  <Badge variant="success">{t("registered")}</Badge>
                ) : (
                  <Badge variant="secondary">{t("pending")}</Badge>
                )}
              </TableCell>
              <TableCell>
                {guild.registered_at
                  ? new Date(guild.registered_at).toLocaleDateString()
                  : "-"}
              </TableCell>
              <TableCell>
                {!guild.guild_id ? (
                  "-"
                ) : (
                  <Switch
                    checked={guild.enabled}
                    onCheckedChange={() => handleToggleEnabled(guild)}
                    disabled={updatingGuildIds.has(guild.id)}
                  />
                )}
              </TableCell>
              <TableCell>
                <DeleteButton onClick={() => setGuildToDelete(guild)} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </>
  );
}
