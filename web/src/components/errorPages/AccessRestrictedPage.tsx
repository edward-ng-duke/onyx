"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import ErrorPageLayout from "@/components/errorPages/ErrorPageLayout";
import { Button } from "@opal/components";
import InlineExternalLink from "@/refresh-components/InlineExternalLink";
import { logout } from "@/lib/user";
import { loadStripe } from "@stripe/stripe-js";
import { NEXT_PUBLIC_CLOUD_ENABLED } from "@/lib/constants";
import { useLicense } from "@/hooks/useLicense";
import { useSettingsContext } from "@/providers/SettingsProvider";
import { ApplicationStatus } from "@/interfaces/settings";
import Text from "@/refresh-components/texts/Text";
import { SvgLock } from "@opal/icons";

const linkClassName = "text-action-link-05 hover:text-action-link-06 underline";

const fetchStripePublishableKey = async (): Promise<string> => {
  const response = await fetch("/api/tenants/stripe-publishable-key");
  if (!response.ok) {
    throw new Error("Failed to fetch Stripe publishable key");
  }
  const data = await response.json();
  return data.publishable_key;
};

const fetchResubscriptionSession = async () => {
  const response = await fetch("/api/tenants/create-subscription-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    throw new Error("Failed to create resubscription session");
  }
  return response.json();
};

export default function AccessRestricted() {
  const t = useTranslations("components.accessRestricted");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data: license } = useLicense();
  const settings = useSettingsContext();

  const isSeatLimitExceeded =
    settings.settings.application_status ===
    ApplicationStatus.SEAT_LIMIT_EXCEEDED;
  const hadPreviousLicense = license?.has_license === true;
  const showRenewalMessage = NEXT_PUBLIC_CLOUD_ENABLED || hadPreviousLicense;

  function getSeatLimitMessage() {
    const { used_seats, seat_count } = settings.settings;
    if (used_seats != null && seat_count != null) {
      return t("seatLimitMessageWithCounts", {
        used: used_seats,
        total: seat_count,
      });
    }
    return t("seatLimitMessage");
  }

  const initialModalMessage = isSeatLimitExceeded
    ? getSeatLimitMessage()
    : showRenewalMessage
      ? NEXT_PUBLIC_CLOUD_ENABLED
        ? t("subscriptionLapsedMessage")
        : t("licenseLapsedMessage")
      : t("noLicenseMessage");

  const handleResubscribe = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const publishableKey = await fetchStripePublishableKey();
      const { sessionId } = await fetchResubscriptionSession();
      const stripe = await loadStripe(publishableKey);

      if (stripe) {
        await stripe.redirectToCheckout({ sessionId });
      } else {
        throw new Error("Stripe failed to load");
      }
    } catch (error) {
      console.error("Error creating resubscription session:", error);
      setError(t("resubscriptionError"));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ErrorPageLayout>
      <div className="flex items-center gap-2">
        <Text headingH2>{t("title")}</Text>
        <SvgLock className="stroke-status-error-05 w-[1.5rem] h-[1.5rem]" />
      </div>

      <Text text03>{initialModalMessage}</Text>

      {isSeatLimitExceeded ? (
        <>
          <Text text03>
            {t.rich("adminSeatLimitHelp", {
              userLink: (chunks) => (
                <Link className={linkClassName} href="/admin/users">
                  {chunks}
                </Link>
              ),
              billingLink: (chunks) => (
                <Link className={linkClassName} href="/admin/billing">
                  {chunks}
                </Link>
              ),
            })}
          </Text>

          <div className="flex flex-row gap-2">
            <Button
              onClick={async () => {
                await logout();
                window.location.reload();
              }}
            >
              {t("logOut")}
            </Button>
          </div>
        </>
      ) : NEXT_PUBLIC_CLOUD_ENABLED ? (
        <>
          <Text text03>{t("cloudUpdatePayment")}</Text>

          <Text text03>{t("cloudAdminAdvice")}</Text>

          <div className="flex flex-row gap-2">
            <Button disabled={isLoading} onClick={handleResubscribe}>
              {isLoading ? t("loading") : t("resubscribe")}
            </Button>
            <Button
              prominence="secondary"
              onClick={async () => {
                await logout();
                window.location.reload();
              }}
            >
              {t("logOut")}
            </Button>
          </div>

          {error && <Text className="text-status-error-05">{error}</Text>}
        </>
      ) : (
        <>
          <Text text03>
            {hadPreviousLicense
              ? t("contactAdminRenew")
              : t("contactAdminEnterprise")}
          </Text>

          <Text text03>
            {t.rich(
              hadPreviousLicense
                ? "adminRenewBilling"
                : "adminActivateBilling",
              {
                billingLink: (chunks) => (
                  <Link className={linkClassName} href="/admin/billing">
                    {chunks}
                  </Link>
                ),
                supportLink: (chunks) => (
                  <a className={linkClassName} href="mailto:support@onyx.app">
                    {chunks}
                  </a>
                ),
              }
            )}
          </Text>

          <div className="flex flex-row gap-2">
            <Button
              onClick={async () => {
                await logout();
                window.location.reload();
              }}
            >
              {t("logOut")}
            </Button>
          </div>
        </>
      )}

      <Text text03>
        {t.rich("needHelpDiscord", {
          discordLink: (chunks) => (
            <InlineExternalLink
              className={linkClassName}
              href="https://discord.gg/4NA5SbzrWb"
            >
              {chunks}
            </InlineExternalLink>
          ),
        })}
      </Text>
    </ErrorPageLayout>
  );
}
