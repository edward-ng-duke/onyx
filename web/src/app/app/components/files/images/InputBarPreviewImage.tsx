"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { buildImgUrl } from "./utils";
import { FullImageModal } from "./FullImageModal";

export function InputBarPreviewImage({ fileId }: { fileId: string }) {
  const t = useTranslations("chat.message");
  const [fullImageShowing, setFullImageShowing] = useState(false);

  return (
    <>
      <FullImageModal
        fileId={fileId}
        open={fullImageShowing}
        onOpenChange={(open) => setFullImageShowing(open)}
      />
      <div
        className={`
          bg-transparent
          border-none
          flex
          items-center
          bg-accent-background-hovered
          border
          border-border
          rounded-md
          box-border
          h-6
      `}
      >
        <img
          alt={t("imagePreviewAlt")}
          onClick={() => setFullImageShowing(true)}
          className="h-6 w-6 object-cover rounded-lg bg-background cursor-pointer"
          src={buildImgUrl(fileId)}
        />
      </div>
    </>
  );
}
