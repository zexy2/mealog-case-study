import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "./theme";

export function AuditRow({
  label,
  value,
  badge,
  mono = false,
}: {
  label: string;
  value: string;
  badge?: string;
  mono?: boolean;
}) {
  return (
    <View style={styles.auditRow}>
      <Text style={styles.auditLabel}>{label}</Text>
      <View style={styles.valueWrap}>
        <Text style={[styles.auditValue, mono && styles.auditMono]}>{value}</Text>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  auditRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#F0EBE1",
    gap: 12,
  },
  auditLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" },
  valueWrap: { flexDirection: "row", alignItems: "center", gap: 6, flexShrink: 1, justifyContent: "flex-end" },
  auditValue: { color: colors.ink, fontSize: 12, fontWeight: "700", textAlign: "right" },
  auditMono: { color: colors.terracotta, fontSize: 11, fontWeight: "700" },
  badge: { backgroundColor: "#E6F0E8", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  badgeText: { color: colors.moss, fontSize: 10, fontWeight: "800" },
});
