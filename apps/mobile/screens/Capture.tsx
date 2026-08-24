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
  auto_accept: "demoAutoAccept",
  review: "demoReview",
  abstain: "demoAbstain",
  degraded: "demoDegraded",
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
  const canSubmitText = text.trim().length > 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
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
            <Pressable
              style={({ pressed }) => [styles.smallOutlineButton, pressed && styles.buttonPressed]}
              onPress={requestPermission}
              accessibilityRole="button"
              accessibilityLabel={t("allowCamera")}
            >
              <Text style={styles.smallOutlineButtonText}>{t("allowCamera")}</Text>
            </Pressable>
          </View>
        )}
        {permissionGranted ? (
          <>
            {/* Scrims keep the overlay chrome legible on a bright plate without a gradient dependency. */}
            <View style={[styles.scrim, styles.scrimTop]} pointerEvents="none" />
            <View style={[styles.scrim, styles.scrimBottom]} pointerEvents="none" />
          </>
        ) : null}
        <View style={styles.cameraTopRow}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>{t("liveCamera")}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.cameraLibraryButton, pressed && styles.buttonPressed]}
            onPress={onChoosePhoto}
            accessibilityRole="button"
            accessibilityLabel={t("choosePhoto")}
          >
            <Ionicons name="images-outline" size={20} color={colors.ink} />
          </Pressable>
        </View>
        {permissionGranted ? (
          <>
            <View style={styles.frameGuide} pointerEvents="none">
              <View style={[styles.frameCorner, styles.frameCornerTopLeft]} />
              <View style={[styles.frameCorner, styles.frameCornerTopRight]} />
              <View style={[styles.frameCorner, styles.frameCornerBottomLeft]} />
              <View style={[styles.frameCorner, styles.frameCornerBottomRight]} />
            </View>
            <View style={styles.shutterBar}>
              <View style={styles.frameHintWrap} pointerEvents="none">
                <Text style={styles.frameHint}>{t("frameHint")}</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.shutter, pressed && styles.shutterPressed]}
                onPress={onCapture}
                accessibilityRole="button"
                accessibilityLabel={t("takePlatePhoto")}
              >
                <View style={styles.shutterInner} />
              </Pressable>
            </View>
          </>
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
          placeholderTextColor={colors.mutedStrong}
          style={styles.textInput}
          returnKeyType="send"
          onSubmitEditing={onSubmitText}
          accessibilityLabel={t("mealPlaceholder")}
        />
        <Pressable
          style={({ pressed }) => [
            styles.textSubmit,
            !canSubmitText && styles.textSubmitDisabled,
            pressed && canSubmitText && styles.buttonPressed,
          ]}
          onPress={onSubmitText}
          disabled={!canSubmitText}
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSubmitText }}
          accessibilityLabel={t("sendMealDescription")}
        >
          <Ionicons name="arrow-up" size={20} color={canSubmitText ? colors.white : colors.mutedStrong} />
        </Pressable>
      </View>
      <Text style={styles.demoHint}>{isDemoMode ? t("demoHint") : t("liveContractHint")}</Text>

      {isDemoMode ? (
        <View style={styles.demoPanel}>
          <Text style={styles.demoPanelTitle}>{t("demoPanelTitle")}</Text>
          <View style={styles.demoOptions}>
            {DEMO_SCENARIOS.map((scenario) => (
              <Pressable
                key={scenario}
                style={({ pressed }) => [styles.demoOption, pressed && styles.buttonPressed]}
                onPress={() => onDemoScenario(scenario)}
                accessibilityRole="button"
                accessibilityLabel={t(DEMO_LABELS[scenario])}
              >
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
          <Pressable
            onPress={onRetry}
            style={({ pressed }) => [styles.resumeButton, pressed && styles.buttonPressed]}
            accessibilityRole="button"
            accessibilityLabel={t("resume")}
          >
            <Text style={styles.resumeText}>{t("resume")}</Text>
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  // 20pt gutter matches Header's own horizontal rhythm; extra bottom padding clears BottomNav.
  content: { paddingHorizontal: 20, paddingTop: 4, paddingBottom: 28 },
  cameraFrame: {
    // A 3:4 viewfinder matches the sensor ratio, so the preview is not cropped on tall devices.
    aspectRatio: 3 / 4,
    borderRadius: 26,
    overflow: "hidden",
    backgroundColor: "#D9D4C9",
    borderWidth: 1,
    borderColor: colors.line,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  cameraFallback: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28 },
  cameraIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", marginBottom: 16 },
  fallbackTitle: { color: colors.ink, fontSize: 17, lineHeight: 22, fontWeight: "800", textAlign: "center" },
  fallbackCopy: { color: colors.mutedStrong, fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 8, maxWidth: 240 },
  smallOutlineButton: { minHeight: 44, justifyContent: "center", borderWidth: 1.5, borderColor: colors.terracotta, borderRadius: 22, paddingHorizontal: 20, marginTop: 20 },
  smallOutlineButtonText: { color: colors.terracotta, fontSize: 13, fontWeight: "800", letterSpacing: 0.2 },
  buttonPressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  scrim: { position: "absolute", left: 0, right: 0 },
  scrimTop: { top: 0, height: 96, backgroundColor: colors.scrimFade },
  scrimBottom: { bottom: 0, height: 148, backgroundColor: colors.scrimFade },
  cameraTopRow: { position: "absolute", top: 14, left: 14, right: 14, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 7, minHeight: 32, backgroundColor: colors.scrimStrong, paddingHorizontal: 12, borderRadius: 16 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#E77B58" },
  liveText: { color: colors.white, fontSize: 10, fontWeight: "800", letterSpacing: 1.1 },
  cameraLibraryButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,253,248,0.92)", alignItems: "center", justifyContent: "center" },
  // Hint and shutter share one bottom stack so the hint never lands on top of the frame guide.
  shutterBar: { position: "absolute", left: 0, right: 0, bottom: 18, alignItems: "center", gap: 14 },
  shutter: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: colors.white, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,253,248,0.28)" },
  shutterPressed: { transform: [{ scale: 0.94 }] },
  shutterInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.terracotta },
  // Bottom inset leaves room for the shutter stack above.
  frameGuide: { position: "absolute", top: 72, left: 32, right: 32, bottom: 132 },
  frameCorner: { position: "absolute", width: 26, height: 26, borderColor: "rgba(255,253,248,0.9)", borderWidth: 0 },
  frameCornerTopLeft: { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 12 },
  frameCornerTopRight: { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 12 },
  frameCornerBottomLeft: { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 12 },
  frameCornerBottomRight: { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 12 },
  frameHintWrap: { backgroundColor: colors.scrimSoft, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 14 },
  frameHint: { color: colors.white, fontSize: 12, lineHeight: 16, fontWeight: "700" },
  orRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 22, marginBottom: 14 },
  orLine: { flex: 1, height: 1, backgroundColor: colors.line },
  orText: { color: colors.mutedStrong, fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  textInputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 6, paddingLeft: 16 },
  textInput: { flex: 1, color: colors.ink, fontSize: 15, lineHeight: 20, minHeight: 44, paddingRight: 10 },
  textSubmit: { width: 44, height: 44, borderRadius: 16, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center" },
  textSubmitDisabled: { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
  demoHint: { color: colors.mutedStrong, fontSize: 12, lineHeight: 17, marginTop: 10, marginLeft: 4 },
  pendingCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mossSoft, borderRadius: 20, padding: 14, marginTop: 18, gap: 12 },
  pendingIcon: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  messageWrap: { flex: 1 },
  messageTitle: { color: colors.ink, fontSize: 13, lineHeight: 18, fontWeight: "800" },
  messageCopy: { color: colors.mutedStrong, fontSize: 12, lineHeight: 17, marginTop: 3 },
  resumeButton: { minHeight: 44, justifyContent: "center", backgroundColor: colors.moss, borderRadius: 14, paddingHorizontal: 16 },
  resumeText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  demoPanel: { backgroundColor: colors.paper, borderRadius: 20, borderWidth: 1, borderColor: colors.line, padding: 14, marginTop: 18 },
  demoPanelTitle: { color: colors.mutedStrong, fontSize: 10, fontWeight: "800", letterSpacing: 1.4 },
  demoOptions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  demoOption: { minHeight: 44, justifyContent: "center", borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.card, paddingHorizontal: 14 },
  demoOptionText: { color: colors.ink, fontSize: 12, fontWeight: "700" },
  demoLoadingNote: { color: colors.mutedStrong, fontSize: 11, lineHeight: 16, marginTop: 12 },
});
