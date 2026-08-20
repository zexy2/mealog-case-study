import React from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { colors } from "./theme";

export function AuditRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.auditRow}>
      <Text style={styles.auditLabel}>{label}</Text>
      <Text style={[styles.auditValue, mono && styles.auditMono]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  auditRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  auditLabel: { color: colors.muted, fontSize: 11 },
  auditValue: { color: colors.ink, fontSize: 11, fontWeight: "700", textAlign: "right", flexShrink: 1 },
  auditMono: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) },
});
