import { AlertCircle, Clock, Lock, Wifi, Server } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Get the appropriate icon for a given error code
 */
export const getErrorIcon = (errorCode?: string) => {
  switch (errorCode) {
    case "RATE_LIMIT":
      return <Clock className="h-4 w-4" />;
    case "AUTH_ERROR":
    case "PERMISSION_DENIED":
      return <Lock className="h-4 w-4" />;
    case "CONNECTION_ERROR":
      return <Wifi className="h-4 w-4" />;
    case "SERVICE_UNAVAILABLE":
      return <Server className="h-4 w-4" />;
    case "BUDGET_EXCEEDED":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

/**
 * Hook returning a localized human-readable title for a given error code.
 * Must be used inside a React component (not a plain function).
 */
export const useErrorTitle = (errorCode?: string): string => {
  const t = useTranslations("chat.errors");
  switch (errorCode) {
    case "RATE_LIMIT":
      return t("rateLimit");
    case "AUTH_ERROR":
      return t("auth");
    case "PERMISSION_DENIED":
      return t("permissionDenied");
    case "CONTEXT_TOO_LONG":
      return t("contextTooLong");
    case "TOOL_CALL_FAILED":
      return t("toolCallFailed");
    case "CONNECTION_ERROR":
      return t("connection");
    case "SERVICE_UNAVAILABLE":
      return t("serviceUnavailable");
    case "INIT_FAILED":
      return t("initFailed");
    case "VALIDATION_ERROR":
      return t("validation");
    case "BUDGET_EXCEEDED":
      return t("budgetExceeded");
    case "CONTENT_POLICY":
      return t("contentPolicy");
    case "BAD_REQUEST":
      return t("badRequest");
    case "NOT_FOUND":
      return t("notFound");
    case "API_ERROR":
      return t("apiError");
    default:
      return t("generic");
  }
};
