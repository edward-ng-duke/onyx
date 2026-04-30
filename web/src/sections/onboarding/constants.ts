import { OnboardingStep, FinalStepItemProps } from "@/interfaces/onboarding";
import { SvgGlobe, SvgImage, SvgUsers } from "@opal/icons";
import type { useTranslations } from "next-intl";

type Translator = ReturnType<typeof useTranslations>;

type StepConfig = {
  index: number;
  iconPercentage: number;
};

type StepTextConfig = {
  title: string;
  buttonText: string;
};

// Numeric/structural step config — kept stable so non-React consumers (e.g. the
// reducer) can read step indices without needing a translator.
export const STEP_CONFIG: Record<OnboardingStep, StepConfig> = {
  [OnboardingStep.Welcome]: {
    index: 0,
    iconPercentage: 10,
  },
  [OnboardingStep.Name]: {
    index: 1,
    iconPercentage: 40,
  },
  [OnboardingStep.LlmSetup]: {
    index: 2,
    iconPercentage: 70,
  },
  [OnboardingStep.Complete]: {
    index: 3,
    iconPercentage: 100,
  },
} as const;

// Translated step text — call from a React component that has a translator
// scoped to `sections.onboarding`.
export function getStepTextConfig(
  t: Translator,
  tCommon: Translator
): Record<OnboardingStep, StepTextConfig> {
  return {
    [OnboardingStep.Welcome]: {
      title: t("welcome.title"),
      buttonText: t("welcome.buttonText"),
    },
    [OnboardingStep.Name]: {
      title: t("name.stepTitle"),
      buttonText: tCommon("next"),
    },
    [OnboardingStep.LlmSetup]: {
      title: t("llm.stepTitle"),
      buttonText: tCommon("next"),
    },
    [OnboardingStep.Complete]: {
      title: t("complete.title"),
      buttonText: t("complete.buttonText"),
    },
  };
}

export const TOTAL_STEPS = 3;

export const STEP_NAVIGATION: Record<
  OnboardingStep,
  { next?: OnboardingStep; prev?: OnboardingStep }
> = {
  [OnboardingStep.Welcome]: { next: OnboardingStep.Name },
  [OnboardingStep.Name]: {
    next: OnboardingStep.LlmSetup,
    prev: OnboardingStep.Welcome,
  },
  [OnboardingStep.LlmSetup]: {
    next: OnboardingStep.Complete,
    prev: OnboardingStep.Name,
  },
  [OnboardingStep.Complete]: { prev: OnboardingStep.LlmSetup },
};

// Translated final-setup items — call from a React component with a translator
// scoped to `sections.onboarding`.
export function getFinalSetupConfig(t: Translator): FinalStepItemProps[] {
  return [
    {
      title: t("finalSetup.webSearch.title"),
      description: t("finalSetup.webSearch.description"),
      icon: SvgGlobe,
      buttonText: t("finalSetup.webSearch.buttonText"),
      buttonHref: "/admin/configuration/web-search",
    },
    {
      title: t("finalSetup.imageGen.title"),
      description: t("finalSetup.imageGen.description"),
      icon: SvgImage,
      buttonText: t("finalSetup.imageGen.buttonText"),
      buttonHref: "/admin/configuration/image-generation",
    },
    {
      title: t("finalSetup.inviteTeam.title"),
      description: t("finalSetup.inviteTeam.description"),
      icon: SvgUsers,
      buttonText: t("finalSetup.inviteTeam.buttonText"),
      buttonHref: "/admin/users",
    },
  ];
}
