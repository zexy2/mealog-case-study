import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Candidate, MealLog } from "../src/types";
import { questionText, t } from "../src/strings";
import { AuditRow } from "../components/AuditRow";
import { Header } from "../components/Header";
import { actionLabel, actionTone } from "../components/meal";
import { colors } from "../components/theme";

type PortionSliderProps = {
  minimumValue: number;
  maximumValue: number;
  value: number;
  minimumTrackTintColor: string;
  maximumTrackTintColor: string;
  thumbTintColor: string;
  onValueChange: (value: number) => void;
  accessibilityLabel: string;
};

const PortionSlider = Slider as unknown as React.ComponentType<PortionSliderProps>;

function quantityLabel(item: MealLog["items"][number]) {
  if (item.quantity === null || item.quantity === undefined) {
    return t("quantityUnknown");
  }
  const quantity = String(item.quantity);
  return t("quantityValue", { quantity, unit: item.unit ? ` ${item.unit}` : "" });
}

export type ReviewScreenProps = {
  meal: MealLog;
  expandedItem: number | null;
  setExpandedItem: (value: number | null) => void;
  portionEdits: Record<number, number>;
  setPortionEdits: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  selectedCandidates: Record<number, string>;
  onChooseCandidate: (index: number, candidate: Candidate) => void;
  onSave: () => void;
  onBack: () => void;
};

