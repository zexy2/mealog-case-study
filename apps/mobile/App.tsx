import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { AnalysisState, ANALYSIS_STEPS } from "./components/AnalysisState";
import { Banner } from "./components/Banner";
import { BottomNav, Screen } from "./components/BottomNav";
import { ErrorState } from "./components/ErrorState";
import { AbstentionScreen } from "./screens/Abstention";
import { CaptureScreen } from "./screens/Capture";
import { DayScreen } from "./screens/Day";
import { ReviewScreen, TURKISH_FOOD_NUTRITION_MAP } from "./screens/Review";
import { correctMeal, isDemoMode, MealApiError, submitMeal } from "./src/api";
import { buildMealCorrections, removeSavedMeal } from "./src/corrections";
import { buildDemoMeal, initialDayMeals } from "./src/demoData";
import { demoInput, demoScenarioFor } from "./src/demoScenarios";
import { t } from "./src/strings";
import { Candidate, DemoScenario, MealLog, PendingCapture } from "./src/types";

const PENDING_KEY = "@mealog/pending-capture";
const DAY_MEALS_KEY = "@mealog/day-meals";

function newIdempotencyKey() {
  return `meal-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}

function AppContent() {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [screen, setScreen] = useState<Screen>("capture");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingCapture | null>(null);
  const [meal, setMeal] = useState<MealLog | null>(null);



  const [dayMeals, setDayMeals] = useState<MealLog[]>(isDemoMode ? initialDayMeals : []);

  const [banner, setBanner] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [portionEdits, setPortionEdits] = useState<Record<number, number>>({});
  const [selectedCandidates, setSelectedCandidates] = useState<Record<number, string>>({});
  const [quantityEdits, setQuantityEdits] = useState<Record<number, number | null>>({});
  const [reviewingSavedMealKey, setReviewingSavedMealKey] = useState<string | null>(null);
  const [highlightedMealKey, setHighlightedMealKey] = useState<string | null>(null);
  const [capturedImageUri, setCapturedImageUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);


  useEffect(() => {
    AsyncStorage.getItem(PENDING_KEY)
      .then((raw) => {
        if (raw) setPending(JSON.parse(raw) as PendingCapture);
      })
      .catch(() => undefined);

    if (!isDemoMode) {
      AsyncStorage.getItem(DAY_MEALS_KEY)
        .then((raw) => {
          if (raw) setDayMeals(JSON.parse(raw) as MealLog[]);
        })
        .catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    if (screen === "capture" && permission && !permission.granted && !permission.canAskAgain) return;
    if (screen === "capture" && permission && !permission.granted) {
      requestPermission().catch(() => undefined);
    }
  }, [permission, requestPermission, screen]);

  useEffect(() => {
    if (!busy) return undefined;
    const timer = setInterval(() => {
      setAnalysisStep((step) => Math.min(step + 1, ANALYSIS_STEPS.length - 1));
    }, 720);
    return () => clearInterval(timer);
  }, [busy]);

  useEffect(() => {
    if (!banner) return undefined;
    const timer = setTimeout(() => setBanner(null), 3600);
    return () => clearTimeout(timer);
  }, [banner]);

  async function persistPending(next: PendingCapture) {
    setPending(next);
    await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(next));
  }

  async function clearPending() {
    setPending(null);
    await AsyncStorage.removeItem(PENDING_KEY);
  }

  async function submit(source: Omit<PendingCapture, "idempotencyKey">, retryKey?: string, demoRetry = false) {
    if (source.photo?.uri) {
      setCapturedImageUri(source.photo.uri);
    } else if (source.text) {
      setCapturedImageUri(null);
    }
    const capture: PendingCapture = { ...source, idempotencyKey: retryKey ?? newIdempotencyKey() };
    setReviewingSavedMealKey(null);
    setMeal(null);
    setHighlightedMealKey(null);
    setError(null);
    setAnalysisStep(0);
    setBusy(true);

    await persistPending(capture);
    try {
      if (isDemoMode && demoScenarioFor(capture.text) === "empty") {
        await new Promise((resolve) => setTimeout(resolve, 850));
        await clearPending();
        setMeal(null);
        setDayMeals([]);
        setBusy(false);
        setScreen("day");
        return;
      }
      const result = await submitMeal(capture, { demoRetry });
      await clearPending();
      setMeal(result);
      setPortionEdits({});
      setSelectedCandidates({});
      setQuantityEdits({});
      setExpandedItem(result.items.length > 0 ? 0 : null);
      setBusy(false);
      const hasOnlyAbstainedItems = result.items.length === 1 && result.items[0]?.food_id === "ABSTAIN";
      if (result.action === "auto_accept" && !result.degraded) {
        upsertMeal(result);
        setReviewingSavedMealKey(result.idempotency_key);
        setHighlightedMealKey(result.idempotency_key);
        setBanner(t("mealAdded"));
        setScreen("day");
      } else if (result.action === "ask" && (result.items.length === 0 || hasOnlyAbstainedItems)) {
        setScreen("abstain");
      } else {
        setScreen("review");
      }
    } catch (caught) {
      setBusy(false);
      setScreen("capture");
      setError(caught instanceof MealApiError || isDemoMode && caught instanceof Error ? caught.message : t("uploadFailed"));
    }
  }

  async function capturePhoto() {
    if (!cameraRef.current) return;
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.82 });
      if (picture?.uri) await submit({ photo: { uri: picture.uri, mimeType: "image/jpeg" } });
    } catch {
      setError(t("cameraCaptureFailed"));
    }
  }

  async function choosePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.82,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await submit({ photo: { uri: result.assets[0].uri, mimeType: result.assets[0].mimeType } });
    }
  }

  function upsertMeal(next: MealLog) {
    setDayMeals((current) => {
      const existingIndex = current.findIndex((item) => item.idempotency_key === next.idempotency_key);
      const existing = existingIndex >= 0 ? current[existingIndex] : undefined;
      const saved = { ...next, createdAt: next.createdAt ?? existing?.createdAt ?? new Date().toISOString() };
      if (!isDemoMode) {
        const nextState = existingIndex < 0 ? [saved, ...current] : current.map((item, index) => (index === existingIndex ? saved : item));
        AsyncStorage.setItem(DAY_MEALS_KEY, JSON.stringify(nextState)).catch(() => undefined);
      }
      if (existingIndex < 0) return [saved, ...current];
      return current.map((item, index) => (index === existingIndex ? saved : item));
    });
  }

  function openSavedMeal(savedMeal: MealLog) {
    setMeal(savedMeal);
    setReviewingSavedMealKey(savedMeal.idempotency_key);
    setPortionEdits({});
    setSelectedCandidates({});
    setQuantityEdits({});
    setExpandedItem(null);
    setScreen("review");
  }

  function requestRemoveMeal(savedMeal: MealLog) {
    Alert.alert(
      t("removeMealTitle"),
      t("removeMealCopy"),
      [
        { text: t("cancel"), style: "cancel" },
        {
          text: t("removeMealConfirm"),
          style: "destructive",
          onPress: () => {
            setDayMeals((current) => {
              const updated = removeSavedMeal(current, savedMeal.idempotency_key);
              if (!isDemoMode) {
                AsyncStorage.setItem(DAY_MEALS_KEY, JSON.stringify(updated)).catch(() => undefined);
              }
              return updated;
            });
            setHighlightedMealKey((current) => current === savedMeal.idempotency_key ? null : current);
            setBanner(t("mealRemoved"));
          },
        },
      ],
    );
  }

  async function saveReview() {
    if (!meal) return;
    const hasUnansweredCountClarification = meal.items.some((item, index) => {
      const clarification = item.clarification ?? null;
      const hasQuantityEdit = Object.prototype.hasOwnProperty.call(quantityEdits, index);
      return clarification?.kind === "count" && !hasQuantityEdit && item.quantity === null;
    });
    if (hasUnansweredCountClarification) {
      setBanner(t("clarifyCountRequired"));
      return;
    }
    const wasSaved = reviewingSavedMealKey !== null;
    const corrections = buildMealCorrections(meal, portionEdits, selectedCandidates, quantityEdits);
    setSaving(true);
    try {
      const saved = corrections.length > 0 ? await correctMeal(meal, corrections) : meal;
      upsertMeal(saved);
      setMeal(saved);
      setPortionEdits({});
      setSelectedCandidates({});
      setQuantityEdits({});
      setReviewingSavedMealKey(null);
      setHighlightedMealKey(null);
      setBanner(wasSaved ? t("mealUpdated") : saved.action === "ask" ? t("savedQuestionOpen") : t("mealAdded"));
      setScreen("day");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("correctionFailed"));
    } finally {
      setSaving(false);
    }
  }

  function chooseCandidate(itemIndex: number, candidate: Candidate) {
    setSelectedCandidates((current) => ({ ...current, [itemIndex]: candidate.food_id }));
  }

  function retryPending() {
    if (!pending) return;
    const { idempotencyKey, ...source } = pending;
    void submit(source, idempotencyKey, true);
  }

  function runDemoScenario(scenario: DemoScenario) {
    setText("");
    void submit({ text: demoInput(scenario) });
  }

  function undoAutoAcceptedMeal(savedMeal: MealLog) {
    setDayMeals((current) => {
      const updated = removeSavedMeal(current, savedMeal.idempotency_key);
      if (!isDemoMode) {
        AsyncStorage.setItem(DAY_MEALS_KEY, JSON.stringify(updated)).catch(() => undefined);
      }
      return updated;
    });
    setMeal(null);
    setReviewingSavedMealKey(null);
    setHighlightedMealKey(null);
    setBanner(t("mealUndone"));
  }

  function handleSelectCandidateFromAbstain(candidate: Candidate, itemIndex: number) {
    if (!meal) return;
    const updatedItems = [...meal.items];
    if (updatedItems[itemIndex]) {
      updatedItems[itemIndex] = {
        ...updatedItems[itemIndex],
        food_id: candidate.food_id,
        confidence: candidate.score,
        candidates: updatedItems[itemIndex].candidates.length > 0 ? updatedItems[itemIndex].candidates : [candidate],
      };
    }
    const updatedMeal: MealLog = {
      ...meal,
      items: updatedItems,
      action: "review",
    };
    setMeal(updatedMeal);
    setSelectedCandidates((curr) => ({ ...curr, [itemIndex]: candidate.food_id }));
    setScreen("review");
  }

  function handleRemoveItem(itemIndex: number) {
    if (!meal) return;
    const remainingItems = meal.items.filter((_, idx) => idx !== itemIndex);
    if (remainingItems.length === 0) {
      setMeal(null);
      setScreen("capture");
      return;
    }
    const updatedMeal: MealLog = {
      ...meal,
      items: remainingItems,
    };
    setMeal(updatedMeal);
    setPortionEdits({});
    setSelectedCandidates({});
    setQuantityEdits({});
  }

  function handleAddItemToPlate(
    foodName: string,
    customKcal?: number,
    customGrams?: number,
    customProtein?: number,
    customCarb?: number,
    customFat?: number,
  ) {
    if (!meal) return;
    const clean = foodName.trim();
    if (!clean) return;

    const lower = clean.toLowerCase();
    let matchedFoodId = "USER_CUSTOM";
    let matchedName = clean;
    let matchedGrams = customGrams ?? 150;
    let matchedKcal = customKcal ?? 150;
    let matchedProtein = customProtein ?? 5;
    let matchedCarb = customCarb ?? 20;
    let matchedFat = customFat ?? 4;

    for (const [id, info] of Object.entries(TURKISH_FOOD_NUTRITION_MAP)) {
      if (lower.includes(info.name.toLowerCase()) || info.name.toLowerCase().includes(lower)) {
        matchedFoodId = id;
        matchedName = info.name;
        matchedGrams = info.default_g;
        matchedKcal = Math.round((info.kcal_per_100g * info.default_g) / 100);
        matchedProtein = Math.round((info.protein_g * info.default_g) / 100);
        matchedCarb = Math.round((info.carb_g * info.default_g) / 100);
        matchedFat = Math.round((info.fat_g * info.default_g) / 100);
        break;
      }
    }

    if (matchedFoodId === "USER_CUSTOM" && !customKcal) {
      if (lower.includes("pizza")) {
        matchedFoodId = "tr.pizza";
        matchedName = "Pizza (Karışık)";
        matchedGrams = 150;
        matchedKcal = 400;
        matchedProtein = 16;
        matchedCarb = 50;
        matchedFat = 15;
      } else if (lower.includes("burger") || lower.includes("hamburger")) {
        matchedFoodId = "tr.kofte_izgara";
        matchedName = "Burger / Köfte";
        matchedGrams = 150;
        matchedKcal = 350;
        matchedProtein = 22;
        matchedCarb = 30;
        matchedFat = 16;
      } else if (lower.includes("patates") || lower.includes("kızartma")) {
        matchedFoodId = "tr.patates";
        matchedName = "Patates Kızartması";
        matchedGrams = 150;
        matchedKcal = 312;
        matchedProtein = 3.5;
        matchedCarb = 41;
        matchedFat = 15;
      } else if (lower.includes("pasta") || lower.includes("makarna")) {
        matchedFoodId = "tr.manti";
        matchedName = "Makarna / Mantı";
        matchedGrams = 180;
        matchedKcal = 280;
        matchedProtein = 9;
        matchedCarb = 52;
        matchedFat = 3;
      } else if (lower.includes("salata")) {
        matchedFoodId = "tr.coban_salatasi";
        matchedName = "Çoban Salatası";
        matchedGrams = 150;
        matchedKcal = 68;
        matchedProtein = 1.8;
        matchedCarb = 6.8;
        matchedFat = 3.8;
      } else if (lower.includes("ayran")) {
        matchedFoodId = "tr.ayran";
        matchedName = "Ayran";
        matchedGrams = 200;
        matchedKcal = 74;
        matchedProtein = 3.4;
        matchedCarb = 5.2;
        matchedFat = 4.0;
      } else if (lower.includes("ekmek")) {
        matchedFoodId = "tr.ekmek_beyaz";
        matchedName = "Ekmek, beyaz";
        matchedGrams = 50;
        matchedKcal = 138;
        matchedProtein = 4.7;
        matchedCarb = 25;
        matchedFat = 1.6;
      }
    }

    const candidate: Candidate = {
      food_id: matchedFoodId,
      name: matchedName,
      score: 1.0,
    };

    const newItem = {
      query: clean,
      food_id: matchedFoodId,
      candidates: [candidate],
      grams: matchedGrams,
      grams_p10: Math.round(matchedGrams * 0.8),
      grams_p90: Math.round(matchedGrams * 1.2),
      confidence: 0.95,
      nutrients: { kcal: matchedKcal, protein_g: matchedProtein, carb_g: matchedCarb, fat_g: matchedFat },
      portion_provenance: matchedFoodId === "USER_CUSTOM" ? "manual_user_input" : "standard_catalogue_portion",
      source_database: matchedFoodId === "USER_CUSTOM" ? "Kullanıcı Girişi" : "TURKOMP",
      portion_source: matchedFoodId === "USER_CUSTOM" ? "manual_user_input" : "catalogue_definition",
      unit: "porsiyon",
      quantity: 1,
    };

    const newItems = [...meal.items, newItem];
    const newTotals = {
      kcal: newItems.reduce((sum, it) => sum + (it.nutrients?.kcal || 0), 0),
      protein_g: Math.round(newItems.reduce((sum, it) => sum + (it.nutrients?.protein_g || 0), 0) * 10) / 10,
      carb_g: Math.round(newItems.reduce((sum, it) => sum + (it.nutrients?.carb_g || 0), 0) * 10) / 10,
      fat_g: Math.round(newItems.reduce((sum, it) => sum + (it.nutrients?.fat_g || 0), 0) * 10) / 10,
    };

    const updatedMeal: MealLog = {
      ...meal,
      items: newItems,
      totals: newTotals,
    };

    setMeal(updatedMeal);
    setBanner(`"${matchedName}" tabağa başarıyla eklendi.`);
  }

  function saveUncaloriedNote(abstainMeal: MealLog, dishName: string) {
    const noteMeal: MealLog = {
      ...abstainMeal,
      action: "review",
      items: [
        {
          query: dishName,
          food_id: "ABSTAIN",
          candidates: [],
          grams: 0,
          grams_p10: 0,
          grams_p90: 0,
          confidence: 1.0,
          nutrients: { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 },
          portion_provenance: "uncaloried_note",
          source_database: "Kullanıcı Notu",
          portion_source: "uncaloried_note",
        },
      ],
      totals: { kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 },
    };
    upsertMeal(noteMeal);
    setHighlightedMealKey(noteMeal.idempotency_key);
    setBanner("Öğün kalorisiz not olarak günlüğe eklendi.");
    setMeal(null);
    setScreen("day");
  }

  function saveManualCalories(abstainMeal: MealLog, dishName: string, calories: number) {
    const manualMeal: MealLog = {
      ...abstainMeal,
      action: "review",
      items: [
        {
          query: dishName,
          food_id: "USER_CUSTOM",
          candidates: [],
          grams: 0,
          grams_p10: 0,
          grams_p90: 0,
          confidence: 1.0,
          nutrients: { kcal: calories, protein_g: 0, carb_g: 0, fat_g: 0 },
          portion_provenance: "manual_user_input",
          source_database: "Kullanıcı Girişi",
          portion_source: "manual_user_input",
        },
      ],
      totals: { kcal: calories, protein_g: 0, carb_g: 0, fat_g: 0 },
    };
    upsertMeal(manualMeal);
    setHighlightedMealKey(manualMeal.idempotency_key);
    setBanner(`Öğün ${calories} kcal manuel kullanıcı girişi olarak kaydedildi.`);
    setMeal(null);
    setScreen("day");
  }

  function handleAcceptLlmEstimate(dishName: string, calories: number, protein: number, carb: number, fat: number) {
    if (!meal) return;
    const llmCandidate: Candidate = {
      food_id: "USER_CUSTOM",
      name: dishName,
      score: 0.95,
    };
    const resolvedItem = {
      query: dishName,
      food_id: "USER_CUSTOM",
      candidates: [llmCandidate],
      grams: 150,
      grams_p10: 120,
      grams_p90: 180,
      confidence: 0.95,
      nutrients: { kcal: calories, protein_g: protein, carb_g: carb, fat_g: fat },
      portion_provenance: "llm_generative_estimate",
      source_database: "Yapay Zeka (LLM) Tahmini",
      portion_source: "llm_generative_estimate",
      unit: "porsiyon",
      quantity: 1,
    };
    const updatedMeal: MealLog = {
      ...meal,
      action: "review",
      items: [resolvedItem],
      totals: { kcal: calories, protein_g: protein, carb_g: carb, fat_g: fat },
    };
    setMeal(updatedMeal);
    setSelectedCandidates({ 0: "USER_CUSTOM" });
    setPortionEdits({});
    setQuantityEdits({ 0: 1 });
    setExpandedItem(null);
    setBanner("Yapay zeka tahmini kontrol ekranına aktarıldı.");
    setScreen("review");
  }

  function handleConfirmObservedFood(foodName: string) {
    if (!meal) return;
    const clean = foodName.trim();
    if (!clean) return;

    const lower = clean.toLowerCase();
    let matchedFoodId: string | null = null;
    let matchedName = clean;
    let matchedGrams = 150;
    let matchedKcal = 0;
    let matchedProtein = 0;
    let matchedCarb = 0;
    let matchedFat = 0;

    for (const [id, info] of Object.entries(TURKISH_FOOD_NUTRITION_MAP)) {
      if (lower.includes(info.name.toLowerCase()) || info.name.toLowerCase().includes(lower)) {
        matchedFoodId = id;
        matchedName = info.name;
        matchedGrams = info.default_g;
        matchedKcal = Math.round((info.kcal_per_100g * info.default_g) / 100);
        matchedProtein = Math.round((info.protein_g * info.default_g) / 100);
        matchedCarb = Math.round((info.carb_g * info.default_g) / 100);
        matchedFat = Math.round((info.fat_g * info.default_g) / 100);
        break;
      }
    }

    if (!matchedFoodId) {
      if (lower.includes("pizza")) {
        matchedFoodId = "tr.pizza";
        matchedName = "Pizza (Karışık)";
        matchedGrams = 150;
        matchedKcal = 400;
        matchedProtein = 16;
        matchedCarb = 50;
        matchedFat = 15;
      } else if (lower.includes("burger") || lower.includes("hamburger")) {
        matchedFoodId = "tr.kofte_izgara";
        matchedName = "Burger / Köfte";
        matchedGrams = 150;
        matchedKcal = 350;
        matchedProtein = 22;
        matchedCarb = 30;
        matchedFat = 16;
      } else if (lower.includes("patates") || lower.includes("kızartma")) {
        matchedFoodId = "tr.patates";
        matchedName = "Patates Kızartması";
        matchedGrams = 150;
        matchedKcal = 312;
        matchedProtein = 3.5;
        matchedCarb = 41;
        matchedFat = 15;
      } else if (lower.includes("pasta") || lower.includes("makarna")) {
        matchedFoodId = "tr.manti";
        matchedName = "Makarna";
        matchedGrams = 180;
        matchedKcal = 280;
        matchedProtein = 9;
        matchedCarb = 52;
        matchedFat = 3;
      } else if (lower.includes("salata")) {
        matchedFoodId = "tr.coban_salatasi";
        matchedName = "Çoban Salatası";
        matchedGrams = 150;
        matchedKcal = 68;
        matchedProtein = 1.8;
        matchedCarb = 6.8;
        matchedFat = 3.8;
      } else if (lower.includes("ayran")) {
        matchedFoodId = "tr.ayran";
        matchedName = "Ayran";
        matchedGrams = 200;
        matchedKcal = 74;
        matchedProtein = 3.4;
        matchedCarb = 5.2;
        matchedFat = 4.0;
      } else if (lower.includes("ekmek")) {
        matchedFoodId = "tr.ekmek_beyaz";
        matchedName = "Ekmek, beyaz";
        matchedGrams = 50;
        matchedKcal = 138;
        matchedProtein = 4.7;
        matchedCarb = 25;
        matchedFat = 1.6;
      } else if (lower.includes("corba") || lower.includes("çorba")) {
        matchedFoodId = "tr.mercimek_corbasi";
        matchedName = "Mercimek çorbası";
        matchedGrams = 250;
        matchedKcal = 155;
        matchedProtein = 7.8;
        matchedCarb = 23.5;
        matchedFat = 3.5;
      } else if (lower.includes("pilav")) {
        matchedFoodId = "tr.pilav";
        matchedName = "Pirinç pilavı";
        matchedGrams = 180;
        matchedKcal = 272;
        matchedProtein = 5.4;
        matchedCarb = 50.4;
        matchedFat = 5.6;
      } else if (lower.includes("fasulye")) {
        matchedFoodId = "tr.kuru_fasulye";
        matchedName = "Kuru fasulye (etli)";
        matchedGrams = 250;
        matchedKcal = 295;
        matchedProtein = 17.2;
        matchedCarb = 33.0;
        matchedFat = 10.8;
      }
    }

    if (!matchedFoodId) {
      Alert.alert(
        "Katalogda Bulunamadı",
        `"${clean}" yemek kataloğunda bulunamadı. Lütfen geçerli bir yemek adı yazın (örn. Burger, Pizza, Makarna, Çorba) veya aşağıdaki "Cihaza Manuel Kalori Gir" seçeneğini kullanın.`,
      );
      return;
    }

    const candidate: Candidate = {
      food_id: matchedFoodId,
      name: matchedName,
      score: 0.95,
    };

    const resolvedItem = {
      query: clean,
      food_id: matchedFoodId,
      candidates: [candidate],
      grams: matchedGrams,
      grams_p10: Math.round(matchedGrams * 0.8),
      grams_p90: Math.round(matchedGrams * 1.2),
      confidence: 0.95,
      nutrients: { kcal: matchedKcal, protein_g: matchedProtein, carb_g: matchedCarb, fat_g: matchedFat },
      portion_provenance: "standard_catalogue_portion",
      source_database: "TURKOMP",
      portion_source: "catalogue_definition",
      unit: "porsiyon",
      quantity: 1,
    };

    const updatedMeal: MealLog = {
      ...meal,
      action: "review",
      items: [resolvedItem],
      totals: { kcal: matchedKcal, protein_g: matchedProtein, carb_g: matchedCarb, fat_g: matchedFat },
      degraded: false,
    };

    setMeal(updatedMeal);
    setSelectedCandidates({ 0: matchedFoodId });
    setPortionEdits({});
    setQuantityEdits({ 0: 1 });
    setExpandedItem(null);
    setBanner(`"${matchedName}" fotoğrafınıza bağlandı ve kontrol ekranına aktarıldı.`);
    setScreen("review");
  }

  function suggestDishToQueue(dishName: string) {
    Alert.alert(
      "Öneri Bildirildi (UI Prototipi)",
      `"${dishName}" önerisi arayüz prototipinde işaretlendi. Production mimarisinde bu talep, kullanıcı onayıyla anonimleştirilmiş katalog geri bildirim kuyruğuna aktarılır.`,
    );
  }

  function leaveAbstention() {
    setMeal(null);
    setText("");
    setScreen("capture");
  }

  const totalCalories = useMemo(() => dayMeals.reduce((sum, item) => sum + item.totals.kcal, 0), [dayMeals]);
  const totalProtein = useMemo(() => dayMeals.reduce((sum, item) => sum + item.totals.protein_g, 0), [dayMeals]);
  const totalCarbs = useMemo(() => dayMeals.reduce((sum, item) => sum + (item.totals.carb_g ?? 0), 0), [dayMeals]);
  const totalFat = useMemo(() => dayMeals.reduce((sum, item) => sum + (item.totals.fat_g ?? 0), 0), [dayMeals]);

  if (busy) {
    return <AppShell><AnalysisState step={analysisStep} imageUri={capturedImageUri} /></AppShell>;
  }

  if (error) {
    return (
      <AppShell>
        <ErrorState message={error} canRetry={Boolean(pending)} onRetry={retryPending} onRetake={() => { setError(null); setScreen("capture"); }} />
        <BottomNav screen="capture" canReview={false} onChange={setScreen} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      {banner ? <Banner message={banner} /> : null}
      {screen === "capture" ? (
        <CaptureScreen
          cameraRef={cameraRef}
          permissionGranted={permission?.granted ?? false}
          requestPermission={requestPermission}
          text={text}
          setText={setText}
          pending={pending}
          onCapture={capturePhoto}
          onChoosePhoto={choosePhoto}
          onSubmitText={() => submit({ text: text.trim() || "plate" })}
          onRetry={retryPending}
          onDemoScenario={runDemoScenario}
        />
      ) : null}
      {screen === "abstain" && meal ? (
        <AbstentionScreen
          meal={meal}
          imageUri={capturedImageUri}
          onConfirmObserved={handleConfirmObservedFood}
          onSelectCandidateDirectly={handleSelectCandidateFromAbstain}
          onDescribe={leaveAbstention}
          onRetake={leaveAbstention}
          onSaveUncaloriedNote={saveUncaloriedNote}
          onSaveManualCalories={saveManualCalories}
          onAcceptLlmEstimate={handleAcceptLlmEstimate}
          onSuggestDish={suggestDishToQueue}
        />
      ) : null}


      {screen === "review" && meal ? (
        <ReviewScreen
          meal={meal}
          imageUri={capturedImageUri}
          expandedItem={expandedItem}
          setExpandedItem={setExpandedItem}

          portionEdits={portionEdits}
          setPortionEdits={setPortionEdits}
          quantityEdits={quantityEdits}
          setQuantityEdits={setQuantityEdits}
          selectedCandidates={selectedCandidates}
          onChooseCandidate={chooseCandidate}
          onRemoveItem={handleRemoveItem}
          onAddItem={handleAddItemToPlate}
          onSave={saveReview}
          isSaved={reviewingSavedMealKey !== null}
          saving={saving}
          onBack={() => {
            if (reviewingSavedMealKey) {
              setReviewingSavedMealKey(null);
              setMeal(null);
              setScreen("day");
              return;
            }
            setMeal(null);
            setScreen("capture");
          }}
        />
      ) : null}
      {screen === "day" ? (
        <DayScreen
          meals={dayMeals}
          totalCalories={totalCalories}
          totalProtein={totalProtein}
          totalCarbs={totalCarbs}
          totalFat={totalFat}
          highlightedMealKey={highlightedMealKey}
          onCapture={() => setScreen("capture")}
          onOpenMeal={openSavedMeal}
          onRemoveMeal={requestRemoveMeal}
          onUndoMeal={undoAutoAcceptedMeal}
        />
      ) : null}
      <BottomNav
        screen={screen}
        onChange={(next) => {
          if (next === "review" && !meal) {
            if (dayMeals.length > 0) {
              openSavedMeal(dayMeals[0]);
            } else {
              Alert.alert(t("navReview"), "Henüz analiz edilmiş bir öğün yok. Lütfen bir yemek fotoğrafı çekin veya yemek adı girin.");
              setScreen("capture");
            }
            return;
          }
          setScreen(next);
        }}
      />
    </AppShell>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <StatusBar style="dark" />
        {children}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F4F1EA" },
});
