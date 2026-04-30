import React from "react";
import { TextArrayField } from "@/components/Field";
import { useFormikContext } from "formik";
import { useTranslations } from "next-intl";

interface ListInputProps {
  name: string;
  label: string | ((credential: any) => string);
  description: string | ((credential: any) => string);
}

const ListInput: React.FC<ListInputProps> = ({ name, label, description }) => {
  const { values } = useFormikContext<any>();
  const t = useTranslations("admin.connectors.add");
  const resolvedLabel = typeof label === "function" ? label(null) : label;
  return (
    <TextArrayField
      name={name}
      label={resolvedLabel}
      values={values}
      subtext={
        typeof description === "function" ? description(null) : description
      }
      placeholder={t("enterPlaceholder", {
        label:
          typeof label === "function" ? resolvedLabel : resolvedLabel.toLowerCase(),
      })}
    />
  );
};

export default ListInput;
