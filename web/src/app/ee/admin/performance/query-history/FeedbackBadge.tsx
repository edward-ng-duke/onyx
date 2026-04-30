import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Feedback } from "@/lib/types";

export function FeedbackBadge({
  feedback,
}: {
  feedback?: Feedback | "mixed" | null;
}) {
  const t = useTranslations("admin.performance.queryHistory");
  let feedbackBadge;
  switch (feedback) {
    case "like":
      feedbackBadge = (
        <Badge variant="success" className="text-sm">
          {t("feedbackLike")}
        </Badge>
      );
      break;
    case "dislike":
      feedbackBadge = (
        <Badge variant="destructive" className="text-sm">
          {t("feedbackDislike")}
        </Badge>
      );
      break;
    case "mixed":
      feedbackBadge = (
        <Badge variant="purple" className="text-sm">
          {t("feedbackMixed")}
        </Badge>
      );
      break;
    default:
      feedbackBadge = (
        <Badge variant="outline" className="text-sm">
          {t("feedbackNa")}
        </Badge>
      );
      break;
  }
  return feedbackBadge;
}