export function ReviewScreen({
  meal,
  expandedItem,
  setExpandedItem,
  portionEdits,
  setPortionEdits,
  selectedCandidates,
  onChooseCandidate,
  onSave,
  onBack,
}: ReviewScreenProps) {
  const displayAction = meal.degraded ? "review" : meal.action;
  const tone = actionTone(displayAction);
  const askText = questionText(meal.items[0]);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Header eyebrow={t("reviewEyebrow")} title={t("reviewTitle")} subtitle={t("reviewSubtitle")} />
      {meal.degraded ? (
        <View style={styles.degradedBanner}>
          <Ionicons name="warning-outline" size={19} color="#8D641C" />
          <View style={styles.degradedCopy}>
            <Text style={styles.degradedTitle}>{t("degradedTitle")}</Text>
            <Text style={styles.degradedText}>{t("degradedCopy")}</Text>
          </View>
        </View>
      ) : null}
      <View style={[styles.actionBanner, { backgroundColor: tone.backgroundColor }]}>
        <View style={[styles.actionMark, { backgroundColor: tone.color }]}>
          <Ionicons name={displayAction === "ask" ? "help" : displayAction === "auto_accept" ? "checkmark" : "eye"} size={17} color={colors.white} />
        </View>
        <View style={styles.actionBannerCopy}>
          <Text style={[styles.actionBannerTitle, { color: tone.color }]}>{actionLabel(displayAction)}</Text>
          <Text style={styles.actionBannerText}>{meal.degraded ? t("degradedCopy") : meal.action === "ask" ? askText : t("editableMatch")}</Text>
        </View>
      </View>

      {meal.items.map((item, index) => {
        const selected = selectedCandidates[index] ?? item.food_id;
        const grams = portionEdits[index] ?? item.grams;
        const hasRange = item.grams_p90 > item.grams_p10;
        return (
          <View key={`${item.query}-${index}`} style={styles.itemCard}>
            <View style={styles.itemTopRow}>
              <View style={styles.itemIndex}><Text style={styles.itemIndexText}>{String(index + 1).padStart(2, "0")}</Text></View>
              <View style={styles.itemNameWrap}>
                <Text style={styles.itemQuery}>{item.query}</Text>
                <Text style={styles.itemMatch}>{item.food_id === "ABSTAIN" ? t("needsMatch") : item.candidates.find((candidate) => candidate.food_id === selected)?.name ?? selected}</Text>
                <Text style={styles.quantityText}>{quantityLabel(item)}</Text>
              </View>
              <View style={styles.confidencePill}><Text style={styles.confidenceText}>{Math.round(item.confidence * 100)}%</Text></View>
            </View>

            {meal.action === "ask" ? (
              <View style={styles.questionCard}>
                <Text style={styles.questionLabel}>{t("oneQuestion")}</Text>
                <Text style={styles.questionText}>{askText}</Text>
              </View>
            ) : null}

            <View style={styles.portionHeader}>
              <Text style={styles.sectionLabel}>{t("portion")}</Text>
              <Text style={styles.gramsValue}>{grams ? (hasRange ? t("portionBand", { grams: Math.round(grams), low: Math.round(item.grams_p10), high: Math.round(item.grams_p90) }) : `${Math.round(grams)} g`) : t("notEstimated")}</Text>
            </View>
            {hasRange ? (
              <>
                <PortionSlider
                  minimumValue={item.grams_p10}
                  maximumValue={item.grams_p90}
                  value={grams}
                  minimumTrackTintColor={colors.terracotta}
                  maximumTrackTintColor={colors.line}
                  thumbTintColor={colors.terracotta}
                  onValueChange={(value) => setPortionEdits((current) => ({ ...current, [index]: value }))}
                  accessibilityLabel={t("portionFor", { query: item.query })}
                />
                <View style={styles.rangeLabels}>
                  <Text style={styles.rangeText}>{t("portionLow", { grams: Math.round(item.grams_p10) })}</Text>
                  <Text style={styles.rangeText}>{t("portionHigh", { grams: Math.round(item.grams_p90) })}</Text>
                </View>
              </>
            ) : <Text style={styles.mutedNote}>{t("portionPending")}</Text>}

            <Text style={[styles.sectionLabel, { marginTop: 22 }]}>{t("alternates")}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {item.candidates.map((candidate) => {
                const isSelected = selected === candidate.food_id;
                return (
                  <Pressable key={candidate.food_id} onPress={() => onChooseCandidate(index, candidate)} style={[styles.chip, isSelected && styles.chipSelected]}>
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{candidate.name}</Text>
                    <Text style={[styles.chipScore, isSelected && styles.chipTextSelected]}>{Math.round(candidate.score * 100)}%</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable style={styles.whyRow} onPress={() => setExpandedItem(expandedItem === index ? null : index)}>
              <View style={styles.whyIcon}><Ionicons name="finger-print-outline" size={17} color={colors.moss} /></View>
              <View style={styles.whyCopy}><Text style={styles.whyTitle}>{t("whyResult")}</Text><Text style={styles.whySubtitle}>{t("traceDecision")}</Text></View>
              <Ionicons name={expandedItem === index ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
            </Pressable>
            {expandedItem === index ? (
              <View style={styles.auditBox}>
                <AuditRow label={t("matchedFoodId")} value={selected} mono />
                <AuditRow label={t("sourceDatabase")} value={item.source_database ?? t("catalogueProvenance")} />
                <AuditRow label={t("confidence")} value={`${Math.round(item.confidence * 100)}%`} />
                <AuditRow label={t("quantity")} value={quantityLabel(item)} />
                <AuditRow label={t("exactGrams")} value={grams ? `${Math.round(grams)} g` : t("pending")} />
              </View>
            ) : null}
          </View>
        );
      })}

      <Pressable style={styles.primaryButton} onPress={onSave}>
        <Text style={styles.primaryButtonText}>{meal.action === "ask" ? t("saveQuestion") : t("saveToday")}</Text>
        <Ionicons name="arrow-forward" size={19} color={colors.white} />
      </Pressable>
      <Pressable style={styles.textButton} onPress={onBack}><Text style={styles.textButtonLabel}>{t("captureAnother")}</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 22, paddingBottom: 34 },
  degradedBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#FBF1D8", borderRadius: 17, padding: 13, marginBottom: 14 },
  degradedCopy: { flex: 1 },
  degradedTitle: { color: "#8D641C", fontSize: 12, fontWeight: "800" },
  degradedText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  actionBanner: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 20, padding: 15, marginBottom: 17 },
  actionMark: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  actionBannerCopy: { flex: 1 },
  actionBannerTitle: { fontSize: 13, fontWeight: "800" },
  actionBannerText: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  itemCard: { backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: 17, marginBottom: 16 },
  itemTopRow: { flexDirection: "row", alignItems: "center" },
  itemIndex: { width: 35, height: 35, borderRadius: 13, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  itemIndexText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  itemNameWrap: { flex: 1, marginLeft: 11 },
  itemQuery: { color: colors.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  itemMatch: { color: colors.ink, fontSize: 16, fontWeight: "800", marginTop: 3 },
  quantityText: { color: colors.muted, fontSize: 11, marginTop: 5 },
  confidencePill: { backgroundColor: colors.mossSoft, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
  confidenceText: { color: colors.moss, fontSize: 11, fontWeight: "800" },
  questionCard: { backgroundColor: "#FBF1D8", borderRadius: 15, padding: 13, marginTop: 17 },
  questionLabel: { color: "#8D641C", fontSize: 9, fontWeight: "800", letterSpacing: 1.3 },
  questionText: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: "700", marginTop: 5 },
  portionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 22 },
  sectionLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.4 },
  gramsValue: { color: colors.terracotta, fontSize: 18, fontWeight: "800" },
  rangeLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: -2 },
  rangeText: { color: colors.muted, fontSize: 10 },
  mutedNote: { color: colors.muted, fontSize: 12, marginTop: 13 },
  chipsRow: { gap: 8, paddingTop: 11, paddingBottom: 2 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 8, minWidth: 100 },
  chipSelected: { backgroundColor: colors.terracotta, borderColor: colors.terracotta },
  chipText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  chipTextSelected: { color: colors.white },
  chipScore: { color: colors.muted, fontSize: 10, marginTop: 3 },
  whyRow: { flexDirection: "row", alignItems: "center", marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: colors.line },
  whyIcon: { width: 32, height: 32, borderRadius: 12, backgroundColor: colors.mossSoft, alignItems: "center", justifyContent: "center" },
  whyCopy: { flex: 1, marginLeft: 10 },
  whyTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  whySubtitle: { color: colors.muted, fontSize: 11, marginTop: 2 },
  auditBox: { backgroundColor: colors.paper, borderRadius: 15, padding: 12, marginTop: 12, gap: 9 },
  primaryButton: { minHeight: 54, borderRadius: 18, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, paddingHorizontal: 18, marginTop: 8 },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  textButton: { alignItems: "center", paddingVertical: 16 },
  textButtonLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
});
