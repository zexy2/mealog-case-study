import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { MealLog } from "../src/types";
import { t } from "../src/strings";
import { Header } from "../components/Header";
import { actionLabel, formatDate, formatTime } from "../components/meal";
import { colors } from "../components/theme";

export type DayScreenProps = {
  meals: MealLog[];
  totalCalories: number;
  totalProtein: number;
  onCapture: () => void;
  onOpenMeal: (meal: MealLog) => void;
  onRemoveMeal: (meal: MealLog) => void;
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
  return t("itemWithQuantity", {
    quantity: item.quantity,
    unit: item.unit ? ` ${item.unit}` : "",
    name,
  });
}

export function mealTitle(meal: MealLog) {
  const names = meal.items.map(itemName).filter(Boolean);
  return names.length > 0 ? names.join(" · ") : t("mealFallback");
}

export function DayScreen({ meals, totalCalories, totalProtein, onCapture, onOpenMeal, onRemoveMeal }: DayScreenProps) {
  const portions = portionTotals(meals);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Header eyebrow={t("dayEyebrow")} title={t("dayTitle")} subtitle={formatDate()} />
      {meals.length === 0 ? (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}><Ionicons name="sunny-outline" size={28} color={colors.terracotta} /></View>
          <Text style={styles.emptyEyebrow}>{t("emptyEyebrow")}</Text>
          <Text style={styles.emptyTitle}>{t("emptyTitle")}</Text>
          <Text style={styles.emptyCopy}>{t("emptyCopy")}</Text>
        </View>
      ) : (
        <>
          <View style={styles.totalCard}>
            <View style={styles.totalMain}>
              <Text style={styles.totalEyebrow}>{t("loggedSoFar")}</Text>
              <Text style={styles.totalNumber}><Text style={styles.totalApprox}>≈ </Text>{Math.round(totalCalories)}<Text style={styles.totalUnit}> kcal</Text></Text>
              <Text style={styles.totalRange}>{t("dayPortionRange", { midpoint: Math.round(portions.midpoint), low: Math.round(portions.p10), high: Math.round(portions.p90) })}</Text>
            </View>
            <View style={styles.totalSide}>
              <Text style={styles.totalSideNumber}>≈ {Math.round(totalProtein)} g</Text>
              <Text style={styles.totalSideLabel}>{t("protein")}</Text>
            </View>
          </View>

          <View style={styles.listHeader}>
            <Text style={styles.sectionLabel}>{t("meals")}</Text>
            <Text style={styles.listCount}>{t("loggedCount", { count: meals.length })}</Text>
          </View>
          {meals.map((item, index) => (
            <View style={styles.mealRow} key={item.idempotency_key}>
              <Pressable
                style={styles.mealRowOpen}
                onPress={() => onOpenMeal(item)}
                accessibilityRole="button"
                accessibilityLabel={mealTitle(item)}
              >
                <View style={[styles.mealTime, index === 0 && styles.mealTimeCurrent]}>
                  <Text style={[styles.mealTimeText, index === 0 && styles.mealTimeTextCurrent]}>{formatTime(item.createdAt)}</Text>
                </View>
                <View style={styles.mealRowBody}>
                  <Text style={styles.mealTitle} numberOfLines={2}>{mealTitle(item)}</Text>
                  <Text style={styles.mealMeta}>{t("itemCount", { count: item.items.length, plural: item.items.length === 1 ? "" : "s" })} · {actionLabel(item.action)}</Text>
                </View>
                <Text style={styles.mealKcal}>{Math.round(item.totals.kcal)} kcal</Text>
                <Ionicons name="chevron-forward" size={17} color={colors.muted} />
              </Pressable>
              <Pressable
                style={styles.removeButton}
                onPress={() => onRemoveMeal(item)}
                accessibilityRole="button"
                accessibilityLabel={t("removeMealAccessibility")}
              >
                <Ionicons name="trash-outline" size={17} color={colors.muted} />
              </Pressable>
            </View>
          ))}
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
  screen: { flex: 1 },
  content: { padding: 22, paddingBottom: 34 },
  totalCard: { backgroundColor: colors.ink, borderRadius: 25, padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  totalMain: { flex: 1, paddingRight: 10 },
  emptyCard: { backgroundColor: colors.card, borderRadius: 25, borderWidth: 1, borderColor: colors.line, padding: 24, minHeight: 260, justifyContent: "center" },
  emptyIcon: { width: 56, height: 56, borderRadius: 19, backgroundColor: colors.terracottaSoft, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  emptyEyebrow: { color: colors.terracotta, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  emptyTitle: { color: colors.ink, fontSize: 28, lineHeight: 33, fontWeight: "800", letterSpacing: -0.8, marginTop: 10 },
  emptyCopy: { color: colors.muted, fontSize: 14, lineHeight: 21, marginTop: 9, maxWidth: 280 },
  totalEyebrow: { color: "#AAB5A7", fontSize: 9, letterSpacing: 1.4, fontWeight: "800" },
  totalNumber: { color: colors.white, fontSize: 43, fontWeight: "800", letterSpacing: -1.7, marginTop: 6 },
  totalApprox: { color: "#AAB5A7", fontSize: 22, letterSpacing: -0.5 },
  totalUnit: { color: "#AAB5A7", fontSize: 17, letterSpacing: 0, fontWeight: "600" },
  totalRange: { color: "#E7C57C", fontSize: 11, lineHeight: 16, marginTop: 6 },
  totalSide: { alignItems: "flex-end", paddingBottom: 5 },
  totalSideNumber: { color: "#E7C57C", fontSize: 18, fontWeight: "800" },
  totalSideLabel: { color: "#AAB5A7", fontSize: 11, marginTop: 2 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 27, marginBottom: 10 },
  sectionLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.4 },
  listCount: { color: colors.muted, fontSize: 11 },
  mealRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 15 },
  mealRowOpen: { flex: 1, flexDirection: "row", alignItems: "center" },
  mealTime: { width: 58 },
  mealTimeCurrent: { borderLeftWidth: 3, borderLeftColor: colors.terracotta, paddingLeft: 8 },
  mealTimeText: { color: colors.muted, fontSize: 11 },
  mealTimeTextCurrent: { color: colors.terracotta, fontWeight: "800" },
  mealRowBody: { flex: 1, paddingRight: 8 },
  mealTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  mealMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  mealKcal: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  removeButton: { width: 34, minHeight: 36, alignItems: "center", justifyContent: "center", marginLeft: 7 },
  dayNote: { flexDirection: "row", gap: 9, backgroundColor: colors.terracottaSoft, borderRadius: 17, padding: 13, marginTop: 21 },
  dayNoteText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 16 },
  primaryButton: { minHeight: 54, borderRadius: 18, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, paddingHorizontal: 18, marginTop: 8 },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "800" },
});
