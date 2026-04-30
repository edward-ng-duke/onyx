import React from "react";
import { useTranslations } from "next-intl";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CircleAlert, Info } from "lucide-react";
import { BillingInformation, BillingStatus } from "@/lib/billing/interfaces";

export function BillingAlerts({
  billingInformation,
}: {
  billingInformation: BillingInformation;
}) {
  const t = useTranslations("admin.billing");
  const isTrialing = billingInformation.status === BillingStatus.TRIALING;
  const isCancelled = billingInformation.cancel_at_period_end;
  const isExpired = billingInformation.current_period_end
    ? new Date(billingInformation.current_period_end) < new Date()
    : false;
  const noPaymentMethod = !billingInformation.payment_method_enabled;

  const messages: string[] = [];

  if (isExpired) {
    messages.push(t("alertExpired"));
  }
  if (isCancelled && !isExpired && billingInformation.current_period_end) {
    messages.push(
      t("alertCancelling", {
        date: new Date(
          billingInformation.current_period_end
        ).toLocaleDateString(),
      })
    );
  }
  if (isTrialing) {
    messages.push(
      t("alertTrialing", {
        date: billingInformation.trial_end
          ? new Date(billingInformation.trial_end).toLocaleDateString()
          : "N/A",
      })
    );
  }
  if (noPaymentMethod) {
    messages.push(t("alertNoPaymentMethod"));
  }

  const variant = isExpired || noPaymentMethod ? "destructive" : "default";

  if (messages.length === 0) return null;

  return (
    <Alert variant={variant}>
      <AlertTitle className="flex items-center space-x-2">
        {variant === "destructive" ? (
          <CircleAlert className="h-4 w-4" />
        ) : (
          <Info className="h-4 w-4" />
        )}
        <span>
          {variant === "destructive"
            ? t("alertImportantTitle")
            : t("alertNoticeTitle")}
        </span>
      </AlertTitle>
      <AlertDescription>
        <ul className="list-disc list-inside space-y-1 mt-2">
          {messages.map((msg, idx) => (
            <li key={idx}>{msg}</li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}
