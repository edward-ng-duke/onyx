"use client";

import { FeedbackType } from "@/app/app/interfaces";
import { Button } from "@opal/components";
import useFeedbackController from "@/hooks/useFeedbackController";
import { useModal } from "@/refresh-components/contexts/ModalContext";
import { SvgThumbsDown, SvgThumbsUp } from "@opal/icons";
import Modal from "@/refresh-components/Modal";
import { Formik } from "formik";
import * as Yup from "yup";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { InputVertical } from "@opal/layouts";
import InputTextAreaField from "@/refresh-components/form/InputTextAreaField";

export interface FeedbackModalProps {
  feedbackType: FeedbackType;
  messageId: number;
}

interface FeedbackFormValues {
  additional_feedback: string;
}

export default function FeedbackModal({
  feedbackType,
  messageId,
}: FeedbackModalProps) {
  const modal = useModal();
  const { handleFeedbackChange } = useFeedbackController();
  const t = useTranslations("modals.feedback");
  const tCommon = useTranslations("common.actions");
  const tValFeedback = useTranslations("validation.feedback");

  const initialValues: FeedbackFormValues = {
    additional_feedback: "",
  };

  const validationSchema = useMemo(
    () =>
      Yup.object({
        additional_feedback:
          feedbackType === "dislike"
            ? Yup.string().trim().required(tValFeedback("feedbackRequired"))
            : Yup.string().trim(),
      }),
    [feedbackType, tValFeedback]
  );

  async function handleSubmit(values: FeedbackFormValues) {
    const feedbackText = values.additional_feedback;

    const success = await handleFeedbackChange(
      messageId,
      feedbackType,
      feedbackText,
      undefined
    );

    // Only close modal if submission was successful
    if (success) {
      modal.toggle(false);
    }
  }

  return (
    <>
      <Modal open={modal.isOpen} onOpenChange={modal.toggle}>
        <Modal.Content width="sm">
          <Modal.Header
            icon={feedbackType === "like" ? SvgThumbsUp : SvgThumbsDown}
            title={t("title")}
            onClose={() => modal.toggle(false)}
          />
          <Formik
            initialValues={initialValues}
            validationSchema={validationSchema}
            onSubmit={handleSubmit}
          >
            {({
              isSubmitting,
              handleSubmit: formikHandleSubmit,
              dirty,
              isValid,
            }) => (
              <>
                <Modal.Body>
                  <InputVertical
                    withLabel="additional_feedback"
                    title={t("additionalDetails")}
                    suffix={
                      feedbackType === "like" ? t("optional") : undefined
                    }
                  >
                    <InputTextAreaField
                      name="additional_feedback"
                      placeholder={
                        feedbackType === "like"
                          ? t("placeholderLike")
                          : t("placeholderDislike")
                      }
                    />
                  </InputVertical>
                </Modal.Body>

                <Modal.Footer>
                  <Button
                    prominence="secondary"
                    onClick={() => modal.toggle(false)}
                    type="button"
                  >
                    {tCommon("cancel")}
                  </Button>
                  <Button
                    disabled={
                      isSubmitting ||
                      (feedbackType === "dislike" && (!dirty || !isValid))
                    }
                    onClick={() => formikHandleSubmit()}
                  >
                    {isSubmitting ? t("submitting") : tCommon("submit")}
                  </Button>
                </Modal.Footer>
              </>
            )}
          </Formik>
        </Modal.Content>
      </Modal>
    </>
  );
}
