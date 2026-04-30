"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import InputSelect from "@/refresh-components/inputs/InputSelect";
import { Label } from "@/components/Field";

interface ReferralSourceSelectorProps {
  defaultValue?: string;
}

export default function ReferralSourceSelector({
  defaultValue,
}: ReferralSourceSelectorProps) {
  const t = useTranslations("auth");
  const [referralSource, setReferralSource] = useState(defaultValue);

  const referralOptions = [
    { value: "search", label: t("signUp.referralOptions.search") },
    { value: "friend", label: t("signUp.referralOptions.friend") },
    { value: "linkedin", label: t("signUp.referralOptions.linkedin") },
    { value: "twitter", label: t("signUp.referralOptions.twitter") },
    { value: "hackernews", label: t("signUp.referralOptions.hackernews") },
    { value: "reddit", label: t("signUp.referralOptions.reddit") },
    { value: "youtube", label: t("signUp.referralOptions.youtube") },
    { value: "podcast", label: t("signUp.referralOptions.podcast") },
    { value: "blog", label: t("signUp.referralOptions.blog") },
    { value: "ads", label: t("signUp.referralOptions.ads") },
    { value: "other", label: t("signUp.referralOptions.other") },
  ];

  const handleChange = (value: string) => {
    setReferralSource(value);
    const cookies = require("js-cookie");
    cookies.set("referral_source", value, {
      expires: 365,
      path: "/",
      sameSite: "strict",
    });
  };

  return (
    <div className="w-full gap-y-2 flex flex-col">
      <Label className="text-text-950" small={false}>
        {t("signUp.referralLabel")}
      </Label>
      <InputSelect value={referralSource} onValueChange={handleChange}>
        <InputSelect.Trigger placeholder={t("signUp.referralPlaceholder")} />

        <InputSelect.Content>
          {referralOptions.map((option) => (
            <InputSelect.Item key={option.value} value={option.value}>
              {option.label}
            </InputSelect.Item>
          ))}
        </InputSelect.Content>
      </InputSelect>
    </div>
  );
}
