import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { t } from "../src/strings";
import { colors } from "./theme";

export type ErrorStateProps = {
  message: string;
  canRetry: boolean;
  onRetry: () => void;
  onRetake: () => void;
};

export function ErrorState({ message, canRetry, onRetry, onRetake }: ErrorStateProps) {
  return (
    <View style={styles.screen}>
      <View style={styles.iconCircle}>
        <Ionicons name="cloud-offline-outline" size={30} color={colors.terracotta} />
      </View>
      <Text style={styles.eyebrow}>{t("errorEyebrow")}</Text>
      <Text style={styles.title}>{t("errorTitle")}</Text>
      <Text style={styles.message}>{message}</Text>
      <View style={styles.safeCard}>
        <Ionicons name="lock-closed-outline" size={18} color={colors.moss} />
        <Text style={styles.safeCopy}>{t("draftSafe")}</Text>
      </View>
      {canRetry ? (
        <Pressable style={styles.primaryButton} onPress={onRetry}>
          <Ionicons name="refresh" size={19} color={colors.white} />
          <Text style={styles.primaryButtonText}>{t("retry")}</Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.textButton} onPress={onRetake}>
        <Text style={styles.textButtonText}>{t("retakePhoto")}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 28, justifyContent: "center" },
  iconCircle: { width: 68, height: 68, borderRadius: 24, backgroundColor: colors.terracottaSoft, alignItems: "center", justifyContent: "center", marginBottom: 24 },
  eyebrow: { color: colors.terracotta, fontSize: 10, fontWeight: "800", letterSpacing: 1.7 },
  title: { color: colors.ink, fontSize: 34, lineHeight: 39, fontWeight: "800", letterSpacing: -1.2, marginTop: 11 },
  message: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 320 },
  safeCard: { flexDirection: "row", alignItems: "center", gap: 9, backgroundColor: colors.mossSoft, borderRadius: 17, padding: 14, marginTop: 26 },
  safeCopy: { color: colors.moss, fontSize: 13, fontWeight: "800" },
  primaryButton: { minHeight: 54, borderRadius: 18, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, paddingHorizontal: 18, marginTop: 24 },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  textButton: { alignItems: "center", paddingVertical: 17 },
  textButtonText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
});
