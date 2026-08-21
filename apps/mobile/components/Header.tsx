import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "./theme";
import { t } from "../src/strings";

export function Header({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <Text style={styles.brand}>{t("brand")}</Text>
        <View style={styles.brandDot} />
        <Text style={styles.eyebrow}>{eyebrow}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: 14, paddingBottom: 22 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
  brand: { color: colors.ink, fontSize: 19, fontWeight: "800", letterSpacing: -0.8 },
  brandDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.terracotta },
  eyebrow: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.6 },
  title: { color: colors.ink, fontSize: 32, lineHeight: 36, fontWeight: "800", letterSpacing: -1.2 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 7 },
});
