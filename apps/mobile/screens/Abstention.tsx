import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { t } from "../src/strings";
import { Candidate, MealLog } from "../src/types";
import { Header } from "../components/Header";
import { colors } from "../components/theme";

export type AbstentionScreenProps = {
  meal: MealLog;
  imageUri?: string | null;
  onConfirmObserved?: (foodName: string) => void;
  onDescribe: () => void;
  onRetake: () => void;
};

export function AbstentionScreen({ meal, imageUri, onConfirmObserved, onDescribe, onRetake }: AbstentionScreenProps) {
  const isEmptyPlate = meal.items.length === 0;
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [customItems, setCustomItems] = useState<string[]>(meal.items.map((i) => i.query).filter(Boolean));

  const items = meal.items;
  const observedNames = customItems.length > 0 ? customItems : items.map((i) => i.query).filter(Boolean);

  function startEditing(index: number, currentName: string) {
    setEditingIndex(index);
    setEditValue(currentName);
  }

  function cancelEditing() {
    setEditingIndex(null);
    setEditValue("");
  }

  function applyItemEdit(index: number) {
    const trimmed = editValue.trim();
    if (!trimmed) return;
    const updated = [...customItems];
    updated[index] = trimmed;
    setCustomItems(updated);
    setEditingIndex(null);
    setEditValue("");
    if (onConfirmObserved) {
      onConfirmObserved(updated.join(", "));
    }
  }

  function removeItem(index: number) {
    const updated = customItems.filter((_, idx) => idx !== index);
    setCustomItems(updated);
    if (updated.length > 0 && onConfirmObserved) {
      onConfirmObserved(updated.join(", "));
    } else if (updated.length === 0) {
      onDescribe();
    }
  }

  function chooseCandidateDirectly(candidate: Candidate, itemIdx: number) {
    const updated = [...customItems];
    updated[itemIdx] = candidate.name;
    setCustomItems(updated);
    if (onConfirmObserved) {
      onConfirmObserved(updated.join(", "));
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Header
        eyebrow={isEmptyPlate ? "YEMEK BULUNAMADI" : t("abstainEyebrow")}
        title={isEmptyPlate ? "Tabakta Yemek Görünmüyor." : t("abstainTitle")}
        subtitle={isEmptyPlate ? "Boş tabak veya yiyecek dışı görüntü" : t("actionAsk")}
      />

      {imageUri ? (
        <View style={styles.imageContainer}>
          <Image source={{ uri: imageUri }} style={styles.previewImage} resizeMode="cover" />
          <View style={styles.imageBadge}>
            <Ionicons name="image-outline" size={13} color={colors.white} />
            <Text style={styles.imageBadgeText}>Yüklenen Fotoğraf</Text>
          </View>
          <View style={styles.privacyBadge}>
            <Ionicons name="shield-checkmark" size={12} color={colors.moss} />
            <Text style={styles.privacyBadgeText}>EXIF & PII Güvende</Text>
          </View>
        </View>
      ) : null}

      {/* Interactive Quick Confirmation Card for All Observed Foods */}
      {!isEmptyPlate && observedNames.length > 0 ? (
        <View style={styles.confirmationCard}>
          <View style={styles.confirmHeaderRow}>
            <Ionicons name="sparkles" size={18} color={colors.moss} />
            <Text style={styles.confirmHeader}>Modelin Tespiti Doğru mu?</Text>
          </View>
          <Text style={styles.confirmCopy}>
            Yapay zeka bu fotoğrafta: <Text style={styles.bold}>{observedNames.join(", ")}</Text> gördü.
          </Text>
          <View style={styles.confirmActions}>
            <Pressable
              style={styles.confirmYesButton}
              onPress={() => (onConfirmObserved ? onConfirmObserved(observedNames.join(", ")) : onDescribe())}
            >
              <Ionicons name="checkmark-circle" size={18} color={colors.white} />
              <Text style={styles.confirmYesText}>Evet, Doğru ({observedNames.join(", ")})</Text>
            </Pressable>
            <Pressable style={styles.confirmNoButton} onPress={onDescribe}>
              <Ionicons name="close-circle-outline" size={18} color={colors.ink} />
              <Text style={styles.confirmNoText}>Hayır, Farklı Bir Yemek Yaz</Text>
            </Pressable>
          </View>
        </View>
      ) : null}

      <View style={styles.heroCard}>
        <View style={styles.iconCircle}>
          <Ionicons name={isEmptyPlate ? "restaurant-outline" : "help-circle-outline"} size={31} color={colors.yellow} />
        </View>
        <Text style={styles.heroTitle}>{isEmptyPlate ? "BOŞ TABAK VEYA NESNE" : t("abstainCode")}</Text>
        <Text style={styles.heroCopy}>
          {isEmptyPlate
            ? "Bu fotoğrafta yenilebilir bir yemek tespit edilemedi (boş tabak veya yiyecek dışı görüntü). Lütfen ne yediğini kendin yaz veya yeni bir fotoğraf çek."
            : t("abstainCopy")}
        </Text>
      </View>

      {!isEmptyPlate
        ? items.map((item, idx) => {
            const currentItemName = customItems[idx] ?? item.query ?? t("mealFallback");
            const isEditing = editingIndex === idx;

            return (
              <View key={`${item.query}-${idx}`} style={styles.itemAbstainBlock}>
                <View style={styles.observedCard}>
                  <View style={styles.itemHeaderRow}>
                    <Text style={styles.sectionLabel}>{`${t("abstainObserved")} #${idx + 1}`}</Text>
                    <View style={styles.itemActionsRow}>
                      <Pressable
                        style={styles.inlineEditButton}
                        onPress={() => (isEditing ? cancelEditing() : startEditing(idx, currentItemName))}
                      >
                        <Ionicons name={isEditing ? "close-outline" : "create-outline"} size={14} color={colors.terracotta} />
                        <Text style={styles.inlineEditText}>{isEditing ? "Vazgeç" : "Bu Yemeği Düzelt"}</Text>
                      </Pressable>
                      {items.length > 1 ? (
                        <Pressable style={styles.inlineRemoveButton} onPress={() => removeItem(idx)}>
                          <Ionicons name="trash-outline" size={13} color={colors.muted} />
                        </Pressable>
                      ) : null}
                    </View>
                  </View>

                  {isEditing ? (
                    <View style={styles.inlineEditBox}>
                      <Text style={styles.inlineEditLabel}>Doğru yemek ismini veya tarifini yazın:</Text>
                      <TextInput
                        style={styles.inlineInput}
                        value={editValue}
                        onChangeText={setEditValue}
                        placeholder="Örn: Kıymalı makarna, salata..."
                        placeholderTextColor={colors.muted}
                        autoFocus
                      />
                      <View style={styles.inlineEditActions}>
                        <Pressable style={styles.inlineSaveButton} onPress={() => applyItemEdit(idx)}>
                          <Ionicons name="checkmark" size={15} color={colors.white} />
                          <Text style={styles.inlineSaveText}>Güncelle & Eşleştir</Text>
                        </Pressable>
                        <Pressable style={styles.inlineCancelButton} onPress={cancelEditing}>
                          <Text style={styles.inlineCancelText}>İptal</Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <>
                      <Text style={styles.observedText}>{currentItemName}</Text>
                      <Text style={styles.observedSubtext}>
                        Görsel modelimiz fotoğrafta "{currentItemName}" tespit etti; ancak kapalı besin kataloğumuzda güvenli eşleşme olmadığı için uydurma tahminde bulunmayıp sana soruyoruz.
                      </Text>
                    </>
                  )}
                </View>

                <View style={styles.candidatesCard}>
                  <Text style={styles.sectionLabel}>{t("abstainCandidates")}</Text>
                  {item.candidates.length ? (
                    <View style={styles.candidateList}>
                      {item.candidates.map((candidate) => (
                        <Pressable
                          key={candidate.food_id}
                          style={styles.candidateRow}
                          onPress={() => chooseCandidateDirectly(candidate, idx)}
                        >
                          <View style={styles.candidateIcon}>
                            <Ionicons name="arrow-forward-outline" size={15} color={colors.moss} />
                          </View>
                          <Text style={styles.candidateName}>{candidate.name}</Text>
                          <View style={styles.candidatePickPill}>
                            <Text style={styles.candidatePickText}>Seç & Kaydet</Text>
                          </View>
                        </Pressable>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.noCandidates}>{t("abstainNoCandidates")}</Text>
                  )}
                </View>
              </View>
            );
          })
        : null}

      <Pressable style={styles.primaryButton} onPress={onDescribe}>
        <Ionicons name="create-outline" size={19} color={colors.white} />
        <Text style={styles.primaryButtonText}>{t("describeMeal")}</Text>
      </Pressable>
      <Pressable style={styles.textButton} onPress={onRetake}>
        <Ionicons name="camera-outline" size={17} color={colors.muted} />
        <Text style={styles.textButtonText}>{t("retakePhoto")}</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 22, paddingBottom: 34 },
  itemAbstainBlock: { marginBottom: 8 },
  imageContainer: {
    width: "100%",
    height: 180,
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.line,
    position: "relative",
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
  confirmationCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#CDE5D4",
    shadowColor: "#1F2421",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  confirmHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  confirmHeader: {
    color: colors.moss,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  confirmCopy: {
    color: colors.ink,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 14,
  },
  bold: {
    fontWeight: "800",
    color: colors.terracotta,
  },
  confirmActions: {
    gap: 9,
  },
  confirmYesButton: {
    backgroundColor: colors.moss,
    borderRadius: 15,
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  confirmYesText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: "800",
  },
  confirmNoButton: {
    backgroundColor: colors.paper,
    borderRadius: 15,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: colors.line,
  },
  confirmNoText: {
    color: colors.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  heroCard: { backgroundColor: "#FBF1D8", borderRadius: 24, padding: 20, borderWidth: 1, borderColor: "#EBD8A5", marginBottom: 15 },
  iconCircle: { width: 54, height: 54, borderRadius: 19, backgroundColor: colors.card, alignItems: "center", justifyContent: "center", marginBottom: 17 },
  heroTitle: { color: "#8D641C", fontSize: 13, fontWeight: "800", letterSpacing: 1.1 },
  heroCopy: { color: colors.ink, fontSize: 16, lineHeight: 23, fontWeight: "700", marginTop: 8 },
  observedCard: { backgroundColor: colors.card, borderRadius: 19, borderWidth: 1, borderColor: colors.line, padding: 16, marginBottom: 15 },
  itemHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  itemActionsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  inlineEditButton: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: "#FBECE6" },
  inlineEditText: { color: colors.terracotta, fontSize: 11, fontWeight: "800" },
  inlineRemoveButton: { padding: 4, borderRadius: 8, backgroundColor: colors.paper },
  inlineEditBox: { marginTop: 10 },
  inlineEditLabel: { color: colors.ink, fontSize: 12, fontWeight: "700", marginBottom: 6 },
  inlineInput: {
    backgroundColor: colors.paper,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.terracotta,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.ink,
    fontWeight: "700",
    marginBottom: 10,
  },
  inlineEditActions: { flexDirection: "row", gap: 8 },
  inlineSaveButton: {
    flex: 1,
    backgroundColor: colors.terracotta,
    borderRadius: 10,
    paddingVertical: 9,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  inlineSaveText: { color: colors.white, fontSize: 12, fontWeight: "800" },
  inlineCancelButton: {
    backgroundColor: colors.paper,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.line,
  },
  inlineCancelText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  sectionLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.3 },
  observedText: { color: colors.ink, fontSize: 18, fontWeight: "800", marginTop: 7 },
  observedSubtext: { color: colors.muted, fontSize: 12, lineHeight: 18, fontWeight: "600", marginTop: 6 },
  candidatesCard: { backgroundColor: colors.card, borderRadius: 19, borderWidth: 1, borderColor: colors.line, padding: 16, marginBottom: 15 },
  candidateList: { gap: 10, marginTop: 13 },
  candidateRow: { flexDirection: "row", alignItems: "center", gap: 9, paddingVertical: 4 },
  candidateIcon: { width: 27, height: 27, borderRadius: 10, backgroundColor: "#E6F0E8", alignItems: "center", justifyContent: "center" },
  candidateName: { flex: 1, color: colors.ink, fontSize: 13, fontWeight: "700" },
  candidatePickPill: { backgroundColor: "#E6F0E8", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 10 },
  candidatePickText: { color: colors.moss, fontSize: 10, fontWeight: "800" },
  noCandidates: { color: colors.muted, fontSize: 13, marginTop: 12 },
  primaryButton: { minHeight: 54, borderRadius: 18, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, paddingHorizontal: 18, marginTop: 10 },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  textButton: { alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 7, paddingVertical: 17 },
  textButtonText: { color: colors.muted, fontSize: 12, fontWeight: "700" },
});
