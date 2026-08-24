import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { MealLog } from "../src/types";
import { formatLocalizedUnit, t } from "../src/strings";
import { dayNutritionState } from "../src/nutritionPresentation";
import { Header } from "../components/Header";
import { actionLabel, formatDate, formatTime } from "../components/meal";
import { colors } from "../components/theme";
import { getFoodEmoji } from "./Review";

export type DayScreenProps = {
  meals: MealLog[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs?: number;
  totalFat?: number;
  highlightedMealKey: string | null;
  onCapture: () => void;
  onOpenMeal: (meal: MealLog) => void;
  onRemoveMeal: (meal: MealLog) => void;
  onUndoMeal: (meal: MealLog) => void;
};

export function portionTotals(meals: MealLog[]) {
  return meals.reduce(
    (totals, meal) => meal.items.reduce(
      (next, item) => ({
        midpoint: next.midpoint + item.grams,
        p10: next.p10 + item.grams_p10,
        p90: next.p90 + item.grams_p90,
      }),
      totals,
    ),
    { midpoint: 0, p10: 0, p90: 0 },
  );
}

function itemName(item: MealLog["items"][number]) {
  const name = item.candidates.find((candidate) => candidate.food_id === item.food_id)?.name ?? item.query;
  if (item.quantity === null || item.quantity === undefined) {
    return t("itemUnknownQuantity", { name });
  }
  const localizedUnit = formatLocalizedUnit(item.unit);
  return t("itemWithQuantity", {
    quantity: item.quantity,
    unit: localizedUnit ? ` ${localizedUnit}` : "",
    name,
  });
}

export function mealTitle(meal: MealLog) {
  const names = meal.items.map(itemName).filter(Boolean);
  if (names.length === 0) return t("mealFallback");
  if (names.length <= 2) return names.join(" · ");
  return `${names.slice(0, 2).join(" · ")} (${t("moreItemsCount", { count: names.length - 2 })})`;
}

export function DayScreen({ meals, totalCalories, totalProtein, totalCarbs, totalFat, highlightedMealKey, onCapture, onOpenMeal, onRemoveMeal, onUndoMeal }: DayScreenProps) {
  const portions = portionTotals(meals);
  const carbs = totalCarbs ?? meals.reduce((sum, m) => sum + (m.totals.carb_g ?? 0), 0);
  const fat = totalFat ?? meals.reduce((sum, m) => sum + (m.totals.fat_g ?? 0), 0);
  const nutritionState = dayNutritionState(meals);
  const hasMeasuredPortion = portions.midpoint > 0 || portions.p10 > 0 || portions.p90 > 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Header eyebrow={t("dayEyebrow")} title={t("dayTitle")} subtitle={formatDate()} />
      {meals.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}><Ionicons name="sunny-outline" size={32} color={colors.terracotta} /></View>
          <Text style={styles.emptyEyebrow}>{t("emptyEyebrow")}</Text>
          <Text style={styles.emptyTitle}>{t("emptyTitle")}</Text>
          <Text style={styles.emptyCopy}>{t("emptyCopy")}</Text>
        </View>
      ) : (
        <>
          {/* Bento Total Nutrition Hero Card */}
          <View style={styles.totalCard}>
            <View style={styles.totalTopRow}>
              <View style={styles.totalBadge}>
                <Ionicons name="flame" size={16} color="#E8B653" />
                <Text style={styles.totalBadgeText}>{t("loggedSoFar")}</Text>
              </View>
              <View style={styles.mealCountBadge}>
                <Ionicons name="calendar-outline" size={13} color="#AAB5A7" />
                <Text style={styles.mealCountBadgeText}>{meals.length} Öğün</Text>
              </View>
            </View>

            <View style={styles.calorieRow}>
              {nutritionState.hasVerifiedMacros ? <Text style={styles.totalApprox}>≈ </Text> : null}
              <Text style={styles.totalNumber}>{Math.round(totalCalories).toLocaleString()}</Text>
              <Text style={styles.totalUnit}> kcal</Text>
            </View>

            {hasMeasuredPortion ? (
              <View style={styles.portionRangeTag}>
                <Ionicons name="scale-outline" size={13} color="#E7C57C" />
                <Text style={styles.totalRange}>
                  {t("dayPortionRange", { midpoint: Math.round(portions.midpoint), low: Math.round(portions.p10), high: Math.round(portions.p90) })}
                </Text>
              </View>
            ) : null}

            {/* 3 Bento Macro Cards */}
            {nutritionState.hasVerifiedMacros ? (
              <View style={styles.macroBentoRow}>
                <View style={styles.macroBentoCard}>
                  <Text style={styles.macroBentoLabel}>{t("protein")}</Text>
                  <Text style={styles.macroBentoValue}>≈ {Math.round(totalProtein)} g</Text>
                </View>
                <View style={styles.macroBentoCard}>
                  <Text style={styles.macroBentoLabel}>{t("carbs")}</Text>
                  <Text style={styles.macroBentoValue}>≈ {Math.round(carbs)} g</Text>
                </View>
                <View style={styles.macroBentoCard}>
                  <Text style={styles.macroBentoLabel}>{t("fat")}</Text>
                  <Text style={styles.macroBentoValue}>≈ {Math.round(fat)} g</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.macroUnavailable}>{t("macrosUnavailable")}</Text>
            )}

            <View style={styles.macroSummary}>
              <Text style={styles.macroDisclaimer}>
                {t("macrosPartial")}
              </Text>
            </View>
          </View>

          {/* Meals Timeline Header */}
          <View style={styles.listHeader}>
            <Text style={styles.sectionLabel}>{t("meals")}</Text>
            <View style={styles.listCountBadge}>
              <Text style={styles.listCount}>{t("loggedCount", { count: meals.length })}</Text>
            </View>
          </View>

          {/* Floating Bento Meal Cards */}
          {meals.map((item, index) => {
            const isManual = item.items.some((i) => i.portion_provenance === "manual_user_input" || i.food_id === "USER_CUSTOM");
            const isHighlighted = item.idempotency_key === highlightedMealKey;
            const primaryFood = item.items[0]?.food_id ?? item.items[0]?.query ?? "";
            const emoji = getFoodEmoji(primaryFood);

            return (
              <View style={[styles.mealCard, isHighlighted && styles.mealCardHighlighted]} key={item.idempotency_key}>
                <Pressable
                  style={styles.mealCardPressable}
                  onPress={() => onOpenMeal(item)}
                  accessibilityRole="button"
                  accessibilityLabel={mealTitle(item)}
                >
                  <View style={styles.mealCardTop}>
                    <View style={styles.mealTimeRow}>
                      <Text style={styles.mealEmojiMini}>{emoji}</Text>
                      <View style={[styles.timeBadge, index === 0 && styles.timeBadgeLatest]}>
                        <Ionicons name="time-outline" size={12} color={index === 0 ? colors.terracotta : colors.muted} />
                        <Text style={[styles.timeText, index === 0 && styles.timeTextLatest]}>{formatTime(item.createdAt)}</Text>
                      </View>
                    </View>

                    <View style={styles.mealKcalWrap}>
                      {item.totals.kcal === 0 ? (
                        <Text style={styles.mealKcalZero}>— kcal</Text>
                      ) : (
                        <Text style={styles.mealKcalText}>
                          {isManual ? "" : "≈ "}
                          {Math.round(item.totals.kcal)} kcal
                          {isManual ? <Text style={styles.manualTag}> (Manuel)</Text> : null}
                        </Text>
                      )}
                      <Ionicons name="chevron-forward" size={15} color={colors.muted} />
                    </View>
                  </View>

                  <View style={styles.mealCardBody}>
                    <Text style={styles.mealCardTitle} numberOfLines={2}>{mealTitle(item)}</Text>
                    <View style={styles.mealMetaRow}>
                      <View style={styles.itemCountTag}>
                        <Text style={styles.itemCountText}>{t("itemCount", { count: item.items.length, plural: item.items.length === 1 ? "" : "s" })}</Text>
                      </View>
                      <Text style={styles.actionMetaText}>• {actionLabel(item.action)}</Text>
                    </View>

                    {isHighlighted ? (
                      <Pressable style={styles.undoButton} onPress={() => onUndoMeal(item)} accessibilityRole="button" accessibilityLabel={t("undoMealAccessibility")}>
                        <Ionicons name="arrow-undo-outline" size={14} color={colors.terracotta} />
                        <Text style={styles.undoButtonText}>{t("undoMeal")}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                </Pressable>

                <Pressable
                  style={styles.deleteButton}
                  onPress={() => onRemoveMeal(item)}
                  accessibilityRole="button"
                  accessibilityLabel={t("removeMealAccessibility")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="trash-outline" size={16} color="#A8A294" />
                </Pressable>
              </View>
            );
          })}
        </>
      )}

      <View style={styles.dayNote}>
        <Ionicons name="sparkles-outline" size={18} color={colors.terracotta} />
        <Text style={styles.dayNoteText}>{t("dayNote")}</Text>
      </View>
      <Pressable style={styles.primaryButton} onPress={onCapture}>
        <Ionicons name="camera-outline" size={19} color={colors.white} />
        <Text style={styles.primaryButtonText}>{meals.length === 0 ? t("emptyAction") : t("captureNext")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 18, paddingBottom: 34 },
  
  // Total Bento Card
  totalCard: {
    backgroundColor: "#1B221E",
    borderRadius: 22,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  totalTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  totalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(232, 182, 83, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  totalBadgeText: {
    color: "#E8B653",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  mealCountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  mealCountBadgeText: {
    color: "#D0D9CE",
    fontSize: 11,
    fontWeight: "700",
  },
  calorieRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
  },
  totalApprox: { color: "#AAB5A7", fontSize: 24, fontWeight: "600" },
  totalNumber: { color: colors.white, fontSize: 40, fontWeight: "900", letterSpacing: -1 },
  totalUnit: { color: "#AAB5A7", fontSize: 16, fontWeight: "700", marginLeft: 4 },
  
  portionRangeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    backgroundColor: "rgba(231, 197, 124, 0.12)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  totalRange: { color: "#E7C57C", fontSize: 11, fontWeight: "600" },
  
  macroBentoRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  macroBentoCard: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  macroBentoLabel: {
    color: "#AAB5A7",
    fontSize: 10,
    fontWeight: "800",
  },
  macroBentoValue: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
    marginTop: 3,
  },
  macroUnavailable: { color: "#AAB5A7", fontSize: 11, marginTop: 12 },
  macroSummary: { marginTop: 12 },
  macroDisclaimer: { color: "rgba(170, 181, 167, 0.65)", fontSize: 10 },

  // Empty Card
  emptyCard: { backgroundColor: colors.card, borderRadius: 22, borderWidth: 1, borderColor: colors.line, padding: 24, minHeight: 240, justifyContent: "center", alignItems: "center" },
  emptyIcon: { width: 56, height: 56, borderRadius: 20, backgroundColor: colors.terracottaSoft, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  emptyEyebrow: { color: colors.terracotta, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  emptyTitle: { color: colors.ink, fontSize: 24, fontWeight: "800", marginTop: 8, textAlign: "center" },
  emptyCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, marginTop: 8, textAlign: "center", maxWidth: 260 },

  // List Header
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 22, marginBottom: 10 },
  sectionLabel: { color: colors.ink, fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },
  listCountBadge: { backgroundColor: colors.card, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: colors.line },
  listCount: { color: colors.muted, fontSize: 11, fontWeight: "700" },

  // Floating Bento Meal Cards
  mealCard: {
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 13,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  mealCardHighlighted: {
    borderColor: colors.moss,
    backgroundColor: "#F7FAF7",
  },
  mealCardPressable: {
    flex: 1,
  },
  mealCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  mealTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mealEmojiMini: {
    fontSize: 16,
  },
  timeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.paper,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 7,
  },
  timeBadgeLatest: {
    backgroundColor: colors.terracottaSoft,
  },
  timeText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
  },
  timeTextLatest: {
    color: colors.terracotta,
    fontWeight: "800",
  },
  mealKcalWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  mealKcalText: {
    color: colors.terracotta,
    fontSize: 12,
    fontWeight: "800",
  },
  mealKcalZero: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  manualTag: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "600",
  },
  mealCardBody: {
    marginTop: 2,
  },
  mealCardTitle: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 18,
  },
  mealMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 5,
  },
  itemCountTag: {
    backgroundColor: colors.paper,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  itemCountText: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
  },
  actionMetaText: {
    color: colors.muted,
    fontSize: 11,
  },
  undoButton: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  undoButtonText: { color: colors.terracotta, fontSize: 11, fontWeight: "800" },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },

  dayNote: { flexDirection: "row", gap: 9, backgroundColor: colors.terracottaSoft, borderRadius: 16, padding: 13, marginTop: 14, marginBottom: 8 },
  dayNoteText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 16 },
  primaryButton: { minHeight: 52, borderRadius: 16, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, paddingHorizontal: 16, marginTop: 6 },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "800" },
});
