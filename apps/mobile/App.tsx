import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnalysisState, ANALYSIS_STEPS } from "./components/AnalysisState";
import { Banner } from "./components/Banner";
import { BottomNav, Screen } from "./components/BottomNav";
import { ErrorState } from "./components/ErrorState";
import { AbstentionScreen } from "./screens/Abstention";
import { CaptureScreen } from "./screens/Capture";
import { DayScreen } from "./screens/Day";
import { ReviewScreen } from "./screens/Review";
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
      if (result.action === "auto_accept" && !result.degraded) {
        upsertMeal(result);
        setReviewingSavedMealKey(result.idempotency_key);
        setHighlightedMealKey(result.idempotency_key);
        setBanner(t("mealAdded"));
        setScreen("day");
      } else if (result.action === "ask" && (result.items.length === 0 || result.items.some((item) => item.food_id === "ABSTAIN"))) {
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
    setExpandedItem(savedMeal.items.length > 0 ? 0 : null);
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

  function leaveAbstention() {
    setMeal(null);
    setText("");
    setScreen("capture");
  }

  const totalCalories = useMemo(() => dayMeals.reduce((sum, item) => sum + item.totals.kcal, 0), [dayMeals]);
  const totalProtein = useMemo(() => dayMeals.reduce((sum, item) => sum + item.totals.protein_g, 0), [dayMeals]);

  if (busy) {
    return <AppShell><AnalysisState step={analysisStep} /></AppShell>;
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
          onConfirmObserved={(name) => {
            void submit({ text: name });
          }}
          onSelectCandidateDirectly={handleSelectCandidateFromAbstain}
          onDescribe={leaveAbstention}
          onRetake={leaveAbstention}
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
      {screen === "day" ? <DayScreen meals={dayMeals} totalCalories={totalCalories} totalProtein={totalProtein} highlightedMealKey={highlightedMealKey} onCapture={() => setScreen("capture")} onOpenMeal={openSavedMeal} onRemoveMeal={requestRemoveMeal} onUndoMeal={undoAutoAcceptedMeal} /> : null}
      <BottomNav screen={screen} canReview={Boolean(meal && screen === "review")} onChange={setScreen} />
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
