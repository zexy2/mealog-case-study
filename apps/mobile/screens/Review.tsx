import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Candidate, CaptureMedium, ItemClarification, MealLog } from "../src/types";
import { formatLocalizedProvenance, formatLocalizedUnit, StringKey, t } from "../src/strings";
import { AuditRow } from "../components/AuditRow";
import { Header } from "../components/Header";
import { actionLabel, actionTone } from "../components/meal";
import { colors } from "../components/theme";

type PortionSliderProps = {
  minimumValue: number;
  maximumValue: number;
  value: number;
  minimumTrackTintColor: string;
  maximumTrackTintColor: string;
  thumbTintColor: string;
  onValueChange: (value: number) => void;
  accessibilityLabel: string;
};

const PortionSlider = Slider as unknown as React.ComponentType<PortionSliderProps>;

function quantityLabel(item: MealLog["items"][number], quantity = item.quantity, unit = item.unit) {
  if (quantity === null || quantity === undefined) {
    return t("quantityUnknown");
  }
  const localizedUnit = formatLocalizedUnit(unit);
  return t("quantityValue", { quantity: String(quantity), unit: localizedUnit ? ` ${localizedUnit}` : "" });
}

function selectedName(item: MealLog["items"][number], selected: string) {
  return item.candidates.find((candidate) => candidate.food_id === selected)?.name ?? selected;
}

function captureMediumCopy(medium: CaptureMedium): StringKey {
  if (medium === "screen") return "captureMediumScreen";
  if (medium === "printed") return "captureMediumPrinted";
  if (medium === "toy_or_model") return "captureMediumToy";
  return "captureMediumUnclear";
}

function clarificationPrompt(
  item: MealLog["items"][number],
  clarification: ItemClarification,
  selected: string,
) {
  if (clarification.kind === "count") {
    return t("clarifyCount", { unit: formatLocalizedUnit(clarification.unit ?? item.unit ?? ""), food: selectedName(item, selected) });
  }
  if (clarification.kind === "identity") {
    return t("clarifyIdentity", { food: selectedName(item, selected) });
  }
  return t("portionQuestionTitle");
}

export type ReviewScreenProps = {
  meal: MealLog;
  imageUri?: string | null;
  expandedItem: number | null;
  setExpandedItem: (value: number | null) => void;
  portionEdits: Record<number, number>;
  setPortionEdits: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  quantityEdits: Record<number, number | null>;
  setQuantityEdits: React.Dispatch<React.SetStateAction<Record<number, number | null>>>;
  selectedCandidates: Record<number, string>;
  onChooseCandidate: (index: number, candidate: Candidate) => void;
  onSave: () => void;
  isSaved?: boolean;
  saving?: boolean;
  onBack: () => void;
};

