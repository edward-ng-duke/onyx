import React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { Button } from "@opal/components";
import { getFinalSetupConfig } from "@/sections/onboarding/constants";
import { FinalStepItemProps } from "@/interfaces/onboarding";
import { SvgExternalLink } from "@opal/icons";
import { Section } from "@/layouts/general-layouts";
import { ContentAction } from "@opal/layouts";
import { Card } from "@/refresh-components/cards";

const FinalStepItem = React.memo(
  ({
    title,
    description,
    icon: Icon,
    buttonText,
    buttonHref,
  }: FinalStepItemProps) => {
    const isExternalLink = buttonHref.startsWith("http");
    const linkProps = isExternalLink
      ? { target: "_blank", rel: "noopener noreferrer" }
      : {};

    return (
      <Card padding={0.25} variant="secondary">
        <ContentAction
          icon={Icon}
          title={title}
          description={description}
          sizePreset="main-ui"
          variant="section"
          padding="sm"
          rightChildren={
            <Link href={buttonHref as Route} {...linkProps}>
              <Button prominence="tertiary" rightIcon={SvgExternalLink}>
                {buttonText}
              </Button>
            </Link>
          }
        />
      </Card>
    );
  }
);
FinalStepItem.displayName = "FinalStepItem";

export default function FinalStep() {
  const t = useTranslations("sections.onboarding");
  const items = getFinalSetupConfig(t);
  return (
    <Section gap={0.5}>
      {items.map((item) => (
        <FinalStepItem key={item.title} {...item} />
      ))}
    </Section>
  );
}
