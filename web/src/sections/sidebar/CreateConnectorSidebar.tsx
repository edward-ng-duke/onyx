import { useTranslations } from "next-intl";
import { useFormContext } from "@/components/context/FormContext";
import { credentialTemplates } from "@/lib/connectors/credentials";
import Text from "@/refresh-components/texts/Text";
import StepSidebar from "@/sections/sidebar/StepSidebarWrapper";
import { useUser } from "@/providers/UserProvider";
import { SvgSettings } from "@opal/icons";

const STEP_CREDENTIAL = "Credential";
const STEP_CONNECTOR = "Connector";
const STEP_ADVANCED = "Advanced (optional)";

export default function Sidebar() {
  const t = useTranslations("sections.createConnectorSidebar");
  const { formStep, setFormStep, connector, allowAdvanced, allowCreate } =
    useFormContext();
  const noCredential = credentialTemplates[connector] == null;

  const { isAdmin } = useUser();
  const buttonName = isAdmin ? t("adminPage") : t("curatorPage");

  const settingSteps = [
    ...(!noCredential ? [STEP_CREDENTIAL] : []),
    STEP_CONNECTOR,
    ...(connector == "file" ? [] : [STEP_ADVANCED]),
  ];

  const stepLabel = (step: string) => {
    if (step === STEP_CREDENTIAL) return t("stepCredential");
    if (step === STEP_CONNECTOR) return t("stepConnector");
    return t("stepAdvanced");
  };

  return (
    <StepSidebar
      buttonName={buttonName}
      buttonIcon={SvgSettings}
      buttonHref="/admin/add-connector"
    >
      <div className="relative">
        {connector != "file" && (
          <div className="absolute h-[85%] left-[6px] top-[8px] bottom-0 w-0.5 bg-background-tint-04"></div>
        )}
        {settingSteps.map((step, index) => {
          const allowed =
            (step == STEP_CONNECTOR && allowCreate) ||
            (step == STEP_ADVANCED && allowAdvanced) ||
            index <= formStep;

          return (
            <div
              key={index}
              className={`flex items-center mb-6 relative ${
                !allowed ? "cursor-not-allowed" : "cursor-pointer"
              }`}
              onClick={() => {
                if (allowed) {
                  setFormStep(index - (noCredential ? 1 : 0));
                }
              }}
            >
              <div className="flex-shrink-0 mr-4 z-10">
                <div
                  className={`rounded-full h-3.5 w-3.5 flex items-center justify-center ${
                    allowed ? "bg-blue-500" : "bg-background-tint-04"
                  }`}
                >
                  {formStep === index && (
                    <div className="h-2 w-2 rounded-full bg-white"></div>
                  )}
                </div>
              </div>
              <Text as="p" text04={index <= formStep} text02={index > formStep}>
                {stepLabel(step)}
              </Text>
            </div>
          );
        })}
      </div>
    </StepSidebar>
  );
}
