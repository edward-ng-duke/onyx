"use client";

import React, { useRef, useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import Text from "@/refresh-components/texts/Text";
import { InputTypeIn } from "@opal/components";
import { updateUserPersonalization } from "@/lib/userSettings";
import { useUser } from "@/providers/UserProvider";
import { toast } from "@/hooks/useToast";
import IconButton from "@/refresh-components/buttons/IconButton";
import { Button } from "@opal/components";
import InputAvatar from "@/refresh-components/inputs/InputAvatar";
import { cn } from "@opal/utils";
import { SvgCheckCircle, SvgEdit, SvgUser, SvgX } from "@opal/icons";
import { ContentAction } from "@opal/layouts";
import { Hoverable } from "@opal/core";

export default function NonAdminStep() {
  const tToast = useTranslations("toasts.onboarding");
  const tOnboarding = useTranslations("sections.onboarding");
  const tName = useTranslations("sections.onboarding.name");
  const tCommon = useTranslations("common.actions");
  const inputRef = useRef<HTMLInputElement>(null);
  const { user, refreshUser } = useUser();
  const [name, setName] = useState("");
  const [showHeader, setShowHeader] = useState(false);
  const [isEditing, setIsEditing] = useState(true);
  const [savedName, setSavedName] = useState("");

  // Initialize name from user if available
  useEffect(() => {
    if (user?.personalization?.name && !savedName) {
      setSavedName(user.personalization.name);
      setIsEditing(false);
    }
  }, [user?.personalization?.name, savedName]);

  const containerClasses = cn(
    "flex items-center justify-between w-full p-3 bg-background-tint-00 rounded-16 border border-border-01 mb-4"
  );

  const handleSave = () => {
    updateUserPersonalization({ name })
      .then(() => {
        setSavedName(name);
        setShowHeader(true);
        setIsEditing(false);
        // Don't call refreshUser() here — it would cause OnboardingFlow to
        // unmount this component (since user.personalization.name becomes set),
        // hiding the confirmation banner before the user sees it.
        // refreshUser() is called in handleDismissConfirmation instead.
      })
      .catch((error) => {
        toast.error(tToast("saveNameFailed"));
        console.error(error);
      });
  };

  const handleDismissConfirmation = () => {
    setShowHeader(false);
    refreshUser();
  };

  return (
    <>
      {showHeader && (
        <div
          className="flex items-center justify-between w-full min-h-11 py-1 pl-3 pr-2 bg-background-tint-00 rounded-16 shadow-01 mb-2"
          aria-label="non-admin-confirmation"
        >
          <ContentAction
            icon={({ className, ...props }) => (
              <SvgCheckCircle
                className={cn(className, "stroke-status-success-05")}
                {...props}
              />
            )}
            title={tOnboarding("nonAdmin.allSet")}
            sizePreset="main-ui"
            variant="body"
            color="muted"
            padding="fit"
            rightChildren={
              <Button
                prominence="tertiary"
                size="sm"
                icon={SvgX}
                onClick={handleDismissConfirmation}
              />
            }
          />
        </div>
      )}
      {isEditing ? (
        <div
          className={containerClasses}
          onClick={() => inputRef.current?.focus()}
          role="group"
          aria-label="non-admin-name-prompt"
        >
          <ContentAction
            icon={SvgUser}
            title={tName("promptTitle")}
            description={tName("promptDescription")}
            sizePreset="main-ui"
            variant="section"
            padding="fit"
            rightChildren={
              <div className="flex items-center justify-end gap-2">
                <InputTypeIn
                  ref={inputRef}
                  placeholder={tName("placeholder")}
                  value={name || ""}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setName(e.target.value)
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && name && name.trim().length > 0) {
                      e.preventDefault();
                      handleSave();
                    }
                  }}
                />
                <Button disabled={name === ""} onClick={handleSave}>
                  {tCommon("save")}
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <Hoverable.Root group="nonAdminName" width="full">
          <div
            className={containerClasses}
            aria-label={tName("editAriaLabel")}
            role="button"
            tabIndex={0}
            onClick={() => {
              setIsEditing(true);
              setName(savedName);
            }}
          >
            <div className="flex items-center gap-1">
              <InputAvatar
                className={cn(
                  "flex items-center justify-center bg-background-neutral-inverted-00",
                  "w-5 h-5"
                )}
              >
                <Text as="p" inverted secondaryBody>
                  {savedName?.[0]?.toUpperCase()}
                </Text>
              </InputAvatar>
              <Text as="p" text04 mainUiAction>
                {savedName}
              </Text>
            </div>
            <div className="p-1 flex items-center gap-1">
              {/* TODO(@raunakab): migrate to opal Button once className/iconClassName is resolved */}
              <Hoverable.Item group="nonAdminName" variant="appear-on-hover">
                <IconButton internal icon={SvgEdit} tooltip={tCommon("edit")} />
              </Hoverable.Item>
              <SvgCheckCircle className="w-4 h-4 stroke-status-success-05" />
            </div>
          </div>
        </Hoverable.Root>
      )}
    </>
  );
}
