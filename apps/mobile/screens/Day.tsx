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
};

export function DayScreen({ meals, totalCalories, totalProtein, onCapture }: DayScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Header eyebrow={t("dayEyebrow")} title={t("dayTitle")} subtitle={formatDate()} />
      <View style={styles.totalCard}>
        <View>
          <Text style={styles.totalEyebrow}>{t("loggedSoFar")}</Text>
          <Text style={styles.totalNumber}>{Math.round(totalCalories)}<Text style={styles.totalUnit}> kcal</Text></Text>
        </View>
        <View style={styles.totalSide}>
          <Text style={styles.totalSideNumber}>{Math.round(totalProtein)} g</Text>
          <Text style={styles.totalSideLabel}>{t("protein")}</Text>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.sectionLabel}>{t("meals")}</Text>
        <Text style={styles.listCount}>{t("loggedCount", { count: meals.length })}</Text>
      </View>
      {meals.map((item, index) => (
        <View style={styles.mealRow} key={item.idempotency_key}>
          <View style={[styles.mealTime, index === 0 && styles.mealTimeCurrent]}>
            <Text style={[styles.mealTimeText, index === 0 && styles.mealTimeTextCurrent]}>{formatTime(item.createdAt)}</Text>
          </View>
          <View style={styles.mealRowBody}>
            <Text style={styles.mealTitle}>{item.items[0]?.candidates.find((candidate) => candidate.food_id === item.items[0]?.food_id)?.name ?? item.items[0]?.query ?? t("mealFallback")}</Text>
            <Text style={styles.mealMeta}>{t("itemCount", { count: item.items.length, plural: item.items.length === 1 ? "" : "s" })} · {actionLabel(item.action)}</Text>
          </View>
          <Text style={styles.mealKcal}>{Math.round(item.totals.kcal)} kcal</Text>
        </View>
      ))}

      <View style={styles.dayNote}>
        <Ionicons name="sparkles-outline" size={18} color={colors.terracotta} />
        <Text style={styles.dayNoteText}>{t("dayNote")}</Text>
      </View>
      <Pressable style={styles.primaryButton} onPress={onCapture}>
        <Ionicons name="camera-outline" size={19} color={colors.white} />
        <Text style={styles.primaryButtonText}>{t("captureNext")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 22, paddingBottom: 34 },
  totalCard: { backgroundColor: colors.ink, borderRadius: 25, padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  totalEyebrow: { color: "#AAB5A7", fontSize: 9, letterSpacing: 1.4, fontWeight: "800" },
  totalNumber: { color: colors.white, fontSize: 43, fontWeight: "800", letterSpacing: -1.7, marginTop: 6 },
  totalUnit: { color: "#AAB5A7", fontSize: 17, letterSpacing: 0, fontWeight: "600" },
  totalSide: { alignItems: "flex-end", paddingBottom: 5 },
  totalSideNumber: { color: "#E7C57C", fontSize: 18, fontWeight: "800" },
  totalSideLabel: { color: "#AAB5A7", fontSize: 11, marginTop: 2 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 27, marginBottom: 10 },
  sectionLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.4 },
  listCount: { color: colors.muted, fontSize: 11 },
  mealRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 15 },
  mealTime: { width: 58 },
  mealTimeCurrent: { borderLeftWidth: 3, borderLeftColor: colors.terracotta, paddingLeft: 8 },
  mealTimeText: { color: colors.muted, fontSize: 11 },
  mealTimeTextCurrent: { color: colors.terracotta, fontWeight: "800" },
  mealRowBody: { flex: 1, paddingRight: 8 },
  mealTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  mealMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  mealKcal: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  dayNote: { flexDirection: "row", gap: 9, backgroundColor: colors.terracottaSoft, borderRadius: 17, padding: 13, marginTop: 21 },
  dayNoteText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 16 },
  primaryButton: { minHeight: 54, borderRadius: 18, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, paddingHorizontal: 18, marginTop: 8 },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "800" },
});
