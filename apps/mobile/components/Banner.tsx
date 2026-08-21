import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "./theme";

export function Banner({ message }: { message: string }) {
  return (
    <View style={styles.banner}>
      <Ionicons name="checkmark-circle" size={19} color={colors.moss} />
      <Text style={styles.bannerText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { position: "absolute", zIndex: 10, top: 52, left: 22, right: 22, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.mossSoft, borderRadius: 15, padding: 12 },
  bannerText: { color: colors.moss, fontSize: 12, fontWeight: "800" },
});
