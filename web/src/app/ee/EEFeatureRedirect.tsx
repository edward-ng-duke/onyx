"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { toast } from "@/hooks/useToast";

export default function EEFeatureRedirect() {
  const router = useRouter();
  const tToast = useTranslations("toasts.auth");

  useEffect(() => {
    toast.error(tToast("licenseRequired"));
    router.replace("/app");
  }, [router, tToast]);

  return null;
}
