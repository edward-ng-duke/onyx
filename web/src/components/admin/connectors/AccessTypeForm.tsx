import { DefaultDropdown } from "@/components/Dropdown";
import {
  AccessType,
  ValidAutoSyncSource,
  ConfigurableSources,
  validAutoSyncSources,
} from "@/lib/types";
import { useField } from "formik";
import { AutoSyncOptions } from "./AutoSyncOptions";
import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";
import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Credential } from "@/lib/connectors/credentials";
import { credentialTemplates } from "@/lib/connectors/credentials";

function isValidAutoSyncSource(
  value: ConfigurableSources
): value is ValidAutoSyncSource {
  return validAutoSyncSources.includes(value as ValidAutoSyncSource);
}

export function AccessTypeForm({
  connector,
  currentCredential,
}: {
  connector: ConfigurableSources;
  currentCredential?: Credential<any> | null;
}) {
  const t = useTranslations("admin.connectors.accessType");
  const [access_type, meta, access_type_helpers] =
    useField<AccessType>("access_type");

  const isPaidEnterpriseEnabled = usePaidEnterpriseFeaturesEnabled();
  const isAutoSyncSupported = isValidAutoSyncSource(connector);

  const selectedAuthMethod = currentCredential?.credential_json?.[
    "authentication_method"
  ] as string | undefined;

  // If the selected auth method is one that disables sync, return true
  const isSyncDisabledByAuth = useMemo(() => {
    const template = (credentialTemplates as any)[connector];
    const authMethods = template?.authMethods as
      | { value: string; disablePermSync?: boolean }[]
      | undefined; // auth methods are returned as an array of objects with a value and disablePermSync property
    if (!authMethods || !selectedAuthMethod) return false;
    const method = authMethods.find((m) => m.value === selectedAuthMethod);
    return method?.disablePermSync === true;
  }, [connector, selectedAuthMethod]);

  useEffect(
    () => {
      // Only set default value if access_type.value is not already set
      if (!access_type.value) {
        if (!isPaidEnterpriseEnabled) {
          access_type_helpers.setValue("public");
        } else if (isAutoSyncSupported) {
          access_type_helpers.setValue("sync");
        } else {
          access_type_helpers.setValue("private");
        }
      }
    },
    [
      // Only run this effect once when the component mounts
      // eslint-disable-next-line react-hooks/exhaustive-deps
    ]
  );

  const options = [
    {
      name: t("privateName"),
      value: "private",
      description: t("privateDescription"),
      disabled: false,
      disabledReason: "",
    },
    {
      name: t("publicName"),
      value: "public",
      description: t("publicDescription"),
      disabled: false,
      disabledReason: "",
    },
  ];

  if (isAutoSyncSupported && isPaidEnterpriseEnabled) {
    options.push({
      name: t("syncName"),
      value: "sync",
      description: t("syncDescription"),
      disabled: isSyncDisabledByAuth,
      disabledReason: t("syncDisabledReason"),
    });
  }

  return (
    <>
      {isPaidEnterpriseEnabled && (
        <>
          <div>
            <label className="text-text-950 font-medium">{t("title")}</label>
            <p className="text-sm text-text-500">{t("description")}</p>
          </div>
          <DefaultDropdown
            options={options}
            selected={access_type.value}
            onSelect={(selected) => {
              access_type_helpers.setValue(selected as AccessType);
            }}
            includeDefault={false}
          />
          {access_type.value === "sync" && isAutoSyncSupported && (
            <AutoSyncOptions connectorType={connector as ValidAutoSyncSource} />
          )}
        </>
      )}
    </>
  );
}
