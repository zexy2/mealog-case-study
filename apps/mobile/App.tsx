import AsyncStorage from "@react-native-async-storage/async-storage";
import Slider from "@react-native-community/slider";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { StatusBar } from "expo-status-bar";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { isDemoMode, submitMeal } from "./src/api";
import { initialDayMeals } from "./src/demoData";
import { Candidate, MealAction, MealLog, PendingCapture, PhotoCapture } from "./src/types";

type Screen = "capture" | "review" | "day";

const PENDING_KEY = "@mealog/pending-capture";
const ANALYSIS_STEPS = [
  "Reading the plate",
  "Matching to the catalogue",
  "Estimating portion",
];

const colors = {
  ink: "#20261F",
  muted: "#778078",
  paper: "#F4F1EA",
  card: "#FFFDF8",
  line: "#DFDDD5",
  terracotta: "#D95D3F",
  terracottaSoft: "#F5DED6",
  moss: "#56705F",
  mossSoft: "#DFE8DF",
  yellow: "#E8B653",
  white: "#FFFFFF",
};

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

function newIdempotencyKey() {
  return `meal-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatDate(date = new Date()) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatTime(iso?: string) {
  return new Date(iso ?? Date.now()).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function actionLabel(action: MealAction) {
  if (action === "auto_accept") return "Saved automatically";
  if (action === "ask") return "Needs one answer";
  return "Review suggested match";
}

function actionTone(action: MealAction) {
  if (action === "auto_accept") return { backgroundColor: colors.mossSoft, color: colors.moss };
  if (action === "ask") return { backgroundColor: "#F9EAC5", color: "#8D641C" };
  return { backgroundColor: colors.terracottaSoft, color: colors.terracotta };
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

  useEffect(() => {
    AsyncStorage.getItem(PENDING_KEY)
      .then((raw) => {
        if (raw) setPending(JSON.parse(raw) as PendingCapture);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (screen === "capture" && permission && !permission.granted && !permission.canAskAgain) {
      return;
    }
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

  async function capturePhoto() {
    if (!cameraRef.current) return;
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.82 });
      if (picture?.uri) {
        await submit({ photo: { uri: picture.uri, mimeType: "image/jpeg" } });
      }
    } catch {
      setError("Camera could not capture this plate. Try the text input instead.");
    }
  }

  async function choosePhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.82,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      await submit({
        photo: { uri: result.assets[0].uri, mimeType: result.assets[0].mimeType },
      });
    }
  }

  async function submit(source: Omit<PendingCapture, "idempotencyKey">, retryKey?: string) {
    const capture: PendingCapture = {
      ...source,
      idempotencyKey: retryKey ?? newIdempotencyKey(),
    };
    setError(null);
    setAnalysisStep(0);
    setBusy(true);
    await persistPending(capture);
    try {
      const result = await submitMeal(capture);
      await clearPending();
      setMeal(result);
      setPortionEdits({});
      setSelectedCandidates({});
      setExpandedItem(null);
      setBusy(false);
      if (result.action === "auto_accept") {
        appendMeal(result);
        setBanner("Meal added to today");
        setScreen("day");
      } else {
        setScreen("review");
      }
    } catch (caught) {
      setBusy(false);
      setScreen("capture");
      setError(caught instanceof Error ? caught.message : "Upload failed. Your draft is safe.");
    }
  }

  function appendMeal(next: MealLog) {
    setDayMeals((current) => {
      if (current.some((item) => item.idempotency_key === next.idempotency_key)) return current;
      return [{ ...next, createdAt: next.createdAt ?? new Date().toISOString() }, ...current];
    });
  }

  function saveReview() {
    if (!meal) return;
    appendMeal({ ...meal, createdAt: meal.createdAt ?? new Date().toISOString() });
    setBanner(meal.action === "ask" ? "Saved with question open" : "Meal added to today");
    setScreen("day");
  }

  function chooseCandidate(itemIndex: number, candidate: Candidate) {
    setSelectedCandidates((current) => ({ ...current, [itemIndex]: candidate.food_id }));
    setMeal((current) => {
      if (!current) return current;
      return {
        ...current,
        items: current.items.map((item, index) =>
          index === itemIndex
            ? { ...item, food_id: candidate.food_id, confidence: candidate.score }
            : item,
        ),
      };
    });
  }

  const totalCalories = useMemo(
    () => dayMeals.reduce((sum, item) => sum + item.totals.kcal, 0),
    [dayMeals],
  );
  const totalProtein = useMemo(
    () => dayMeals.reduce((sum, item) => sum + item.totals.protein_g, 0),
    [dayMeals],
  );

  if (busy) {
    return (
      <AppShell>
        <AnalysisState step={analysisStep} />
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
          error={error}
          pending={pending}
          onCapture={capturePhoto}
          onChoosePhoto={choosePhoto}
          onSubmitText={() => submit({ text: text.trim() || "plate" })}
          onRetry={() => pending && submit(pending, pending.idempotencyKey)}
        />
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
          onBack={() => setScreen("capture")}
        />
      ) : null}
      {screen === "day" ? (
        <DayScreen
          meals={dayMeals}
          totalCalories={totalCalories}
          totalProtein={totalProtein}
          onCapture={() => setScreen("capture")}
        />
      ) : null}
      <BottomNav
        screen={screen}
        canReview={Boolean(meal)}
        onChange={setScreen}
      />
    </AppShell>
  );
}

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.root}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <StatusBar style="dark" />
        {children}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CaptureScreen({
  cameraRef,
  permissionGranted,
  requestPermission,
  text,
  setText,
  error,
  pending,
  onCapture,
  onChoosePhoto,
  onSubmitText,
  onRetry,
}: {
  cameraRef: React.RefObject<CameraView | null>;
  permissionGranted: boolean;
  requestPermission: () => Promise<unknown>;
  text: string;
  setText: (value: string) => void;
  error: string | null;
  pending: PendingCapture | null;
  onCapture: () => void;
  onChoosePhoto: () => void;
  onSubmitText: () => void;
  onRetry: () => void;
}) {
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.captureContent}
      keyboardShouldPersistTaps="handled"
    >
      <Header eyebrow="CAPTURE" title="What did you eat?" subtitle={formatDate()} />
      <View style={styles.cameraFrame}>
        {permissionGranted ? (
          <CameraView ref={cameraRef} facing="back" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={styles.cameraFallback}>
            <View style={styles.cameraIconCircle}>
              <Ionicons name="camera-outline" size={28} color={colors.terracotta} />
            </View>
            <Text style={styles.fallbackTitle}>Camera is waiting</Text>
            <Text style={styles.fallbackCopy}>Allow camera access, or choose a plate photo.</Text>
            <Pressable style={styles.smallOutlineButton} onPress={requestPermission}>
              <Text style={styles.smallOutlineButtonText}>Allow camera</Text>
            </Pressable>
          </View>
        )}
        <View style={styles.cameraTopRow}>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE CAMERA</Text>
          </View>
          <Pressable style={styles.cameraLibraryButton} onPress={onChoosePhoto}>
            <Ionicons name="images-outline" size={18} color={colors.ink} />
          </Pressable>
        </View>
        {permissionGranted ? (
          <Pressable style={styles.shutter} onPress={onCapture} accessibilityLabel="Take plate photo">
            <View style={styles.shutterInner} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.orRow}>
        <View style={styles.orLine} />
        <Text style={styles.orText}>OR TELL ME</Text>
        <View style={styles.orLine} />
      </View>
      <View style={styles.textInputWrap}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="e.g. rice, lentil soup, ayran"
          placeholderTextColor={colors.muted}
          style={styles.textInput}
          returnKeyType="send"
          onSubmitEditing={onSubmitText}
        />
        <Pressable
          style={[styles.textSubmit, !text.trim() && styles.textSubmitDisabled]}
          onPress={onSubmitText}
          disabled={!text.trim()}
          accessibilityLabel="Send meal description"
        >
          <Ionicons name="arrow-up" size={20} color={colors.white} />
        </Pressable>
      </View>
      <Text style={styles.demoHint}>
        {isDemoMode ? "Demo mode · try “quick simit” or “ask baked beans”" : "Photo and text use the same meal contract"}
      </Text>

      {pending && !error ? (
        <View style={styles.pendingCard}>
          <View style={styles.pendingIcon}>
            <Ionicons name="cloud-upload-outline" size={18} color={colors.moss} />
          </View>
          <View style={styles.errorTextWrap}>
            <Text style={styles.errorTitle}>Pending capture saved</Text>
            <Text style={styles.errorCopy}>Same idempotency key is ready to retry.</Text>
          </View>
          <Pressable onPress={onRetry} style={styles.resumeButton}>
            <Text style={styles.resumeText}>Resume</Text>
          </Pressable>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorCard}>
          <View style={styles.errorIcon}>
            <Ionicons name="cloud-offline-outline" size={18} color={colors.terracotta} />
          </View>
          <View style={styles.errorTextWrap}>
            <Text style={styles.errorTitle}>Nothing lost</Text>
            <Text style={styles.errorCopy}>{error}</Text>
          </View>
          {pending ? (
            <Pressable onPress={onRetry} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

function AnalysisState({ step }: { step: number }) {
  return (
    <View style={styles.analysisScreen}>
      <View style={styles.analysisMark}>
        <Ionicons name="scan-outline" size={30} color={colors.terracotta} />
      </View>
      <Text style={styles.analysisEyebrow}>MEALOG IS READING</Text>
      <Text style={styles.analysisTitle}>A little patience.
        <Text style={styles.analysisTitleAccent}> Better evidence.</Text>
      </Text>
      <Text style={styles.analysisCopy}>
        Your photo stays in the moment while the pipeline makes its decision.
      </Text>
      <View style={styles.pipelineCard}>
        {ANALYSIS_STEPS.map((label, index) => {
          const active = index === step;
          const done = index < step;
          return (
            <View key={label} style={styles.pipelineRow}>
              <View style={[styles.pipelineDot, active && styles.pipelineDotActive, done && styles.pipelineDotDone]}>
                {done ? <Ionicons name="checkmark" size={13} color={colors.white} /> : null}
              </View>
              <Text style={[styles.pipelineLabel, active && styles.pipelineLabelActive]}>{label}</Text>
              {active ? <ActivityIndicator size="small" color={colors.terracotta} /> : null}
            </View>
          );
        })}
      </View>
      <Text style={styles.analysisFootnote}>No nutrient numbers come from the model.</Text>
    </View>
  );
}

function ReviewScreen({
  meal,
  expandedItem,
  setExpandedItem,
  portionEdits,
  setPortionEdits,
  selectedCandidates,
  onChooseCandidate,
  onSave,
  onBack,
}: {
  meal: MealLog;
  expandedItem: number | null;
  setExpandedItem: (value: number | null) => void;
  portionEdits: Record<number, number>;
  setPortionEdits: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  selectedCandidates: Record<number, string>;
  onChooseCandidate: (index: number, candidate: Candidate) => void;
  onSave: () => void;
  onBack: () => void;
}) {
  const tone = actionTone(meal.action);
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.reviewContent}>
      <Header eyebrow="REVIEW & CORRECT" title="Make it yours." subtitle="One last look before it lands in your day." />
      <View style={[styles.actionBanner, { backgroundColor: tone.backgroundColor }]}>
        <View style={[styles.actionMark, { backgroundColor: tone.color }]}>
          <Ionicons
            name={meal.action === "ask" ? "help" : meal.action === "auto_accept" ? "checkmark" : "eye"}
            size={17}
            color={colors.white}
          />
        </View>
        <View style={styles.actionBannerCopy}>
          <Text style={[styles.actionBannerTitle, { color: tone.color }]}>{actionLabel(meal.action)}</Text>
          <Text style={styles.actionBannerText}>
            {meal.action === "ask" ? meal.question : "The catalogue match is visible and editable."}
          </Text>
        </View>
      </View>

      {meal.items.map((item, index) => {
        const selected = selectedCandidates[index] ?? item.food_id;
        const grams = portionEdits[index] ?? item.grams;
        const hasRange = item.grams_p90 > item.grams_p10;
        return (
          <View key={`${item.query}-${index}`} style={styles.itemCard}>
            <View style={styles.itemTopRow}>
              <View style={styles.itemIndex}><Text style={styles.itemIndexText}>{String(index + 1).padStart(2, "0")}</Text></View>
              <View style={styles.itemNameWrap}>
                <Text style={styles.itemQuery}>{item.query}</Text>
                <Text style={styles.itemMatch}>{item.food_id === "ABSTAIN" ? "Needs a match" : item.candidates.find((candidate) => candidate.food_id === selected)?.name ?? selected}</Text>
              </View>
              <View style={styles.confidencePill}>
                <Text style={styles.confidenceText}>{Math.round(item.confidence * 100)}%</Text>
              </View>
            </View>

            {meal.action === "ask" && meal.question ? (
              <View style={styles.questionCard}>
                <Text style={styles.questionLabel}>ONE QUESTION</Text>
                <Text style={styles.questionText}>{meal.question}</Text>
              </View>
            ) : null}

            <View style={styles.portionHeader}>
              <Text style={styles.sectionLabel}>PORTION</Text>
              <Text style={styles.gramsValue}>{grams ? `${Math.round(grams)} g` : "Not estimated"}</Text>
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
                  onValueChange={(value) => setPortionEdits((current) => ({ ...current, [index]: value }))}
                  accessibilityLabel={`Portion for ${item.query}`}
                />
                <View style={styles.rangeLabels}>
                  <Text style={styles.rangeText}>{Math.round(item.grams_p10)} g likely minimum</Text>
                  <Text style={styles.rangeText}>{Math.round(item.grams_p90)} g upper range</Text>
                </View>
              </>
            ) : (
              <Text style={styles.mutedNote}>Portion waits for your answer.</Text>
            )}

            <Text style={[styles.sectionLabel, { marginTop: 22 }]}>ALTERNATES CONSIDERED</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow}>
              {item.candidates.map((candidate) => {
                const isSelected = selected === candidate.food_id;
                return (
                  <Pressable
                    key={candidate.food_id}
                    onPress={() => onChooseCandidate(index, candidate)}
                    style={[styles.chip, isSelected && styles.chipSelected]}
                  >
                    <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>{candidate.name}</Text>
                    <Text style={[styles.chipScore, isSelected && styles.chipTextSelected]}>{Math.round(candidate.score * 100)}%</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Pressable
              style={styles.whyRow}
              onPress={() => setExpandedItem(expandedItem === index ? null : index)}
            >
              <View style={styles.whyIcon}><Ionicons name="finger-print-outline" size={17} color={colors.moss} /></View>
              <View style={styles.whyCopy}><Text style={styles.whyTitle}>Why this result?</Text><Text style={styles.whySubtitle}>Trace the decision</Text></View>
              <Ionicons name={expandedItem === index ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
            </Pressable>
            {expandedItem === index ? (
              <View style={styles.auditBox}>
                <AuditRow label="Matched food_id" value={selected} mono />
                <AuditRow label="Source database" value={item.source_database ?? "Catalogue provenance"} />
                <AuditRow label="Confidence" value={`${Math.round(item.confidence * 100)}%`} />
                <AuditRow label="Exact grams used" value={grams ? `${Math.round(grams)} g` : "Pending"} />
              </View>
            ) : null}
          </View>
        );
      })}

      <Pressable style={styles.primaryButton} onPress={onSave}>
        <Text style={styles.primaryButtonText}>{meal.action === "ask" ? "Save with question open" : "Save to today"}</Text>
        <Ionicons name="arrow-forward" size={19} color={colors.white} />
      </Pressable>
      <Pressable style={styles.textButton} onPress={onBack}><Text style={styles.textButtonLabel}>Capture another plate</Text></Pressable>
    </ScrollView>
  );
}

function AuditRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <View style={styles.auditRow}>
      <Text style={styles.auditLabel}>{label}</Text>
      <Text style={[styles.auditValue, mono && styles.auditMono]}>{value}</Text>
    </View>
  );
}

function DayScreen({
  meals,
  totalCalories,
  totalProtein,
  onCapture,
}: {
  meals: MealLog[];
  totalCalories: number;
  totalProtein: number;
  onCapture: () => void;
}) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.dayContent}>
      <Header eyebrow="TODAY" title="Your day, in evidence." subtitle={formatDate()} />
      <View style={styles.totalCard}>
        <View>
          <Text style={styles.totalEyebrow}>LOGGED SO FAR</Text>
          <Text style={styles.totalNumber}>{Math.round(totalCalories)}<Text style={styles.totalUnit}> kcal</Text></Text>
        </View>
        <View style={styles.totalSide}>
          <Text style={styles.totalSideNumber}>{Math.round(totalProtein)} g</Text>
          <Text style={styles.totalSideLabel}>protein</Text>
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.sectionLabel}>MEALS</Text>
        <Text style={styles.listCount}>{meals.length} logged</Text>
      </View>
      {meals.map((item, index) => (
        <View style={styles.mealRow} key={item.idempotency_key}>
          <View style={[styles.mealTime, index === 0 && styles.mealTimeCurrent]}>
            <Text style={[styles.mealTimeText, index === 0 && styles.mealTimeTextCurrent]}>{formatTime(item.createdAt)}</Text>
          </View>
          <View style={styles.mealRowBody}>
            <Text style={styles.mealTitle}>{item.items[0]?.candidates.find((candidate) => candidate.food_id === item.items[0]?.food_id)?.name ?? item.items[0]?.query ?? "Meal"}</Text>
            <Text style={styles.mealMeta}>{item.items.length} item{item.items.length === 1 ? "" : "s"} · {actionLabel(item.action)}</Text>
          </View>
          <Text style={styles.mealKcal}>{Math.round(item.totals.kcal)} kcal</Text>
        </View>
      ))}

      <View style={styles.dayNote}>
        <Ionicons name="sparkles-outline" size={18} color={colors.terracotta} />
        <Text style={styles.dayNoteText}>Every match stays traceable. Tap Review to inspect the catalogue decision.</Text>
      </View>
      <Pressable style={styles.primaryButton} onPress={onCapture}>
        <Ionicons name="camera-outline" size={19} color={colors.white} />
        <Text style={styles.primaryButtonText}>Capture next meal</Text>
      </Pressable>
    </ScrollView>
  );
}

function Header({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <View style={styles.header}>
      <View style={styles.brandRow}>
        <Text style={styles.brand}>mealog</Text>
        <View style={styles.brandDot} />
        <Text style={styles.eyebrow}>{eyebrow}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

function Banner({ message }: { message: string }) {
  return (
    <View style={styles.banner}>
      <Ionicons name="checkmark-circle" size={19} color={colors.moss} />
      <Text style={styles.bannerText}>{message}</Text>
    </View>
  );
}

function BottomNav({ screen, canReview, onChange }: { screen: Screen; canReview: boolean; onChange: (screen: Screen) => void }) {
  return (
    <View style={styles.nav}>
      <NavItem icon="camera-outline" label="Capture" active={screen === "capture"} onPress={() => onChange("capture")} />
      <NavItem icon="checkmark-circle-outline" label="Review" active={screen === "review"} disabled={!canReview} onPress={() => onChange("review")} />
      <NavItem icon="calendar-outline" label="Day" active={screen === "day"} onPress={() => onChange("day")} />
    </View>
  );
}

function NavItem({ icon, label, active, disabled, onPress }: { icon: keyof typeof Ionicons.glyphMap; label: string; active: boolean; disabled?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} disabled={disabled} style={styles.navItem}>
      <Ionicons name={icon} size={21} color={disabled ? colors.line : active ? colors.terracotta : colors.muted} />
      <Text style={[styles.navLabel, active && styles.navLabelActive, disabled && styles.navLabelDisabled]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.paper },
  screen: { flex: 1 },
  captureContent: { padding: 22, paddingBottom: 32 },
  reviewContent: { padding: 22, paddingBottom: 34 },
  dayContent: { padding: 22, paddingBottom: 34 },
  header: { paddingTop: 14, paddingBottom: 22 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
  brand: { color: colors.ink, fontSize: 19, fontWeight: "800", letterSpacing: -0.8 },
  brandDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.terracotta },
  eyebrow: { color: colors.muted, fontSize: 10, fontWeight: "800", letterSpacing: 1.6 },
  title: { color: colors.ink, fontSize: 32, lineHeight: 36, fontWeight: "800", letterSpacing: -1.2 },
  subtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, marginTop: 7 },
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
  errorCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.terracottaSoft, borderRadius: 18, padding: 13, marginTop: 19, gap: 10 },
  pendingCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.mossSoft, borderRadius: 18, padding: 13, marginTop: 19, gap: 10 },
  errorIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  pendingIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.card, alignItems: "center", justifyContent: "center" },
  errorTextWrap: { flex: 1 },
  errorTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  errorCopy: { color: colors.muted, fontSize: 11, lineHeight: 15, marginTop: 2 },
  retryButton: { backgroundColor: colors.terracotta, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 9 },
  retryText: { color: colors.white, fontSize: 11, fontWeight: "800" },
  resumeButton: { backgroundColor: colors.moss, borderRadius: 13, paddingHorizontal: 11, paddingVertical: 9 },
  resumeText: { color: colors.white, fontSize: 11, fontWeight: "800" },
  analysisScreen: { flex: 1, padding: 28, justifyContent: "center" },
  analysisMark: { width: 64, height: 64, borderRadius: 22, backgroundColor: colors.terracottaSoft, alignItems: "center", justifyContent: "center", marginBottom: 26 },
  analysisEyebrow: { color: colors.terracotta, fontSize: 10, fontWeight: "800", letterSpacing: 1.7 },
  analysisTitle: { color: colors.ink, fontSize: 34, lineHeight: 39, fontWeight: "800", letterSpacing: -1.2, marginTop: 12 },
  analysisTitleAccent: { color: colors.terracotta },
  analysisCopy: { color: colors.muted, fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 310 },
  pipelineCard: { backgroundColor: colors.card, borderRadius: 22, padding: 19, marginTop: 34, borderWidth: 1, borderColor: colors.line },
  pipelineRow: { minHeight: 43, flexDirection: "row", alignItems: "center", gap: 12 },
  pipelineDot: { width: 23, height: 23, borderRadius: 12, borderWidth: 1.5, borderColor: colors.line, alignItems: "center", justifyContent: "center" },
  pipelineDotActive: { borderColor: colors.terracotta, backgroundColor: colors.terracottaSoft },
  pipelineDotDone: { borderColor: colors.moss, backgroundColor: colors.moss },
  pipelineLabel: { flex: 1, color: colors.muted, fontSize: 14 },
  pipelineLabelActive: { color: colors.ink, fontWeight: "800" },
  analysisFootnote: { color: colors.muted, fontSize: 11, marginTop: 17 },
  banner: { position: "absolute", zIndex: 10, top: 52, left: 22, right: 22, flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.mossSoft, borderRadius: 15, padding: 12 },
  bannerText: { color: colors.moss, fontSize: 12, fontWeight: "800" },
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
  confidencePill: { backgroundColor: colors.mossSoft, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6 },
  confidenceText: { color: colors.moss, fontSize: 11, fontWeight: "800" },
  questionCard: { backgroundColor: "#FBF1D8", borderRadius: 15, padding: 13, marginTop: 17 },
  questionLabel: { color: "#8D641C", fontSize: 9, fontWeight: "800", letterSpacing: 1.3 },
  questionText: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: "700", marginTop: 5 },
  portionHeader: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between", marginTop: 22 },
  sectionLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: 1.4 },
  gramsValue: { color: colors.terracotta, fontSize: 18, fontWeight: "800" },
  rangeLabels: { flexDirection: "row", justifyContent: "space-between", marginTop: -2 },
  rangeText: { color: colors.muted, fontSize: 10 },
  mutedNote: { color: colors.muted, fontSize: 12, marginTop: 13 },
  chipsRow: { gap: 8, paddingTop: 11, paddingBottom: 2 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 14, paddingHorizontal: 11, paddingVertical: 8, minWidth: 100 },
  chipSelected: { backgroundColor: colors.terracotta, borderColor: colors.terracotta },
  chipText: { color: colors.ink, fontSize: 11, fontWeight: "700" },
  chipTextSelected: { color: colors.white },
  chipScore: { color: colors.muted, fontSize: 10, marginTop: 3 },
  whyRow: { flexDirection: "row", alignItems: "center", marginTop: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: colors.line },
  whyIcon: { width: 32, height: 32, borderRadius: 12, backgroundColor: colors.mossSoft, alignItems: "center", justifyContent: "center" },
  whyCopy: { flex: 1, marginLeft: 10 },
  whyTitle: { color: colors.ink, fontSize: 13, fontWeight: "800" },
  whySubtitle: { color: colors.muted, fontSize: 11, marginTop: 2 },
  auditBox: { backgroundColor: colors.paper, borderRadius: 15, padding: 12, marginTop: 12, gap: 9 },
  auditRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  auditLabel: { color: colors.muted, fontSize: 11 },
  auditValue: { color: colors.ink, fontSize: 11, fontWeight: "700", textAlign: "right", flexShrink: 1 },
  auditMono: { fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }) },
  primaryButton: { minHeight: 54, borderRadius: 18, backgroundColor: colors.terracotta, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 10, paddingHorizontal: 18, marginTop: 8 },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: "800" },
  textButton: { alignItems: "center", paddingVertical: 16 },
  textButtonLabel: { color: colors.muted, fontSize: 12, fontWeight: "700" },
  totalCard: { backgroundColor: colors.ink, borderRadius: 25, padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  totalEyebrow: { color: "#AAB5A7", fontSize: 9, letterSpacing: 1.4, fontWeight: "800" },
  totalNumber: { color: colors.white, fontSize: 43, fontWeight: "800", letterSpacing: -1.7, marginTop: 6 },
  totalUnit: { color: "#AAB5A7", fontSize: 17, letterSpacing: 0, fontWeight: "600" },
  totalSide: { alignItems: "flex-end", paddingBottom: 5 },
  totalSideNumber: { color: "#E7C57C", fontSize: 18, fontWeight: "800" },
  totalSideLabel: { color: "#AAB5A7", fontSize: 11, marginTop: 2 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 27, marginBottom: 10 },
  listCount: { color: colors.muted, fontSize: 11 },
  mealRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.line, paddingVertical: 15 },
  mealTime: { width: 58 },
  mealTimeCurrent: { borderLeftWidth: 3, borderLeftColor: colors.terracotta, paddingLeft: 8 },
  mealTimeText: { color: colors.muted, fontSize: 11 },
  mealTimeTextCurrent: { color: colors.terracotta, fontWeight: "800" },
  mealRowBody: { flex: 1, paddingRight: 8 },
  mealTitle: { color: colors.ink, fontSize: 14, fontWeight: "800" },
  mealMeta: { color: colors.muted, fontSize: 11, marginTop: 4 },
  mealKcal: { color: colors.ink, fontSize: 12, fontWeight: "800" },
  dayNote: { flexDirection: "row", gap: 9, backgroundColor: colors.terracottaSoft, borderRadius: 17, padding: 13, marginTop: 21 },
  dayNoteText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 16 },
  nav: { flexDirection: "row", justifyContent: "space-around", borderTopWidth: 1, borderTopColor: colors.line, backgroundColor: colors.card, paddingTop: 9, paddingBottom: Platform.OS === "ios" ? 23 : 12 },
  navItem: { alignItems: "center", gap: 4, minWidth: 78 },
  navLabel: { color: colors.muted, fontSize: 10, fontWeight: "700" },
  navLabelActive: { color: colors.terracotta },
  navLabelDisabled: { color: colors.line },
});
