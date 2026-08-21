import { MealAction } from "../src/types";
import { DEFAULT_LOCALE, Locale, t } from "../src/strings";
import { colors } from "./theme";

export function formatDate(date = new Date(), locale: Locale = DEFAULT_LOCALE) {
  return date.toLocaleDateString(locale === "tr" ? "tr-TR" : "en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(iso?: string, locale: Locale = DEFAULT_LOCALE) {
  return new Date(iso ?? Date.now()).toLocaleTimeString(locale === "tr" ? "tr-TR" : "en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function actionLabel(action: MealAction) {
  if (action === "auto_accept") return t("actionAutoAccept");
  if (action === "ask") return t("actionAsk");
  return t("actionReview");
}

export function actionTone(action: MealAction) {
  if (action === "auto_accept") return { backgroundColor: colors.mossSoft, color: colors.moss };
  if (action === "ask") return { backgroundColor: "#F9EAC5", color: "#8D641C" };
  return { backgroundColor: colors.terracottaSoft, color: colors.terracotta };
}
