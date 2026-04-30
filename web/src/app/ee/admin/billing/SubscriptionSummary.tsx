import React from "react";
import { useTranslations } from "next-intl";
import { InfoItem } from "./InfoItem";
import { statusToDisplay, BillingInformation } from "@/lib/billing";
import { formatDateShort } from "@/lib/dateUtils";

interface SubscriptionSummaryProps {
  billingInformation: BillingInformation;
}

export function SubscriptionSummary({
  billingInformation,
}: SubscriptionSummaryProps) {
  const t = useTranslations("admin.billing");
  return (
    <div className="grid grid-cols-2 gap-4">
      <InfoItem
        title={t("infoSubscriptionStatus")}
        value={statusToDisplay(billingInformation.status)}
      />
      <InfoItem
        title={t("infoSeats")}
        value={billingInformation.seats?.toString() ?? "—"}
      />
      <InfoItem
        title={t("infoBillingStart")}
        value={formatDateShort(billingInformation.current_period_start)}
      />
      <InfoItem
        title={t("infoBillingEnd")}
        value={formatDateShort(billingInformation.current_period_end)}
      />
    </div>
  );
}
