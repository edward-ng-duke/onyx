"use client";

import { useTranslations } from "next-intl";
import { toast } from "@/hooks/useToast";
import { basicLogin, basicSignup } from "@/lib/user";
import { Button } from "@opal/components";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import { requestEmailVerification } from "../lib";
import { useMemo, useState } from "react";
import { Spinner } from "@/components/Spinner";
import Link from "next/link";
import { useUser } from "@/providers/UserProvider";
import { FormikField } from "@/refresh-components/form/FormikField";
import { FormField } from "@/refresh-components/form/FormField";
import { InputTypeIn } from "@opal/components";
import PasswordInputTypeIn from "@/refresh-components/inputs/PasswordInputTypeIn";
import { validateInternalRedirect } from "@/lib/auth/redirectValidation";
import { APIFormFieldState } from "@/refresh-components/form/types";
import { SvgArrowRightCircle } from "@opal/icons";
import { useCaptcha } from "@/lib/hooks/useCaptcha";
import { Spacer } from "@opal/components";

interface EmailPasswordFormProps {
  isSignup?: boolean;
  shouldVerify?: boolean;
  referralSource?: string;
  nextUrl?: string | null;
  defaultEmail?: string | null;
  isJoin?: boolean;
}

export default function EmailPasswordForm({
  isSignup = false,
  shouldVerify,
  referralSource,
  nextUrl,
  defaultEmail,
  isJoin = false,
}: EmailPasswordFormProps) {
  const t = useTranslations("auth");
  const { user, authTypeMetadata } = useUser();
  const passwordMinLength = authTypeMetadata?.passwordMinLength ?? 8;
  const [isWorking, setIsWorking] = useState<boolean>(false);
  const [apiStatus, setApiStatus] = useState<APIFormFieldState>("loading");
  const [showApiMessage, setShowApiMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const { getCaptchaToken } = useCaptcha();

  const apiMessages = useMemo(
    () => ({
      loading: isSignup
        ? isJoin
          ? t("signIn.joining")
          : t("signIn.creatingAccount")
        : t("signIn.signingIn"),
      success: isSignup
        ? t("signIn.accountCreated")
        : t("signIn.signedInSuccess"),
      error: errorMessage,
    }),
    [isSignup, isJoin, errorMessage, t]
  );

  return (
    <>
      {isWorking && <Spinner />}

      <Formik
        initialValues={{
          email: defaultEmail ? defaultEmail.toLowerCase() : "",
          password: "",
        }}
        validateOnChange={true}
        validateOnBlur={true}
        validationSchema={Yup.object().shape({
          email: Yup.string()
            .email()
            .required()
            .transform((value) => value.toLowerCase()),
          password: Yup.string()
            .min(
              passwordMinLength,
              t("signIn.passwordMinLength", { min: passwordMinLength })
            )
            .required(),
        })}
        onSubmit={async (values: { email: string; password: string }) => {
          // Ensure email is lowercase
          const email: string = values.email.toLowerCase();
          setShowApiMessage(true);
          setApiStatus("loading");
          setErrorMessage("");

          if (isSignup) {
            // login is fast, no need to show a spinner
            setIsWorking(true);

            // Get captcha token for signup (if captcha is enabled)
            const captchaToken = await getCaptchaToken("signup");

            const response = await basicSignup(
              email,
              values.password,
              referralSource,
              captchaToken
            );

            if (!response.ok) {
              setIsWorking(false);

              const errorBody: any = await response.json();
              const errorDetail = errorBody.detail;
              let errorMsg: string = t("common.unknownError");
              if (errorDetail === "REGISTER_USER_ALREADY_EXISTS") {
                errorMsg = t("signUp.alreadyExists");
              } else if (typeof errorDetail === "string" && errorDetail) {
                errorMsg = errorDetail;
              }
              if (response.status === 429) {
                errorMsg = t("common.tooManyRequests");
              }
              setErrorMessage(errorMsg);
              setApiStatus("error");
              toast.error(t("signUp.signupFailed", { error: errorMsg }));
              setIsWorking(false);
              return;
            } else {
              setApiStatus("success");
              toast.success(t("signUp.accountCreatedToast"));
            }
          }

          const loginCaptchaToken = await getCaptchaToken("login");
          const loginResponse = await basicLogin(
            email,
            values.password,
            loginCaptchaToken
          );
          if (loginResponse.ok) {
            setApiStatus("success");
            if (isSignup && shouldVerify) {
              await requestEmailVerification(email);
              // Use window.location.href to force a full page reload,
              // ensuring app re-initializes with the new state (including
              // server-side provider values)
              window.location.href = "/auth/waiting-on-verification";
            } else {
              // The searchparam is purely for multi tenant developement purposes.
              // It replicates the behavior of the case where a user
              // has signed up with email / password as the only user to an instance
              // and has just completed verification
              const validatedNextUrl = validateInternalRedirect(nextUrl);
              window.location.href = validatedNextUrl
                ? validatedNextUrl
                : `/app${isSignup && !isJoin ? "?new_team=true" : ""}`;
            }
          } else {
            setIsWorking(false);
            const errorDetail: any = (await loginResponse.json()).detail;
            let errorMsg: string = t("common.unknownError");
            if (errorDetail === "LOGIN_BAD_CREDENTIALS") {
              errorMsg = t("signIn.invalidCredentials");
            } else if (errorDetail === "NO_WEB_LOGIN_AND_HAS_NO_PASSWORD") {
              errorMsg = t("signIn.noWebLoginNoPassword");
            } else if (typeof errorDetail === "string") {
              errorMsg = errorDetail;
            }
            if (loginResponse.status === 429) {
              errorMsg = t("common.tooManyRequests");
            }
            setErrorMessage(errorMsg);
            setApiStatus("error");
            toast.error(t("signIn.loginFailed", { error: errorMsg }));
          }
        }}
      >
        {({ isSubmitting, isValid, dirty, values }) => {
          return (
            <Form className="gap-y-3">
              <FormikField<string>
                name="email"
                render={(field, helper, meta, state) => (
                  <FormField name="email" state={state} className="w-full">
                    <FormField.Label>
                      {t("common.emailAddressLabel")}
                    </FormField.Label>
                    <FormField.Control>
                      <InputTypeIn
                        {...field}
                        onChange={(e) => {
                          if (showApiMessage && apiStatus === "error") {
                            setShowApiMessage(false);
                            setErrorMessage("");
                            setApiStatus("loading");
                          }
                          field.onChange(e);
                        }}
                        placeholder={t("common.emailPlaceholder")}
                        data-testid="email"
                        autoComplete="username"
                        variant={apiStatus === "error" ? "error" : undefined}
                      />
                    </FormField.Control>
                  </FormField>
                )}
              />

              <FormikField<string>
                name="password"
                render={(field, helper, meta, state) => (
                  <FormField name="password" state={state} className="w-full">
                    <FormField.Label>{t("common.passwordLabel")}</FormField.Label>
                    <FormField.Control>
                      <PasswordInputTypeIn
                        {...field}
                        onChange={(e) => {
                          if (showApiMessage && apiStatus === "error") {
                            setShowApiMessage(false);
                            setErrorMessage("");
                            setApiStatus("loading");
                          }
                          field.onChange(e);
                        }}
                        placeholder={t("common.passwordPlaceholder")}
                        data-testid="password"
                        autoComplete={
                          isSignup ? "new-password" : "current-password"
                        }
                        error={apiStatus === "error"}
                      />
                    </FormField.Control>
                    {isSignup && !showApiMessage && (
                      <FormField.Message
                        messages={{
                          idle: t("signIn.passwordMinLength", {
                            min: passwordMinLength,
                          }),
                          error: meta.error,
                          success: t("signIn.passwordMinLength", {
                            min: passwordMinLength,
                          }),
                        }}
                      />
                    )}
                    {showApiMessage && (
                      <FormField.APIMessage
                        state={apiStatus}
                        messages={apiMessages}
                      />
                    )}
                  </FormField>
                )}
              />

              <Spacer rem={0.25} />
              <Button
                disabled={isSubmitting || !isValid || !dirty}
                type="submit"
                width="full"
                rightIcon={SvgArrowRightCircle}
              >
                {isJoin
                  ? t("signIn.joinButton")
                  : isSignup
                    ? t("signIn.createAccountButton")
                    : t("signIn.signInButton")}
              </Button>
              {user?.is_anonymous_user && (
                <Link
                  href="/app"
                  className="text-xs text-action-link-05 cursor-pointer text-center w-full font-medium mx-auto"
                >
                  <span className="hover:border-b hover:border-dotted hover:border-action-link-05">
                    {t("signIn.continueAsGuest")}
                  </span>
                </Link>
              )}
            </Form>
          );
        }}
      </Formik>
    </>
  );
}
