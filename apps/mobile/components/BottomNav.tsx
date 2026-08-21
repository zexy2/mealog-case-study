import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "./theme";

export type Screen = "capture" | "review" | "day";

export function BottomNav({ screen, canReview, onChange }: { screen: Screen; canReview: boolean; onChange: (screen: Screen) => void }) {
  return (
    <View style={styles.nav}>
      <NavItem icon="camera-outline" label="Capture" active={screen === "capture"} onPress={() => onChange("capture")} />
      <NavItem icon="checkmark-circle-outline" label="Review" active={screen === "review"} disabled={!canReview} onPress={() => onChange("review")} />
      <NavItem icon="calendar-outline" label="Day" active={screen === "day"} onPress={() => onChange("day")} />
    </View>
  );
}

function NavItem({ icon, label, active, disabled, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={styles.navItem}>
      <Ionicons name={icon} size={21} color={disabled ? colors.line : active ? colors.terracotta : colors.muted} />
      <Text style={[styles.navLabel, active && styles.navLabelActive, disabled && styles.navLabelDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  nav: { flexDirection: "row", justifyContent: "space-around", borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card, paddingTop: 9, paddingBottom: Platform.OS === "ios" ? 23 : 12 },
  navItem: { alignItems: "center", gap: 4, minWidth: 78 },
  navLabel: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  navLabelActive: { color: colors.terracotta },
  navLabelDisabled: { color: colors.line },
});
