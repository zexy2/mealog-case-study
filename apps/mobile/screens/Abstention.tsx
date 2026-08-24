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
    const finalName = (overrideFoodText.trim() || dishName);
    if (onSaveUncaloriedNote) {
      onSaveUncaloriedNote(meal, finalName);
    }
  }

  function handleSaveManual() {
    const clean = manualCalorieText.replace(/[^0-9]/g, "");
    const kcal = parseInt(clean, 10);
    const finalName = (overrideFoodText.trim() || dishName);
    if (kcal > 0 && kcal <= 5000) {
      if (onSaveManualCalories) {
        onSaveManualCalories(meal, finalName, kcal);
      }
    } else {
      Alert.alert(t("invalidCaloriesTitle"), t("invalidCaloriesCopy"));
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Header
        eyebrow={isEmptyPlate ? t("emptyPlateEyebrow") : t("abstainOutOfCatalogueEyebrow")}
        title={isEmptyPlate ? t("emptyPlateTitle") : t("abstainOutOfCatalogueTitle")}
        subtitle={isEmptyPlate ? t("emptyPlateSubtitle") : t("abstainOutOfCatalogueSubtitle")}
      />

      {imageUri ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
          <View style={styles.imageBadge}>
            <Ionicons name="image-outline" size={13} color={colors.white} />
            <Text style={styles.imageBadgeText}>{t("uploadedPhotoBadge")}</Text>
          </View>
          <View style={styles.privacyBadge}>
            <Ionicons name="shield-checkmark" size={12} color={colors.moss} />
            <Text style={styles.privacyBadgeText}>{t("privacyBadgeSafe")}</Text>
          </View>
        </View>
      ) : null}

      {/* Honest Architecture & Data Integrity Card (Shown only when food was detected but is out-of-catalogue) */}
      {!isEmptyPlate ? (
        <View style={styles.guaranteeCard}>
          <View style={styles.guaranteeHeaderRow}>
            <Ionicons name="shield-checkmark-outline" size={18} color={colors.moss} />
            <Text style={styles.guaranteeHeader}>Denetlenmiş Besin Güvencesi (D1)</Text>
          </View>
          <Text style={styles.guaranteeCopy}>{t("abstainHonestGuarantee")}</Text>
        </View>
      ) : null}

      {/* Action Suite */}
      <View style={styles.actionsContainer}>
        {/* 1. Primary: If Empty Plate, provide Manual Override; if out-of-catalogue food, provide Suggest Dish */}
        {isEmptyPlate ? (
          <View style={styles.overrideCard}>
            {!showOverrideInput ? (
              <Pressable
                style={styles.primaryButton}
                onPress={() => setShowOverrideInput(true)}
                accessibilityRole="button"
                accessibilityLabel={t("emptyPlateOverrideButton")}
              >
                <Ionicons name="pencil-outline" size={18} color={colors.white} />
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
                    style={styles.overrideSubmitButton}
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
            style={[styles.primaryButton, suggested && styles.primaryButtonSuccess]}
            onPress={handleSuggest}
            accessibilityRole="button"
            accessibilityLabel={t("suggestDishButton")}
          >
            <Ionicons name={suggested ? "checkmark-circle" : "bulb-outline"} size={18} color={colors.white} />
            <Text style={styles.primaryButtonText}>
              {suggested ? t("suggestDishSuccess") : t("suggestDishButton")}
            </Text>
          </Pressable>
        )}

        {/* 2. Secondary: Search Different Dish in Catalogue */}
        <Pressable
          style={styles.secondaryButton}
          onPress={onDescribe}
          accessibilityRole="button"
          accessibilityLabel={t("searchCatalogueButton")}
        >
          <Ionicons name="search-outline" size={18} color={colors.ink} />
          <Text style={styles.secondaryButtonText}>{t("searchCatalogueButton")}</Text>
        </Pressable>

        {/* 3. Option: Save as Uncaloried Meal Note */}
        <Pressable
          style={styles.noteButton}
          onPress={handleSaveNote}
          accessibilityRole="button"
          accessibilityLabel={t("saveAsUncaloriedNoteButton")}
        >
          <Ionicons name="document-text-outline" size={17} color={colors.terracotta} />
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
              <Ionicons name="calculator-outline" size={17} color={colors.muted} />
              <Text style={styles.manualToggleText}>{t("saveManualCaloriesButton")}</Text>
              <Ionicons name="chevron-down" size={15} color={colors.muted} />
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
                  style={styles.manualSaveButton}
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
            style={styles.retakeButton}
            onPress={onRetake}
            accessibilityRole="button"
            accessibilityLabel={t("retakePhoto")}
          >
            <Ionicons name="camera-outline" size={17} color={colors.muted} />
            <Text style={styles.retakeButtonText}>{t("retakePhoto")}</Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 22, paddingBottom: 34 },
  imageContainer: {
    width: "100%",
    height: 220,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: "#1C211E",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  imageBadge: {
    position: "absolute",
    bottom: 10,
    left: 10,
    backgroundColor: "rgba(31, 36, 33, 0.82)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  imageBadgeText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: "700",
  },
  privacyBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#D3E3D7",
  },
  privacyBadgeText: {
    color: colors.moss,
    fontSize: 11,
    fontWeight: "800",
  },
  guaranteeCard: {
    backgroundColor: "#F4F8F5",
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: "#D3E8D7",
  },
  guaranteeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
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
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.terracotta,
  },
  overrideInputLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 8,
  },
  overrideInputRow: {
    flexDirection: "row",
    gap: 8,
  },
  overrideTextInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "700",
    color: colors.ink,
  },
  overrideSubmitButton: {
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
  },
  overrideSubmitText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: "800",
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: colors.terracotta,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 18,
  },
  primaryButtonSuccess: {
    backgroundColor: colors.moss,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 9,
    paddingHorizontal: 18,
    borderWidth: 1,
    borderColor: colors.line,
  },
  secondaryButtonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  noteButton: {
    minHeight: 48,
    borderRadius: 15,
    backgroundColor: "#FDF5F2",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#F7D8CE",
  },
  noteButtonText: {
    color: colors.terracotta,
    fontSize: 13,
    fontWeight: "700",
  },
  manualCard: {
    borderRadius: 15,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 12,
  },
  manualToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  manualToggleText: {
    flex: 1,
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 8,
  },
  manualInputBox: {
    paddingTop: 4,
  },
  manualInputLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 8,
  },
  manualInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  manualTextInput: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.terracotta,
    backgroundColor: colors.paper,
    paddingHorizontal: 12,
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
    height: 42,
    paddingHorizontal: 16,
    borderRadius: 10,
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
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
    paddingVertical: 14,
  },
  retakeButtonText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
});
