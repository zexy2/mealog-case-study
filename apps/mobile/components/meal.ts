import { MealAction } from "../src/types";
import { colors } from "./theme";

export function formatDate(date = new Date()) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function formatTime(iso?: string) {
  return new Date(iso ?? Date.now()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function actionLabel(action: MealAction) {
  if (action === "auto_accept") return "Saved automatically";
  if (action === "ask") return "Needs one answer";
  return "Review suggested match";
}

export function actionTone(action: MealAction) {
  if (action === "auto_accept") return { backgroundColor: colors.mossSoft, color: colors.moss };
  if (action === "ask") return { backgroundColor: "#F9EAC5", color: "#8D641C" };
  return { backgroundColor: colors.terracottaSoft, color: colors.terracotta };
}
