import { Ionicons } from "@expo/vector-icons";
import { CameraView } from "expo-camera";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { isDemoMode } from "../src/api";
import { DEMO_SCENARIOS } from "../src/demoScenarios";
import { t } from "../src/strings";
import { DemoScenario, PendingCapture } from "../src/types";
import { Header } from "../components/Header";
import { formatDate } from "../components/meal";
import { colors } from "../components/theme";

const DEMO_LABELS = {
  review: "demoReview",
  abstain: "demoAbstain",
  error: "demoError",
  empty: "demoEmpty",
} as const;

export type CaptureScreenProps = {
  cameraRef: React.RefObject<CameraView | null>;
  permissionGranted: boolean;
  requestPermission: () => Promise<unknown>;
  text: string;
  setText: (value: string) => void;
  pending: PendingCapture | null;
  onCapture: () => void;
  onChoosePhoto: () => void;
  onSubmitText: () => void;
  onRetry: () => void;
  onDemoScenario: (scenario: DemoScenario) => void;
};

export function CaptureScreen({
  cameraRef,
  permissionGranted,
  requestPermission,
  text,
  setText,
  pending,
  onCapture,
  onChoosePhoto,
  onSubmitText,
  onRetry,
  onDemoScenario,
}: CaptureScreenProps) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Header eyebrow={t("captureEyebrow")} title={t("captureTitle")} subtitle={formatDate()} />
      <View style={styles.cameraFrame}>
        {permissionGranted ? (
          <CameraView ref={cameraRef} facing="back" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.cameraFallback}>
            <View style={styles.cameraIconCircle}>
              <Ionicons name="camera-outline" size={28} color={colors.terracotta} />
            </View>
            <Text style={styles.fallbackTitle}>{t("cameraWaiting")}</Text>
            <Text style={styles.fallbackCopy}>{t("cameraPermission")}</Text>
            <Pressable style={styles.smallOutlineButton} onPress={requestPermission}>
              <Text style={styles.smallOutlineButtonText}>{t("allowCamera")}</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.cameraTopRow}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{t("liveCamera")}</Text>
          </View>
          <Pressable style={styles.cameraLibraryButton} onPress={onChoosePhoto} accessibilityLabel={t("choosePhoto")}>
            <Ionicons name="images-outline" size={18} color={colors.ink} />
          </Pressable>
        </View>
        {permissionGranted ? (
          <Pressable style={styles.shutter} onPress={onCapture} accessibilityLabel={t("takePlatePhoto")}>
            <View style={styles.shutterInner} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>{t("tellMe")}</Text>
        <View style={styles.orLine} />
      </View>
      <View style={styles.textInputWrap}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t("mealPlaceholder")}
          placeholderTextColor={colors.muted}
          style={styles.textInput}
          returnKeyType="send"
          onSubmitEditing={onSubmitText}
        />
        <Pressable
          style={[styles.textSubmit, !text.trim() && styles.textSubmitDisabled]}
          onPress={onSubmitText}
          disabled={!text.trim()}
          accessibilityLabel={t("sendMealDescription")}
        >
          <Ionicons name="arrow-up" size={20} color={colors.white} />
        </Pressable>
      </View>
      <Text style={styles.demoHint}>{isDemoMode ? t("demoHint") : t("liveContractHint")}</Text>

      {isDemoMode ? (
        <View style={styles.demoPanel}>
          <Text style={styles.demoPanelTitle}>{t("demoPanelTitle")}</Text>
          <View style={styles.demoOptions}>
            {DEMO_SCENARIOS.map((scenario) => (
              <Pressable key={scenario} style={styles.demoOption} onPress={() => onDemoScenario(scenario)}>
                <Text style={styles.demoOptionText}>{t(DEMO_LABELS[scenario])}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.demoLoadingNote}>{t("demoLoadingNote")}</Text>
        </View>
      ) : null}

      {pending ? (
        <View style={styles.pendingCard}>
          <View style={styles.pendingIcon}>
            <Ionicons name="cloud-upload-outline" size={18} color={colors.moss} />
          </View>
          <View style={styles.messageWrap}>
            <Text style={styles.messageTitle}>{t("pendingCaptureTitle")}</Text>
            <Text style={styles.messageCopy}>{t("pendingCaptureCopy")}</Text>
          </View>
          <Pressable onPress={onRetry} style={styles.resumeButton}>
            <Text style={styles.resumeText}>{t("resume")}</Text>
          </Pressable>
        </View>
      ) : null}

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 22, paddingBottom: 32 },
  cameraFrame: { height: 350, borderRadius: 28, overflow: "hidden", backgroundColor: "#D9D4C9", position: "relative" },
  cameraFallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: 30 },
  cameraIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  fallbackTitle: { color: colors.ink, fontSize: 17, fontWeight: "800", textAlign: "center" },
  fallbackCopy: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: "center", marginTop: 7, maxWidth: 220 },
  smallOutlineButton: { borderWidth: 1, borderColor: colors.terracotta, borderRadius: 18, paddingHorizontal: 16, paddingVertical: 9, marginTop: 18 },
  smallOutlineButtonText: { color: colors.terracotta, fontSize: 12, fontWeight: "800" },
  cameraTopRow: { position: "absolute", top: 14, left: 14, right: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 7, backgroundColor: "rgba(32,38,31,0.72)", paddingHorizontal: 10, paddingVertical: 7, borderRadius: 14 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#E77B58" },
  liveText: { color: colors.white, fontSize: 9, fontWeight: "800", letterSpacing: 1.1 },
  cameraLibraryButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,253,248,0.9)", alignItems: "center", justifyContent: "center" },
  shutter: { position: "absolute", bottom: 18, alignSelf: "center", width: 72, height: 72, borderRadius: 36, borderWidth: 5, borderColor: colors.white, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,253,248,0.35)" },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.terracotta },
  orRow: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 20 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.line },
  orText: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.5 },
  textInputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 18, borderWidth: 1, borderColor: colors.line, padding: 6, paddingLeft: 17 },
  textInput: { flex: 1, color: colors.ink, fontSize: 15, minHeight: 43 },
  textSubmit: { width: 40, height: 40, borderRadius: 14, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center" },
  textSubmitDisabled: { backgroundColor: colors.line },
  demoHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 9, marginLeft: 3 },
  pendingCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mossSoft, borderRadius: 18, padding: 13, marginTop: 19, gap: 10 },
  pendingIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  messageWrap: { flex: 1 },
  messageTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  messageCopy: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  resumeButton: { backgroundColor: colors.moss, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 9 },
  resumeText: { color: colors.white, fontSize: 11, fontWeight: "800" },
  demoPanel: { backgroundColor: colors.paper, borderRadius: 18, padding: 13, marginTop: 18 },
  demoPanelTitle: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.4 },
  demoOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 10 },
  demoOption: { borderWidth: 1, borderColor: colors.line, borderRadius: 13, backgroundColor: colors.card, paddingHorizontal: 11, paddingVertical: 9 },
  demoOptionText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  demoLoadingNote: { color: colors.muted, fontSize: 10, lineHeight: 15, marginTop: 10 },
});