export function ReviewScreen({
  meal,
  imageUri,
  expandedItem,
  setExpandedItem,
  portionEdits,
  setPortionEdits,
  quantityEdits,
  setQuantityEdits,
  selectedCandidates,
  onChooseCandidate,
  onSave,
  isSaved = false,
  saving = false,
  onBack,
}: ReviewScreenProps) {
  const displayAction = meal.degraded ? "review" : meal.action;
  const tone = actionTone(displayAction);
  const flaggedMedium = meal.items.find((item) => (item.capture_medium ?? "real_plate") !== "real_plate")?.capture_medium ?? null;

  const [portionConfirmed, setPortionConfirmed] = useState<Record<number, boolean>>({});

  const hasUnansweredCountClarification = meal.items.some((item, index) => {
    const clarification = item.clarification ?? null;
    const hasQuantityEdit = Object.prototype.hasOwnProperty.call(quantityEdits, index);
    return clarification?.kind === "count" && !hasQuantityEdit && item.quantity === null;
  });

  const needsPortionConfirmation = meal.action === "review" && meal.items.some((item, index) => {
    const clarification = item.clarification ?? null;
    if (clarification?.kind === "count") return false;
    const hasRange = item.grams_p90 > item.grams_p10;
    const hasPortionEdit = Object.prototype.hasOwnProperty.call(portionEdits, index);
    return hasRange && !hasPortionEdit && !portionConfirmed[index];
  });

  const isSaveDisabled = Boolean(saving || hasUnansweredCountClarification || needsPortionConfirmation);

  function handleSave() {
    if (hasUnansweredCountClarification) {
      Alert.alert(t("oneQuestion"), t("clarifyCountRequired"));
      return;
    }
    if (needsPortionConfirmation) {
      Alert.alert(t("portion"), t("confirmPortionRequired"));
      return;
    }
    onSave();
  }

  function confirmPortionChoice(index: number, grams: number) {
    setPortionEdits((current) => ({ ...current, [index]: grams }));
    setPortionConfirmed((current) => ({ ...current, [index]: true }));
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Header eyebrow={t("reviewEyebrow")} title={isSaved ? t("savedReviewTitle") : t("reviewTitle")} subtitle={isSaved ? t("savedReviewSubtitle") : t("reviewSubtitle")} />

        {imageUri ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="contain" />
            <View style={styles.imageBadge}>
              <Ionicons name="image-outline" size={13} color={colors.white} />
              <Text style={styles.imageBadgeText}>{t("mealPhotoBadge")}</Text>
            </View>
          </View>
        ) : null}

        {meal.degraded ? (
          <View style={styles.degradedBanner}>
            <Ionicons name="warning-outline" size={19} color="#8D641C" />
            <View style={styles.degradedCopy}>
              <Text style={styles.degradedTitle}>{t("degradedTitle")}</Text>
              <Text style={styles.degradedText}>{t("degradedCopy")}</Text>
            </View>
          </View>
        ) : null}
        {flaggedMedium ? (
          <View style={styles.captureMediumBanner}>
            <Ionicons name="image-outline" size={19} color="#8D641C" />
            <View style={styles.degradedCopy}>
              <Text style={styles.degradedTitle}>{t("captureMedium")}</Text>
              <Text style={styles.degradedText}>{t(captureMediumCopy(flaggedMedium))}</Text>
            </View>
          </View>
        ) : null}
        <View style={[styles.actionBanner, { backgroundColor: tone.backgroundColor }]}>
          <View style={[styles.actionMark, { backgroundColor: tone.color }]}>
            <Ionicons name={displayAction === "ask" ? "help" : displayAction === "auto_accept" ? "checkmark" : "eye"} size={17} color={colors.white} />
          </View>
          <View style={styles.actionBannerCopy}>
            <Text style={[styles.actionBannerTitle, { color: tone.color }]}>{actionLabel(displayAction)}</Text>
            <Text style={styles.actionBannerText}>{meal.degraded ? t("degradedCopy") : meal.action === "ask" ? t("questionPick") : t("editableMatch")}</Text>
          </View>
        </View>

        {meal.items.map((item, index) => {
          const selected = selectedCandidates[index] ?? item.food_id;
          const grams = portionEdits[index] ?? item.grams;
          const hasQuantityEdit = Object.prototype.hasOwnProperty.call(quantityEdits, index);
          const quantity = hasQuantityEdit ? quantityEdits[index] : item.quantity;
          const clarification = item.clarification ?? null;
          const quantityUnit = clarification?.kind === "count" ? clarification.unit ?? item.unit : item.unit;
          const hasPortionBand = grams > 0 && item.grams_p90 >= item.grams_p10 && item.grams_p90 > 0;
          const hasRange = item.grams_p90 > item.grams_p10;
          const isPortionDone = Object.prototype.hasOwnProperty.call(portionEdits, index) || Boolean(portionConfirmed[index]);

          return (
            <View key={`${item.query}-${index}`} style={styles.itemCard}>
              <View style={styles.itemTopRow}>
                <View style={styles.itemIndex}><Text style={styles.itemIndexText}>{String(index + 1).padStart(2, "0")}</Text></View>
                <View style={styles.itemNameWrap}>
                  <Text style={styles.itemQuery}>{item.query}</Text>
                  <Text style={styles.itemMatch}>{item.food_id === "ABSTAIN" ? t("needsMatch") : selectedName(item, selected)}</Text>
                  <Text style={styles.quantityText}>{quantityLabel(item, quantity, quantityUnit)}</Text>
                </View>
                <View style={styles.statusBadgesCol}>
                  <View style={[styles.confidencePill, item.confidence >= 0.85 ? styles.confidenceHigh : styles.confidenceMed]}>
                    <Text style={styles.confidenceText}>{item.confidence >= 0.85 ? t("matchConfidenceHigh") : t("matchConfidenceMed")} (%{Math.round(item.confidence * 100)})</Text>
                  </View>
                  {hasRange ? (
                    <View style={[styles.portionStatusPill, isPortionDone ? styles.portionDone : styles.portionPending]}>
                      <Text style={styles.portionStatusText}>{isPortionDone ? t("portionStatusConfirmed") : t("portionStatusVerify")}</Text>
                    </View>
                  ) : null}
                </View>
              </View>

              {item.nutrients && (item.nutrients.kcal > 0 || item.nutrients.protein_g > 0) ? (
                <View style={styles.macroStrip}>
                  <View style={styles.macroPill}>
                    <Text style={styles.macroPillEmoji}>⚡</Text>
                    <Text style={styles.macroPillText}>{Math.round(item.nutrients.kcal)} kcal</Text>
                  </View>
                  <View style={styles.macroPill}>
                    <Text style={styles.macroPillEmoji}>🥩</Text>
                    <Text style={styles.macroPillText}>{Math.round(item.nutrients.protein_g)}g protein</Text>
                  </View>
                  <View style={styles.macroPill}>
                    <Text style={styles.macroPillEmoji}>🌾</Text>
                    <Text style={styles.macroPillText}>{Math.round(item.nutrients.carb_g)}g karb</Text>
                  </View>
                  <View style={styles.macroPill}>
                    <Text style={styles.macroPillEmoji}>🥑</Text>
                    <Text style={styles.macroPillText}>{Math.round(item.nutrients.fat_g)}g yağ</Text>
                  </View>
                </View>
              ) : null}

              {clarification?.kind === "count" ? (
                <View style={styles.questionCard}>
                  <Text style={styles.questionLabel}>{t("oneQuestion")}</Text>
                  <Text style={styles.questionText}>{clarificationPrompt(item, clarification, selected)}</Text>
                  <View style={styles.countChoices}>
                    {clarification.options.map((option) => {
                      const isSelected = quantity === option;
                      return (
                        <Pressable
                          key={option === null ? "unknown" : option}
                          accessibilityRole="button"
                          accessibilityLabel={option === null ? t("clarifyNotSure") : t("countChoice", { count: option, unit: formatLocalizedUnit(clarification.unit ?? "") })}
                          style={[styles.countChoice, isSelected && styles.countChoiceSelected]}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          onPress={() => setQuantityEdits((current) => ({ ...current, [index]: option }))}
                        >
                          <Text style={[styles.countChoiceText, isSelected && styles.countChoiceTextSelected]}>
                            {option === null ? t("clarifyNotSure") : t("countChoice", { count: option, unit: formatLocalizedUnit(clarification.unit ?? "") })}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>

                  <View style={styles.customCountRow}>
                    <Text style={styles.customCountLabel}>Özel adet girin:</Text>
                    <View style={styles.stepperWrap}>
                      <Pressable
                        style={styles.stepperButton}
                        accessibilityRole="button"
                        accessibilityLabel="Adet azalt"
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        onPress={() => {
                          const currentVal = typeof quantity === "number" ? quantity : 1;
                          const nextVal = Math.max(1, currentVal - 1);
                          setQuantityEdits((current) => ({ ...current, [index]: nextVal }));
                        }}
                      >
                        <Ionicons name="remove" size={16} color={colors.ink} />
                      </Pressable>
                      <TextInput
                        style={styles.stepperInput}
                        keyboardType="number-pad"
                        value={typeof quantity === "number" ? String(quantity) : ""}
                        placeholder="Örn. 4"
                        placeholderTextColor={colors.muted}
                        maxLength={2}
                        onChangeText={(txt) => {
                          const clean = txt.replace(/[^0-9]/g, "");
                          const num = parseInt(clean, 10);
                          if (num > 0 && num <= 99) {
                            setQuantityEdits((current) => ({ ...current, [index]: num }));
                          } else if (clean === "") {
                            setQuantityEdits((current) => ({ ...current, [index]: null }));
                          }
                        }}
                      />
                      <Text style={styles.stepperUnit}>{formatLocalizedUnit(clarification.unit ?? "adet")}</Text>
                      <Pressable
                        style={styles.stepperButton}
                        accessibilityRole="button"
                        accessibilityLabel="Adet artır"
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        onPress={() => {
                          const currentVal = typeof quantity === "number" ? quantity : 1;
                          const nextVal = Math.min(99, currentVal + 1);
                          setQuantityEdits((current) => ({ ...current, [index]: nextVal }));
                        }}
                      >
                        <Ionicons name="add" size={16} color={colors.ink} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : null}

              {hasRange && meal.action === "review" && clarification?.kind !== "count" ? (
                <View style={styles.portionQuestionCard}>
                  <Text style={styles.questionLabel}>{t("oneQuestion")}</Text>
                  <Text style={styles.questionText}>{t("portionQuestionTitle")}</Text>
                  <View style={styles.portionQuickChoices}>
                    <Pressable
                      style={[styles.portionQuickChoice, grams === Math.round(item.grams_p10) && styles.portionQuickChoiceSelected]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => confirmPortionChoice(index, Math.round(item.grams_p10))}
                    >
                      <Text style={[styles.portionQuickChoiceText, grams === Math.round(item.grams_p10) && styles.portionQuickChoiceTextSelected]}>
                        {t("portionChoiceLess")} ({Math.round(item.grams_p10)} g)
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.portionQuickChoice, grams === Math.round(item.grams) && styles.portionQuickChoiceSelected]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => confirmPortionChoice(index, Math.round(item.grams))}
                    >
                      <Text style={[styles.portionQuickChoiceText, grams === Math.round(item.grams) && styles.portionQuickChoiceTextSelected]}>
                        {t("portionChoiceClose")} ({Math.round(item.grams)} g)
                      </Text>
                    </Pressable>
                    <Pressable
                      style={[styles.portionQuickChoice, grams === Math.round(item.grams_p90) && styles.portionQuickChoiceSelected]}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => confirmPortionChoice(index, Math.round(item.grams_p90))}
                    >
                      <Text style={[styles.portionQuickChoiceText, grams === Math.round(item.grams_p90) && styles.portionQuickChoiceTextSelected]}>
                        {t("portionChoiceMore")} ({Math.round(item.grams_p90)} g)
                      </Text>
                    </Pressable>
                  </View>

                  <View style={styles.customCountRow}>
                    <Text style={styles.customCountLabel}>Porsiyon / Adet:</Text>
                    <View style={styles.stepperWrap}>
                      <Pressable
                        style={styles.stepperButton}
                        accessibilityRole="button"
                        accessibilityLabel="Porsiyon azalt"
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        onPress={() => {
                          const currentVal = typeof quantity === "number" && quantity > 0 ? quantity : 1;
                          const nextVal = Math.max(1, currentVal - 1);
                          setQuantityEdits((current) => ({ ...current, [index]: nextVal }));
                          setPortionConfirmed((current) => ({ ...current, [index]: true }));
                        }}
                      >
                        <Ionicons name="remove" size={16} color={colors.ink} />
                      </Pressable>
                      <TextInput
                        style={styles.stepperInput}
                        keyboardType="number-pad"
                        value={typeof quantity === "number" && quantity > 0 ? String(quantity) : "1"}
                        placeholder="1"
                        placeholderTextColor={colors.muted}
                        maxLength={2}
                        onChangeText={(txt) => {
                          const clean = txt.replace(/[^0-9]/g, "");
                          const num = parseInt(clean, 10);
                          if (num > 0 && num <= 99) {
                            setQuantityEdits((current) => ({ ...current, [index]: num }));
                            setPortionConfirmed((current) => ({ ...current, [index]: true }));
                          } else if (clean === "") {
                            setQuantityEdits((current) => ({ ...current, [index]: null }));
                          }
                        }}
                      />
                      <Text style={styles.stepperUnit}>{formatLocalizedUnit(quantityUnit ?? "porsiyon")}</Text>
                      <Pressable
                        style={styles.stepperButton}
                        accessibilityRole="button"
                        accessibilityLabel="Porsiyon artır"
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        onPress={() => {
                          const currentVal = typeof quantity === "number" && quantity > 0 ? quantity : 1;
                          const nextVal = Math.min(99, currentVal + 1);
                          setQuantityEdits((current) => ({ ...current, [index]: nextVal }));
                          setPortionConfirmed((current) => ({ ...current, [index]: true }));
                        }}
                      >
                        <Ionicons name="add" size={16} color={colors.ink} />
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : null}

              <View style={styles.portionHeader}>
                <Text style={styles.sectionLabel}>{t("portion")}</Text>
                <Text style={styles.gramsValue}>{hasPortionBand ? t("portionBand", { grams: Math.round(grams), low: Math.round(item.grams_p10), high: Math.round(item.grams_p90) }) : t("notEstimated")}</Text>
              </View>
              {hasRange ? (
                <>
                  <PortionSlider
                    minimumValue={item.grams_p10}
                    maximumValue={item.grams_p90}
                    value={grams}
                    minimumTrackTintColor={colors.terracotta}
                    maximumTrackTintColor={colors.line}
                    thumbTintColor={colors.terracotta}
                    onValueChange={(value) => {
                      setPortionEdits((current) => ({ ...current, [index]: value }));
                      setPortionConfirmed((current) => ({ ...current, [index]: true }));
                    }}
                    accessibilityLabel={t("portionFor", { query: item.query })}
                  />
                  <View style={styles.rangeLabels}>
                    <Text style={styles.rangeText}>{t("portionLow", { grams: Math.round(item.grams_p10) })}</Text>
                    <Text style={styles.rangeText}>{t("portionHigh", { grams: Math.round(item.grams_p90) })}</Text>
                  </View>
                </>
              ) : <Text style={styles.mutedNote}>{t("portionPending")}</Text>}

              {item.candidates.length > 1 ? (
                <>
                  <Text style={[styles.sectionLabel, { marginTop: 22 }]}>{t("alternates")}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
                    {item.candidates.map((candidate) => {
                      const isSelected = selected === candidate.food_id;
                      return (
                        <Pressable key={candidate.food_id} onPress={() => onChooseCandidate(index, candidate)} style={[styles.chip, isSelected && styles.chipSelected]}>
                          <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{candidate.name}</Text>
                          <Text style={[styles.chipScore, isSelected && styles.chipTextSelected]}>{Math.round(candidate.score * 100)}%</Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>
                </>
              ) : null}

              <Pressable style={styles.whyRow} onPress={() => setExpandedItem(expandedItem === index ? null : index)}>
                <View style={styles.whyIcon}><Ionicons name="finger-print-outline" size={17} color={colors.moss} /></View>
                <View style={styles.whyCopy}><Text style={styles.whyTitle}>{t("whyResult")}</Text><Text style={styles.whySubtitle}>{t("traceDecision")}</Text></View>
                <Ionicons name={expandedItem === index ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
              </Pressable>
              {expandedItem === index ? (
                <View style={styles.auditBox}>
                  <AuditRow
                    label={t("matchedFoodId")}
                    value={selectedName(item, selected)}
                    badge={selected !== "ABSTAIN" ? selected : undefined}
                  />
                  <AuditRow
                    label={t("sourceDatabase")}
                    value={item.source_database === "TURKOMP" ? "TÜRKOMP (Ulusal Veri Tabanı)" : item.source_database ?? t("catalogueProvenance")}
                  />
                  <AuditRow label={t("confidence")} value={`%${Math.round(item.confidence * 100)}`} />
                  {item.capture_medium && item.capture_medium !== "real_plate" ? (
                    <AuditRow label={t("captureMedium")} value={item.capture_medium} />
                  ) : null}

                  <AuditRow label={t("quantity")} value={quantityLabel(item, quantity, quantityUnit)} />
                  <AuditRow label={t("exactGrams")} value={grams ? `${Math.round(grams)} g` : t("pending")} />
                  <AuditRow
                    label={t("portionSource")}
                    value={formatLocalizedProvenance(item.portion_source)}
                  />
                  <AuditRow
                    label={t("portionProvenance")}
                    value={item.portion_provenance?.includes("default_serving") ? `Katalog tanımı (${Math.round(grams)} g)` : item.portion_provenance ?? t("pending")}
                  />
                  <AuditRow
                    label={t("macrosTitle")}
                    value={`${Math.round(item.nutrients.kcal)} kcal · ${Math.round(item.nutrients.protein_g)}g protein · ${Math.round(item.nutrients.carb_g)}g karb · ${Math.round(item.nutrients.fat_g)}g yağ`}
                  />
                </View>
              ) : null}

            </View>
          );
        })}

        <Pressable style={styles.textButton} onPress={onBack}><Text style={styles.textButtonLabel}>{t("captureAnother")}</Text></Pressable>
      </ScrollView>

      <View style={styles.stickyFooter}>
        <Pressable
          style={[styles.primaryButton, isSaveDisabled && styles.primaryButtonDisabled]}
          onPress={handleSave}
          disabled={isSaveDisabled}
          accessibilityRole="button"
          accessibilityState={{ disabled: isSaveDisabled }}
        >
          <Text style={styles.primaryButtonText}>
            {saving
              ? t("saving")
              : hasUnansweredCountClarification
              ? t("clarifyCountRequired")
              : needsPortionConfirmation
              ? t("confirmPortionRequired")
              : isSaved
              ? t("saveCorrection")
              : meal.action === "ask"
              ? t("saveQuestion")
              : t("saveToday")}
          </Text>
          <Ionicons name="arrow-forward" size={19} color={colors.white} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scroll: { flex: 1 },
  content: { padding: 22, paddingBottom: 24 },
  stickyFooter: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 28,
    backgroundColor: colors.paper,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 8,
  },
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
  degradedBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#FBF1D8", borderRadius: 17, padding: 13, marginBottom: 14 },
  captureMediumBanner: { flexDirection: "row", alignItems: "flex-start", gap: 10, backgroundColor: "#FBF1D8", borderRadius: 17, padding: 13, marginBottom: 14 },


  degradedCopy: { flex: 1 },
  degradedTitle: { color: "#8D641C", fontSize: 12, fontWeight: "800" },
  degradedText: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 3 },
  actionBanner: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 20, padding: 15, marginBottom: 17 },
  actionMark: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  actionBannerCopy: { flex: 1 },
  actionBannerTitle: { fontSize: 13, fontWeight: "800" },
  actionBannerText: { color: colors.muted, fontSize: 12, lineHeight: 17, marginTop: 3 },
  itemCard: { backgroundColor: colors.card, borderRadius: 24, borderWidth: 1, borderColor: colors.line, padding: 17, marginBottom: 16 },
  itemTopRow: { flexDirection: "row", alignItems: "center" },
  itemIndex: { width: 35, height: 35, borderRadius: 13, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center" },
  itemIndexText: { color: colors.muted, fontSize: 11, fontWeight: "800" },
  itemNameWrap: { flex: 1, marginLeft: 11 },
  itemQuery: { color: colors.muted, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 },
  itemMatch: { color: colors.ink, fontSize: 16, fontWeight: "800", marginTop: 3 },
  quantityText: { color: colors.muted, fontSize: 11, marginTop: 5 },
  statusBadgesCol: { alignItems: "flex-end", gap: 5 },
  macroStrip: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.line },
  macroPill: { flexDirection: "row", alignItems: "center", backgroundColor: colors.paper, borderRadius: 9, paddingHorizontal: 7, paddingVertical: 4, gap: 4 },
  macroPillEmoji: { fontSize: 10 },
  macroPillText: { fontSize: 11, fontWeight: "700", color: colors.ink },
  confidencePill: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 5 },
  confidenceHigh: { backgroundColor: colors.mossSoft },
  confidenceMed: { backgroundColor: "#FBF1D8" },
  confidenceText: { color: colors.moss, fontSize: 10, fontWeight: "800" },
  portionStatusPill: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 4 },
  portionDone: { backgroundColor: colors.mossSoft },
  portionPending: { backgroundColor: "#FBF1D8" },
  portionStatusText: { fontSize: 10, fontWeight: "700", color: colors.ink },
  questionCard: { backgroundColor: "#FBF1D8", borderRadius: 15, padding: 13, marginTop: 17 },
  portionQuestionCard: { backgroundColor: "#F4F7F4", borderRadius: 15, padding: 13, marginTop: 15, borderWidth: 1, borderColor: colors.line },
  portionQuickChoices: { flexDirection: "row", gap: 8, marginTop: 10 },
  portionQuickChoice: { flex: 1, minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: colors.card, paddingHorizontal: 6 },
  portionQuickChoiceSelected: { backgroundColor: colors.moss, borderColor: colors.moss },
  portionQuickChoiceText: { color: colors.ink, fontSize: 11, fontWeight: "700", textAlign: "center" },
  portionQuickChoiceTextSelected: { color: colors.white },
  questionLabel: { color: "#8D641C", fontSize: 9, fontWeight: "800", letterSpacing: 1.3 },
  questionText: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: "700", marginTop: 5 },
  countChoices: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  countChoice: { minHeight: 44, borderWidth: 1, borderColor: "#D9C58E", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: colors.card, justifyContent: "center" },
  countChoiceSelected: { backgroundColor: colors.terracotta, borderColor: colors.terracotta },
  countChoiceText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  countChoiceTextSelected: { color: colors.white },
  customCountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(217, 197, 142, 0.4)",
  },
  customCountLabel: {
    color: colors.ink,
    fontSize: 12,
    fontWeight: "700",
  },
  stepperWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D9C58E",
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.paper,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperInput: {
    minWidth: 44,
    height: 32,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "800",
    color: colors.ink,
    paddingHorizontal: 4,
  },
  stepperUnit: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.muted,
    marginRight: 6,
  },
  portionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 22 },
  sectionLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.4 },
  gramsValue: { color: colors.terracotta, fontSize: 18, fontWeight: "800" },
  rangeLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: -2 },
  rangeText: { color: colors.muted, fontSize: 10 },
  mutedNote: { color: colors.muted, fontSize: 12, marginTop: 13 },
  clarificationHint: { color: colors.muted, fontSize: 11, lineHeight: 16, marginTop: 9 },
  chipsRow: { gap: 8, paddingTop: 11, paddingBottom: 2 },
  chip: { minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 8, minWidth: 100, justifyContent: "center" },
  chipSelected: { backgroundColor: colors.terracotta, borderColor: colors.terracotta },
  chipText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  chipTextSelected: { color: colors.white },
  chipScore: { color: colors.muted, fontSize: 10, marginTop: 3 },
  whyRow: { minHeight: 44, flexDirection: "row", alignItems: "center", marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: colors.line },
  whyIcon: { width: 32, height: 32, borderRadius: 12, backgroundColor: colors.mossSoft, alignItems: "center", justifyContent: "center" },
  whyCopy: { flex: 1, marginLeft: 10 },
  whyTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  whySubtitle: { color: colors.muted, fontSize: 11, marginTop: 2 },
  auditBox: { backgroundColor: colors.paper, borderRadius: 15, padding: 12, marginTop: 12, gap: 9 },
  primaryButton: { minHeight: 54, borderRadius: 18, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, paddingHorizontal: 18, marginTop: 8 },
  primaryButtonDisabled: { opacity: 0.55 },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  textButton: { minHeight: 44, alignItems: "center", justifyContent: "center", paddingVertical: 12 },
  textButtonLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
});
