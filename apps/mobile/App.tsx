import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AnalysisState, ANALYSIS_STEPS } from "./components/AnalysisState";
import { Banner } from "./components/Banner";
import { BottomNav, Screen } from "./components/BottomNav";
import { ErrorState } from "./components/ErrorState";
import { AbstentionScreen } from "./screens/Abstention";
import { CaptureScreen } from "./screens/Capture";
import { DayScreen } from "./screens/Day";
import { ReviewScreen } from "./screens/Review";
import { isDemoMode, submitMeal } from "./src/api";
import { initialDayMeals } from "./src/demoData";
import { demoInput, demoScenarioFor } from "./src/demoScenarios";
import { t } from "./src/strings";
import { Candidate, DemoScenario, MealLog, PendingCapture } from "./src/types";

const PENDING_KEY = "@mealog/pending-capture";

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
  const [dayMeals, setDayMeals] = useState<MealLog[]>(initialDayMeals);
  const [banner, setBanner] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [portionEdits, setPortionEdits] = useState<Record<number, number>>({});
  const [selectedCandidates, setSelectedCandidates] = useState<Record<number, string>>({});
  const [reviewingSavedMealKey, setReviewingSavedMealKey] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(PENDING_KEY)
      .then((raw) => {
        if (raw) setPending(JSON.parse(raw) as PendingCapture);
      })
      .catch(() => undefined);
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
    const capture: PendingCapture = { ...source, idempotencyKey: retryKey ?? newIdempotencyKey() };
    setReviewingSavedMealKey(null);
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
      setExpandedItem(null);
      setBusy(false);
      if (result.action === "auto_accept" && !result.degraded) {
        upsertMeal(result);
        setBanner(t("mealAdded"));
        setScreen("day");
      } else if (result.action === "ask") {
        setScreen("abstain");
      } else {
        setScreen("review");
      }
    } catch (caught) {
      setBusy(false);
      setScreen("capture");
      setError(isDemoMode && caught instanceof Error ? caught.message : t("uploadFailed"));
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
      const saved = {
        ...next,
        createdAt: next.createdAt ?? existing?.createdAt ?? new Date().toISOString(),
      };
      if (existingIndex < 0) return [saved, ...current];
      return current.map((item, index) => (index === existingIndex ? saved : item));
    });
  }

  function openSavedMeal(savedMeal: MealLog) {
    setMeal(savedMeal);
    setReviewingSavedMealKey(savedMeal.idempotency_key);
    setPortionEdits({});
    setSelectedCandidates({});
    setExpandedItem(null);
    setScreen("review");
  }

  function saveReview() {
    if (!meal) return;
    upsertMeal(meal);
    setReviewingSavedMealKey(null);
    setBanner(meal.action === "ask" ? t("savedQuestionOpen") : t("mealAdded"));
    setScreen("day");
  }

  function chooseCandidate(itemIndex: number, candidate: Candidate) {
    setSelectedCandidates((current) => ({ ...current, [itemIndex]: candidate.food_id }));
    setMeal((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.map((item, index) =>
          index === itemIndex ? { ...item, food_id: candidate.food_id, confidence: candidate.score } : item,
        ),
      };
    });
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

  const totalCalories = useMemo(() => dayMeals.reduce((sum, item) => sum + item.totals.kcal, 0), [dayMeals]);
  const totalProtein = useMemo(() => dayMeals.reduce((sum, item) => sum + item.totals.protein_g, 0), [dayMeals]);

  if (busy) {
    return <AppShell><AnalysisState step={analysisStep} /></AppShell>;
  }

  if (error) {
    return (
      <AppShell>
        <ErrorState message={error} canRetry={Boolean(pending)} onRetry={retryPending} onRetake={() => { setError(null); setScreen("capture"); }} />
        <BottomNav screen="capture" canReview={Boolean(meal)} onChange={setScreen} />
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
        <AbstentionScreen meal={meal} onChooseManually={() => setScreen("review")} onRetake={() => setScreen("capture")} />
      ) : null}
      {screen === "review" && meal ? (
        <ReviewScreen
          meal={meal}
          expandedItem={expandedItem}
          setExpandedItem={setExpandedItem}
          portionEdits={portionEdits}
          setPortionEdits={setPortionEdits}
          selectedCandidates={selectedCandidates}
          onChooseCandidate={chooseCandidate}
          onSave={saveReview}
          onBack={() => {
            if (reviewingSavedMealKey) {
              setReviewingSavedMealKey(null);
              setMeal(null);
              setScreen("day");
              return;
            }
            setScreen("capture");
          }}
        />
      ) : null}
      {screen === "day" ? <DayScreen meals={dayMeals} totalCalories={totalCalories} totalProtein={totalProtein} onCapture={() => setScreen("capture")} onOpenMeal={openSavedMeal} /> : null}
      <BottomNav screen={screen} canReview={Boolean(meal)} onChange={setScreen} />
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
