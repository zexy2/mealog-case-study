import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "./theme";
import { t } from "../src/strings";

export type Screen = "capture" | "review" | "abstain" | "day";

export function BottomNav({ screen, canReview, onChange }: { screen: Screen; canReview?: boolean; onChange: (screen: Screen) => void }) {
  return (
    <View style={styles.nav} accessibilityRole="tablist">
      <NavItem icon="camera-outline" label={t("navCapture")} active={screen === "capture"} onPress={() => onChange("capture")} />
      <NavItem icon="checkmark-circle-outline" label={t("navReview")} active={screen === "review"} onPress={() => onChange("review")} />
      <NavItem icon="calendar-outline" label={t("navDay")} active={screen === "day"} onPress={() => onChange("day")} />
    </View>
  );
}

function NavItem({ icon, label, active, disabled, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.navItem, pressed && !disabled && styles.navItemPressed]}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: active, disabled: Boolean(disabled) }}
    >
      <Ionicons name={icon} size={22} color={disabled ? colors.disabled : active ? colors.terracotta : colors.mutedStrong} />
      <Text style={[styles.navLabel, active && styles.navLabelActive, disabled && styles.navLabelDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // The app shell already applies the bottom safe-area inset, so this only adds the visual gap.
  nav: { flexDirection: "row", justifyContent: "space-around", borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card, paddingTop: 8, paddingBottom: Platform.OS === "ios" ? 6 : 10 },
  // 48pt tall keeps every tab above the 44pt minimum touch target.
  navItem: { alignItems: "center", justifyContent: "center", gap: 4, minWidth: 78, minHeight: 48, paddingHorizontal: 8 },
  navItemPressed: { opacity: 0.7 },

  navLabel: { color: colors.mutedStrong, fontSize: 11, fontWeight: "700" },
  navLabelActive: { color: colors.terracotta },
  navLabelDisabled: { color: colors.disabled },
});
