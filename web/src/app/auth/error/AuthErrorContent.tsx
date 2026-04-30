"use client";

import { useTranslations } from "next-intl";
import AuthFlowContainer from "@/components/auth/AuthFlowContainer";
import Text from "@/refresh-components/texts/Text";
import { Button } from "@opal/components";

import { NEXT_PUBLIC_CLOUD_ENABLED } from "@/lib/constants";

// Maps raw IdP/OAuth error codes to translation keys.
// If the message is a known code, we replace it; otherwise show it as-is.
const ERROR_CODE_KEYS: Record<string, string> = {
  access_denied: "error.codes.accessDenied",
  login_required: "error.codes.loginRequired",
  consent_required: "error.codes.consentRequired",
  interaction_required: "error.codes.interactionRequired",
  invalid_scope: "error.codes.invalidScope",
  server_error: "error.codes.serverError",
  temporarily_unavailable: "error.codes.temporarilyUnavailable",
};

interface AuthErrorContentProps {
  message: string | null;
}

function AuthErrorContent({ message: rawMessage }: AuthErrorContentProps) {
  const t = useTranslations("auth");
  const message = rawMessage
    ? ERROR_CODE_KEYS[rawMessage]
      ? t(ERROR_CODE_KEYS[rawMessage] as any)
      : rawMessage
    : null;
  return (
    <AuthFlowContainer>
      <div className="flex flex-col items-center gap-4">
        <Text headingH2 text05>
          {t("error.title")}
        </Text>
        <Text mainContentBody text03>
          {t("error.subtitle")}
        </Text>
        {/* TODO: Error card component */}
        <div className="w-full rounded-12 border border-status-error-05 bg-status-error-00 p-4">
          {message ? (
            <Text mainContentBody className="text-status-error-05">
              {message}
            </Text>
          ) : (
            <div className="flex flex-col gap-2 px-4">
              <Text mainContentEmphasis className="text-status-error-05">
                {t("error.possibleIssues")}
              </Text>
              <Text as="li" mainContentBody className="text-status-error-05">
                {t("error.issueCredentials")}
              </Text>
              <Text as="li" mainContentBody className="text-status-error-05">
                {t("error.issueDisruption")}
              </Text>
              <Text as="li" mainContentBody className="text-status-error-05">
                {t("error.issueRestrictions")}
              </Text>
            </div>
          )}
        </div>

        <Button href="/auth/login" width="full">
          {t("error.returnToLogin")}
        </Button>

        <Text mainContentBody text04>
          {NEXT_PUBLIC_CLOUD_ENABLED ? (
            <>
              {t("error.supportCloud")}{" "}
              <a href="mailto:support@onyx.app" className="text-action-link-05">
                support@onyx.app
              </a>
            </>
          ) : (
            t("error.supportSelfHost")
          )}
        </Text>
      </div>
    </AuthFlowContainer>
  );
}

export default AuthErrorContent;
