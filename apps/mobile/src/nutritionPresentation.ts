import type { MealLog, ResolvedItem } from "./types";

export type NutritionPresentation = "verified" | "manual" | "unavailable";

/**
 * The mobile client never derives nutrient values. It only distinguishes a
 * server-backed catalogue value from a local fallback that has no macro data.
 */
export function nutritionPresentationForItem(item: ResolvedItem): NutritionPresentation {
  if (item.food_id === "USER_CUSTOM" || item.portion_provenance === "manual_user_input") {
    return "manual";
  }
  if (item.food_id === "ABSTAIN" || item.portion_provenance === "uncaloried_note") {
    return "unavailable";
  }
  return "verified";
}

export function dayNutritionState(meals: MealLog[]) {
  const presentations = meals.flatMap((meal) => meal.items.map(nutritionPresentationForItem));
  return {
    hasVerifiedMacros: presentations.includes("verified"),
    hasLocalFallback: presentations.some((presentation) => presentation !== "verified"),
  };
}
