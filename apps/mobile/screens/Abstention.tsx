import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { t } from "../src/strings";
import { Candidate, MealLog } from "../src/types";
import { Header } from "../components/Header";
import { colors } from "../components/theme";

export type AbstentionScreenProps = {
  meal: MealLog;
  imageUri?: string | null;
  onConfirmObserved?: (foodName: string) => void;
  onSelectCandidateDirectly?: (candidate: Candidate, itemIndex: number) => void;
  onDescribe: () => void;
  onRetake: () => void;
  onSaveUncaloriedNote?: (meal: MealLog, dishName: string) => void;
  onSaveManualCalories?: (meal: MealLog, dishName: string, calories: number) => void;
  onSuggestDish?: (dishName: string) => void;
  scrollY?: number;
  testFold?: "top" | "actions";
};

export function AbstentionScreen({
  meal,
  imageUri,
  onConfirmObserved,
  onSelectCandidateDirectly,
  onDescribe,
  onRetake,
  onSaveUncaloriedNote,
  onSaveManualCalories,
  onSuggestDish,
  scrollY = 0,
  testFold,
}: AbstentionScreenProps) {
  const isEmptyPlate = meal.items.length === 0;
  const isDegraded = Boolean(meal.degraded);

  // Provider observations are free text, not Turkish catalogue data. Do not
  // present them as localized food names or carry them into fallback logs.
  const dishName = t("abstainGenericMealName");

  const [suggested, setSuggested] = useState(false);
  const [showOverrideInput, setShowOverrideInput] = useState(false);
  const [overrideFoodText, setOverrideFoodText] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualCalorieText, setManualCalorieText] = useState("");

  function handleSuggest() {
    setSuggested(true);
    if (onSuggestDish) {
      onSuggestDish(dishName);
    } else {
      Alert.alert(
        t("suggestDishPrototypeTitle"),
        t("suggestDishPrototypeCopy", { dish: dishName }),
      );
    }
  }

  function handleSaveNote() {
    const finalName = overrideFoodText.trim() || dishName;
    if (onSaveUncaloriedNote) {
      onSaveUncaloriedNote(meal, finalName);
    }
  }

  function handleSaveManual() {
    const clean = manualCalorieText.replace(/[^0-9]/g, "");
    const kcal = parseInt(clean, 10);
    const finalName = overrideFoodText.trim() || dishName;
    if (kcal > 0 && kcal <= 5000) {
      if (onSaveManualCalories) {
        onSaveManualCalories(meal, finalName, kcal);
      }
    } else {
      Alert.alert(t("invalidCaloriesTitle"), t("invalidCaloriesCopy"));
    }
  }

  const scrollRef = React.useRef<ScrollView>(null);
  React.useEffect(() => {
    if (scrollY && scrollY > 0) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: scrollY, animated: false });
      }, 150);
    }
  }, [scrollY]);

  return (
    <ScrollView ref={scrollRef} style={styles.screen} contentContainerStyle={styles.content}>
      <Header
        eyebrow={isEmptyPlate ? t("emptyPlateEyebrow") : t("abstainOutOfCatalogueEyebrow")}
        title={isEmptyPlate ? t("emptyPlateTitle") : t("abstainOutOfCatalogueTitle")}
        subtitle={isEmptyPlate ? t("emptyPlateSubtitle") : t("abstainOutOfCatalogueSubtitle")}
      />

      {imageUri ? (
        <View style={styles.imageCard}>
          <Image source={{ uri: imageUri }} style={styles.previewBackdrop} resizeMode="cover" blurRadius={18} />
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
          
          <View style={styles.imageBadge}>
            <Ionicons name="image-outline" size={13} color={colors.white} />
            <Text style={styles.imageBadgeText}>{t("uploadedPhotoBadge")}</Text>
          </View>
          
          <View style={styles.privacyBadge}>
            <Ionicons name="shield-checkmark" size={13} color={colors.moss} />
            <Text style={styles.privacyBadgeText}>{t("privacyBadgeSafe")}</Text>
          </View>
        </View>
      ) : null}

      {/* Honest Architecture & Data Integrity Card */}
      {!isEmptyPlate ? (
        <View style={styles.guaranteeCard}>
          <View style={styles.guaranteeHeaderRow}>
            <View style={styles.guaranteeIconPill}>
              <Ionicons name="shield-checkmark" size={15} color={colors.moss} />
            </View>
            <Text style={styles.guaranteeHeader}>Denetlenmiş Besin Güvencesi (D1)</Text>
          </View>
          <Text style={styles.guaranteeCopy}>{t("abstainHonestGuarantee")}</Text>
        </View>
      ) : null}

      {/* Action Suite */}
      <View style={styles.actionsContainer}>
        {/* 1. Primary Hero Action */}
        {isEmptyPlate ? (
          <View style={styles.overrideCard}>
            {!showOverrideInput ? (
              <Pressable
                style={({ pressed }) => [
                  styles.primaryButton,
                  pressed && styles.buttonPressed,
                ]}
                onPress={() => setShowOverrideInput(true)}
                accessibilityRole="button"
                accessibilityLabel={t("emptyPlateOverrideButton")}
              >
                <Ionicons name="pencil-sharp" size={19} color={colors.white} />
                <Text style={styles.primaryButtonText}>{t("emptyPlateOverrideButton")}</Text>
              </Pressable>
            ) : (
              <View style={styles.overrideInputBox}>
                <Text style={styles.overrideInputLabel}>{t("emptyPlateOverridePrompt")}</Text>
                <View style={styles.overrideInputRow}>
                  <TextInput
                    style={styles.overrideTextInput}
                    value={overrideFoodText}
                    placeholder={t("emptyPlateOverridePlaceholder")}
                    placeholderTextColor={colors.muted}
                    onChangeText={setOverrideFoodText}
                    autoFocus
                  />
                  <Pressable
                    style={({ pressed }) => [
                      styles.overrideSubmitButton,
                      pressed && styles.buttonPressed,
                    ]}
                    onPress={() => {
                      const trimmed = overrideFoodText.trim();
                      if (trimmed) {
                        if (onConfirmObserved) {
                          onConfirmObserved(trimmed);
                        }
                      } else {
                        Alert.alert("Yemek Adı Gerekli", "Lütfen aramak istediğiniz yemeği yazın.");
                      }
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t("emptyPlateOverrideSubmit")}
                  >
                    <Text style={styles.overrideSubmitText}>{t("emptyPlateOverrideSubmit")}</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              suggested && styles.primaryButtonSuccess,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleSuggest}
            accessibilityRole="button"
            accessibilityLabel={t("suggestDishButton")}
          >
            <Ionicons name={suggested ? "checkmark-circle" : "bulb"} size={20} color={colors.white} />
            <Text style={styles.primaryButtonText}>
              {suggested ? t("suggestDishSuccess") : t("suggestDishButton")}
            </Text>
          </Pressable>
        )}

        {/* 2. Secondary: Search Catalogue */}
        <Pressable
          style={({ pressed }) => [
            styles.secondaryButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={onDescribe}
          accessibilityRole="button"
          accessibilityLabel={t("searchCatalogueButton")}
        >
          <Ionicons name="search-outline" size={19} color={colors.ink} />
          <Text style={styles.secondaryButtonText}>{t("searchCatalogueButton")}</Text>
        </Pressable>

        {/* Save-anywhere Section */}
        <View style={styles.sectionDividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.groupLabel}>{t("saveAnywayLabel")}</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* 3. Option: Uncaloried Note */}
        <Pressable
          style={({ pressed }) => [
            styles.noteButton,
            pressed && styles.buttonPressed,
          ]}
          onPress={handleSaveNote}
          accessibilityRole="button"
          accessibilityLabel={t("saveAsUncaloriedNoteButton")}
        >
          <View style={styles.noteIconCircle}>
            <Ionicons name="document-text-outline" size={18} color={colors.terracotta} />
          </View>
          <Text style={styles.noteButtonText}>{t("saveAsUncaloriedNoteButton")}</Text>
        </Pressable>

        {/* 4. Option: Enter Calories Manually */}
        <View style={styles.manualCard}>
          {!showManualInput ? (
            <Pressable
              style={styles.manualToggleRow}
              onPress={() => setShowManualInput(true)}
              accessibilityRole="button"
              accessibilityLabel={t("saveManualCaloriesButton")}
            >
              <View style={styles.manualIconCircle}>
                <Ionicons name="calculator-outline" size={17} color={colors.ink} />
              </View>
              <Text style={styles.manualToggleText}>{t("saveManualCaloriesButton")}</Text>
              <Ionicons name="chevron-down" size={16} color={colors.muted} />
            </Pressable>
          ) : (
            <View style={styles.manualInputBox}>
              <Text style={styles.manualInputLabel}>{t("manualCaloriesPrompt")}</Text>
              <View style={styles.manualInputRow}>
                <TextInput
                  style={styles.manualTextInput}
                  keyboardType="number-pad"
                  value={manualCalorieText}
                  placeholder={t("manualCaloriesPlaceholder")}
                  placeholderTextColor={colors.muted}
                  maxLength={4}
                  onChangeText={setManualCalorieText}
                />
                <Text style={styles.manualUnitText}>kcal</Text>
                <Pressable
                  style={({ pressed }) => [
                    styles.manualSaveButton,
                    pressed && styles.buttonPressed,
                  ]}
                  onPress={handleSaveManual}
                  accessibilityRole="button"
                  accessibilityLabel={t("manualSaveButton")}
                >
                  <Text style={styles.manualSaveButtonText}>{t("manualSaveButton")}</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* 5. Retake Photo: ONLY shown when photo was blurry, degraded, or empty */}
        {isEmptyPlate || isDegraded ? (
          <Pressable
            style={({ pressed }) => [
              styles.retakeButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={onRetake}
            accessibilityRole="button"
            accessibilityLabel={t("retakePhoto")}
          >
            <Ionicons name="camera-outline" size={17} color={colors.ink} />
            <Text style={styles.retakeButtonText}>{t("retakePhoto")}</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 36,
  },
  imageCard: {
    width: "100%",
    height: 220,
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    backgroundColor: "#181D1A",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  previewBackdrop: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.5,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  imageBadge: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(24, 29, 26, 0.82)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.15)",
  },
  imageBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  privacyBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#CCE3D3",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  privacyBadgeText: {
    color: colors.moss,
    fontSize: 11,
    fontWeight: "800",
  },
  guaranteeCard: {
    backgroundColor: "#F2F7F4",
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#CCE4D2",
  },
  guaranteeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  guaranteeIconPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#E2F0E6",
    alignItems: "center",
    justifyContent: "center",
  },
  guaranteeHeader: {
    color: colors.moss,
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  guaranteeCopy: {
    color: colors.ink,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
  },
  actionsContainer: {
    gap: 12,
  },
  overrideCard: {
    width: "100%",
  },
  overrideInputBox: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: colors.terracotta,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  overrideInputLabel: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },
  overrideInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  overrideTextInput: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: 14,
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  overrideSubmitButton: {
    height: 46,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
  },
  overrideSubmitText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
  primaryButton: {
    minHeight: 54,
    borderRadius: 20,
    backgroundColor: colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    shadowColor: colors.terracotta,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryButtonSuccess: {
    backgroundColor: colors.moss,
    shadowColor: colors.moss,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.2,
  },
  secondaryButton: {
    minHeight: 52,
    borderRadius: 20,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  sectionDividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 6,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.line,
  },
  groupLabel: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  noteButton: {
    minHeight: 52,
    borderRadius: 20,
    backgroundColor: "#FDF5F2",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: "#F7D8CE",
  },
  noteIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FAEAE4",
    alignItems: "center",
    justifyContent: "center",
  },
  noteButtonText: {
    color: colors.terracotta,
    fontSize: 14,
    fontWeight: "700",
  },
  manualCard: {
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  manualToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  manualIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  manualToggleText: {
    flex: 1,
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
    marginLeft: 10,
  },
  manualInputBox: {
    paddingTop: 6,
  },
  manualInputLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
  },
  manualInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  manualTextInput: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.terracotta,
    backgroundColor: colors.paper,
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: "800",
    color: colors.ink,
  },
  manualUnitText: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: "700",
  },
  manualSaveButton: {
    height: 44,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
  },
  manualSaveButtonText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: "800",
  },
  retakeButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingVertical: 12,
    marginTop: 4,
    alignSelf: "center",
    paddingHorizontal: 22,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
  },
  retakeButtonText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  buttonPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.985 }],
  },
});
