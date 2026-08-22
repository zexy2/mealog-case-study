import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { t } from "../src/strings";
import { MealLog } from "../src/types";
import { Header } from "../components/Header";
import { colors } from "../components/theme";

export type AbstentionScreenProps = {
  meal: MealLog;
  onDescribe: () => void;
  onRetake: () => void;
};

export function AbstentionScreen({ meal, onDescribe, onRetake }: AbstentionScreenProps) {
  const item = meal.items[0];
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Header eyebrow={t("abstainEyebrow")} title={t("abstainTitle")} subtitle={t("actionAsk")} />
      <View style={styles.heroCard}>
        <View style={styles.iconCircle}>
          <Ionicons name="help-circle-outline" size={31} color={colors.yellow} />
        </View>
        <Text style={styles.heroTitle}>{t("abstainCode")}</Text>
        <Text style={styles.heroCopy}>{t("abstainCopy")}</Text>
      </View>

      <View style={styles.observedCard}>
        <Text style={styles.sectionLabel}>{t("abstainObserved")}</Text>
        <Text style={styles.observedText}>{item?.query ?? t("mealFallback")}</Text>
      </View>

      <View style={styles.candidatesCard}>
        <Text style={styles.sectionLabel}>{t("abstainCandidates")}</Text>
        {item?.candidates.length ? (
          <View style={styles.candidateList}>
            {item.candidates.map((candidate) => (
              <View key={candidate.food_id} style={styles.candidateRow}>
                <View style={styles.candidateIcon}><Ionicons name="arrow-forward-outline" size={15} color={colors.muted} /></View>
                <Text style={styles.candidateName}>{candidate.name}</Text>
                <Text style={styles.candidateScore}>{Math.round(candidate.score * 100)}%</Text>
              </View>
            ))}
          </View>
        ) : <Text style={styles.noCandidates}>{t("abstainNoCandidates")}</Text>}
      </View>

      <Pressable style={styles.primaryButton} onPress={onDescribe}>
        <Ionicons name="create-outline" size={19} color={colors.white} />
        <Text style={styles.primaryButtonText}>{t("describeMeal")}</Text>
      </Pressable>
      <Pressable style={styles.textButton} onPress={onRetake}>
        <Ionicons name="camera-outline" size={17} color={colors.muted} />
        <Text style={styles.textButtonText}>{t("retakePhoto")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 22, paddingBottom: 34 },
  heroCard: { backgroundColor: "#FBF1D8", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "#EBD8A5" },
  iconCircle: { width: 54, height: 54, borderRadius: 19, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", marginBottom: 17 },
  heroTitle: { color: "#8D641C", fontSize: 13, fontWeight: "800", letterSpacing: 1.1 },
  heroCopy: { color: colors.ink, fontSize: 16, lineHeight: 23, fontWeight: "700", marginTop: 8 },
  observedCard: { backgroundColor: colors.card, borderRadius: 19, borderWidth: 1, borderColor: colors.line, padding: 16, marginTop: 15 },
  sectionLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.3 },
  observedText: { color: colors.ink, fontSize: 18, fontWeight: "800", marginTop: 7 },
  candidatesCard: { backgroundColor: colors.card, borderRadius: 19, borderWidth: 1, borderColor: colors.line, padding: 16, marginTop: 15 },
  candidateList: { gap: 10, marginTop: 13 },
  candidateRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  candidateIcon: { width: 27, height: 27, borderRadius: 10, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  candidateName: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: "700" },
  candidateScore: { color: colors.muted, fontSize: 11, fontWeight: "700" },
  noCandidates: { color: colors.muted, fontSize: 13, marginTop: 12 },
  primaryButton: { minHeight: 54, borderRadius: 18, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, paddingHorizontal: 18, marginTop: 18 },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  textButton: { alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, paddingVertical: 17 },
  textButtonText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
});
