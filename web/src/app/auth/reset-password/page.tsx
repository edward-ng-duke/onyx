"use client";
import React, { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { resetPassword } from "../forgot-password/utils";
import AuthFlowContainer from "@/components/auth/AuthFlowContainer";
import Title from "@/components/ui/title";
import { Text } from "@opal/components";
import { markdown } from "@opal/utils";
import Spacer from "@/refresh-components/Spacer";
import Link from "next/link";
import { Button } from "@opal/components";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import { TextFormField } from "@/components/Field";
import { toast } from "@/hooks/useToast";
import { Spinner } from "@/components/Spinner";
import { redirect, useSearchParams } from "next/navigation";
import {
  NEXT_PUBLIC_FORGOT_PASSWORD_ENABLED,
  TENANT_ID_COOKIE_NAME,
} from "@/lib/constants";
import Cookies from "js-cookie";

const ResetPasswordPage: React.FC = () => {
  const t = useTranslations("auth");
  const [isWorking, setIsWorking] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams?.get("token");
  const tenantId = searchParams?.get(TENANT_ID_COOKIE_NAME);
  // Keep search param same name as cookie for simplicity

  useEffect(() => {
    if (tenantId) {
      Cookies.set(TENANT_ID_COOKIE_NAME, tenantId, {
        path: "/",
        expires: 1 / 24,
      }); // Expires in 1 hour
    }
  }, [tenantId]);

  if (!NEXT_PUBLIC_FORGOT_PASSWORD_ENABLED) {
    redirect("/auth/login");
  }

  return (
    <AuthFlowContainer>
      <div className="flex flex-col w-full justify-center">
        <div className="flex">
          <Title className="mb-2 mx-auto font-bold">
            {t("resetPassword.title")}
          </Title>
        </div>
        {isWorking && <Spinner />}
        <Formik
          initialValues={{
            password: "",
            confirmPassword: "",
          }}
          validationSchema={Yup.object().shape({
            password: Yup.string().required(t("resetPassword.passwordRequired")),
            confirmPassword: Yup.string()
              .oneOf(
                [Yup.ref("password"), undefined],
                t("resetPassword.passwordsMustMatch")
              )
              .required(t("resetPassword.confirmPasswordRequired")),
          })}
          onSubmit={async (values) => {
            if (!token) {
              toast.error(t("resetPassword.invalidToken"));
              return;
            }
            setIsWorking(true);
            try {
              await resetPassword(token, values.password);
              toast.success(t("resetPassword.successToast"));
              setTimeout(() => {
                redirect("/auth/login");
              }, 1000);
            } catch (error) {
              if (error instanceof Error) {
                toast.error(
                  error.message || t("resetPassword.errorGeneric")
                );
              } else {
                toast.error(t("resetPassword.errorUnexpected"));
              }
            } finally {
              setIsWorking(false);
            }
          }}
        >
          {({ isSubmitting }) => (
            <Form className="w-full flex flex-col items-stretch mt-2">
              <TextFormField
                name="password"
                label={t("resetPassword.newPasswordLabel")}
                type="password"
                placeholder={t("resetPassword.newPasswordPlaceholder")}
              />
              <TextFormField
                name="confirmPassword"
                label={t("resetPassword.confirmPasswordLabel")}
                type="password"
                placeholder={t("resetPassword.confirmPasswordPlaceholder")}
              />

              <div className="flex">
                <Button disabled={isSubmitting} type="submit" width="full">
                  {t("resetPassword.submitButton")}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
        <Spacer rem={1} />
        <div className="flex">
          <div className="mx-auto">
            <Text as="p">
              {markdown(`[${t("common.backToLogin")}](/auth/login)`)}
            </Text>
          </div>
        </div>
      </div>
    </AuthFlowContainer>
  );
};

export default ResetPasswordPage;
