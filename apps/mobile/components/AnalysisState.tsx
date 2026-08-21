import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { colors } from "./theme";
import { StringKey, t } from "../src/strings";

export const ANALYSIS_STEPS = ["analysisStepReading", "analysisStepMatching", "analysisStepPortion"] as const satisfies readonly StringKey[];

export function AnalysisState({ step }: { step: number }) {
  return (
    <View style={styles.analysisScreen}>
      <View style={styles.analysisMark}>
        <Ionicons name="scan-outline" size={30} color={colors.terracotta} />
      </View>
      <Text style={styles.analysisEyebrow}>{t("analysisEyebrow")}</Text>
      <Text style={styles.analysisTitle}>
        {t("analysisTitle")}
        <Text style={styles.analysisTitleAccent}>{t("analysisTitleAccent")}</Text>
      </Text>
      <Text style={styles.analysisCopy}>{t("analysisCopy")}</Text>
      <View style={styles.pipelineCard}>
        {ANALYSIS_STEPS.map((label, index) => {
          const active = index === step;
          const done = index < step;
          return (
            <View key={label} style={styles.pipelineRow}>
              <View style={[styles.pipelineDot, active && styles.pipelineDotActive, done && styles.pipelineDotDone]}>
                {done ? <Ionicons name="checkmark" size={13} color={colors.white} /> : null}
              </View>
              <Text style={[styles.pipelineLabel, active && styles.pipelineLabelActive]}>{t(label)}</Text>
              {active ? <ActivityIndicator size="small" color={colors.terracotta} /> : null}
            </View>
          );
        })}
      </View>
      <Text style={styles.analysisFootnote}>{t("analysisFootnote")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  analysisScreen: { flex: 1, padding: 28, justifyContent: "center" },
  analysisMark: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.terracottaSoft, alignItems: "center", justifyContent: "center", marginBottom: 26 },
  analysisEyebrow: { color: colors.terracotta, fontSize: 10, fontWeight: "800", letterSpacing: 1.7 },
  analysisTitle: { color: colors.ink, fontSize: 34, lineHeight: 39, fontWeight: "800", letterSpacing: -1.2, marginTop: 12 },
  analysisTitleAccent: { color: colors.terracotta },
  analysisCopy: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 310 },
  pipelineCard: { backgroundColor: colors.card, borderRadius: 22, padding: 19, marginTop: 34, borderWidth: 1, borderColor: colors.line },
  pipelineRow: { minHeight: 43, flexDirection: "row", alignItems: "center", gap: 12 },
  pipelineDot: { width: 23, height: 23, borderRadius: 12, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  pipelineDotActive: { borderColor: colors.terracotta, backgroundColor: colors.terracottaSoft },
  pipelineDotDone: { borderColor: colors.moss, backgroundColor: colors.moss },
  pipelineLabel: { flex: 1, color: colors.muted, fontSize: 14 },
  pipelineLabelActive: { color: colors.ink, fontWeight: "800" },
  analysisFootnote: { color: colors.muted, fontSize: 11, marginTop: 17 },
});
