export type Locale = "tr" | "en";

export type StringKey =
  | "brand"
  | "captureEyebrow"
  | "captureTitle"
  | "cameraWaiting"
  | "cameraPermission"
  | "allowCamera"
  | "liveCamera"
  | "takePlatePhoto"
  | "choosePhoto"
  | "tellMe"
  | "mealPlaceholder"
  | "sendMealDescription"
  | "demoHint"
  | "liveContractHint"
  | "pendingCaptureTitle"
  | "pendingCaptureCopy"
  | "resume"
  | "nothingLost"
  | "retry"
  | "reviewEyebrow"
  | "reviewTitle"
  | "reviewSubtitle"
  | "actionAutoAccept"
  | "actionReview"
  | "actionAsk"
  | "editableMatch"
  | "needsMatch"
  | "oneQuestion"
  | "portion"
  | "notEstimated"
  | "portionBand"
  | "portionFor"
  | "portionLow"
  | "portionHigh"
  | "portionPending"
  | "alternates"
  | "whyResult"
  | "traceDecision"
  | "matchedFoodId"
  | "sourceDatabase"
  | "catalogueProvenance"
  | "confidence"
  | "exactGrams"
  | "pending"
  | "saveQuestion"
  | "saveToday"
  | "captureAnother"
  | "dayEyebrow"
  | "dayTitle"
  | "loggedSoFar"
  | "protein"
  | "meals"
  | "loggedCount"
  | "itemCount"
  | "mealFallback"
  | "dayNote"
  | "captureNext"
  | "analysisEyebrow"
  | "analysisTitle"
  | "analysisTitleAccent"
  | "analysisCopy"
  | "analysisStepReading"
  | "analysisStepMatching"
  | "analysisStepPortion"
  | "analysisFootnote"
  | "navCapture"
  | "navReview"
  | "navDay"
  | "apiUrlMissing"
  | "uploadFailed"
  | "draftSafe"
  | "cameraCaptureFailed"
  | "mealAdded"
  | "savedQuestionOpen";

type Dictionary = Record<StringKey, string>;
type Values = Record<string, number | string>;

export const tr: Dictionary = {
  brand: "mealog",
  captureEyebrow: "ÖĞÜN EKLE",
  captureTitle: "Ne yedin?",
  cameraWaiting: "Kamera hazır",
  cameraPermission: "Kamera erişimine izin ver veya tabak fotoğrafı seç.",
  allowCamera: "Kameraya izin ver",
  liveCamera: "CANLI KAMERA",
  takePlatePhoto: "Tabak fotoğrafı çek",
  choosePhoto: "Galeriden tabak fotoğrafı seç",
  tellMe: "YA DA ANLAT",
  mealPlaceholder: "örn. yediğiniz yemeği yazın",
  sendMealDescription: "Öğün açıklamasını gönder",
  demoHint: "Demo modu · Bir öğün yazarak deneyin",
  liveContractHint: "Fotoğraf ve metin aynı öğün akışını kullanır",
  pendingCaptureTitle: "Bekleyen kayıt kaydedildi",
  pendingCaptureCopy: "Aynı anahtarla yeniden deneyebilirsiniz.",
  resume: "Devam et",
  nothingLost: "Hiçbir şey kaybolmadı",
  retry: "Tekrar dene",
  reviewEyebrow: "KONTROL ET VE DÜZELT",
  reviewTitle: "Kontrol sende.",
  reviewSubtitle: "Gününe eklemeden önce son bir kez bak.",
  actionAutoAccept: "Kaydedildi",
  actionReview: "Kontrol et",
  actionAsk: "Emin değilim, sen söyle",
  editableMatch: "Katalog eşleşmesi burada; dilediğin gibi düzenleyebilirsin.",
  needsMatch: "Eşleşme gerekli",
  oneQuestion: "TEK SORU",
  portion: "PORSİYON",
  notEstimated: "Tahmin edilemedi",
  portionBand: "yaklaşık {grams} g ({low}-{high} g)",
  portionFor: "{query} porsiyonu",
  portionLow: "{grams} g alt sınır",
  portionHigh: "{grams} g üst sınır",
  portionPending: "Porsiyon, yanıtını bekliyor.",
  alternates: "DEĞERLENDİRİLEN ALTERNATİFLER",
  whyResult: "Nasıl bulundu?",
  traceDecision: "Kararı incele",
  matchedFoodId: "Eşleşen food_id",
  sourceDatabase: "Kaynak veritabanı",
  catalogueProvenance: "Katalog kaynağı",
  confidence: "Güven",
  exactGrams: "Kullanılan gram",
  pending: "Bekleniyor",
  saveQuestion: "Soruyu açık bırakarak kaydet",
  saveToday: "Bugüne kaydet",
  captureAnother: "Başka bir tabak çek",
  dayEyebrow: "BUGÜN",
  dayTitle: "Bugün ne yediğini gör.",
  loggedSoFar: "ŞİMDİYE KADAR",
  protein: "protein",
  meals: "ÖĞÜNLER",
  loggedCount: "{count} kayıt",
  itemCount: "{count} öğe",
  mealFallback: "Öğün",
  dayNote: "Her eşleşme izlenebilir. Katalog kararını incelemek için Kontrol et'e dokunabilirsin.",
  captureNext: "Sonraki öğünü ekle",
  analysisEyebrow: "TABAK OKUNUYOR",
  analysisTitle: "Biraz sabır.",
  analysisTitleAccent: " Daha iyi kanıt.",
  analysisCopy: "Fotoğrafın işleniyor; öğünün için kanıt oluşturuluyor.",
  analysisStepReading: "Tabak okunuyor",
  analysisStepMatching: "Katalogda eşleşme aranıyor",
  analysisStepPortion: "Porsiyon tahmin ediliyor",
  analysisFootnote: "Besin değerlerini model hesaplamaz.",
  navCapture: "Ekle",
  navReview: "Kontrol et",
  navDay: "Gün",
  apiUrlMissing: "Sunucu adresi eksik.",
  uploadFailed: "Yükleme başarısız.",
  draftSafe: "Taslağın güvende.",
  cameraCaptureFailed: "Bu tabağın fotoğrafı çekilemedi. Metin alanını deneyin.",
  mealAdded: "Öğün bugüne eklendi",
  savedQuestionOpen: "Soru açık bırakılarak kaydedildi",
};

export const en: Dictionary = {
  brand: "mealog",
  captureEyebrow: "CAPTURE",
  captureTitle: "What did you eat?",
  cameraWaiting: "Camera is waiting",
  cameraPermission: "Allow camera access, or choose a plate photo.",
  allowCamera: "Allow camera",
  liveCamera: "LIVE CAMERA",
  takePlatePhoto: "Take plate photo",
  choosePhoto: "Choose a plate photo from your library",
  tellMe: "OR TELL ME",
  mealPlaceholder: "e.g. describe what you ate",
  sendMealDescription: "Send meal description",
  demoHint: "Demo mode · try “quick simit” or “ask baked beans”",
  liveContractHint: "Photo and text use the same meal contract",
  pendingCaptureTitle: "Pending capture saved",
  pendingCaptureCopy: "The same key is ready to retry.",
  resume: "Resume",
  nothingLost: "Nothing lost",
  retry: "Retry",
  reviewEyebrow: "REVIEW & CORRECT",
  reviewTitle: "Make it yours.",
  reviewSubtitle: "One last look before it lands in your day.",
  actionAutoAccept: "Saved",
  actionReview: "Review",
  actionAsk: "I am not sure, you tell me",
  editableMatch: "The catalogue match is visible and editable.",
  needsMatch: "Needs a match",
  oneQuestion: "ONE QUESTION",
  portion: "PORTION",
  notEstimated: "Not estimated",
  portionBand: "about {grams} g ({low}-{high} g)",
  portionFor: "Portion for {query}",
  portionLow: "{grams} g likely minimum",
  portionHigh: "{grams} g upper range",
  portionPending: "Portion waits for your answer.",
  alternates: "ALTERNATES CONSIDERED",
  whyResult: "Why this result?",
  traceDecision: "Trace the decision",
  matchedFoodId: "Matched food_id",
  sourceDatabase: "Source database",
  catalogueProvenance: "Catalogue provenance",
  confidence: "Confidence",
  exactGrams: "Exact grams used",
  pending: "Pending",
  saveQuestion: "Save with question open",
  saveToday: "Save to today",
  captureAnother: "Capture another plate",
  dayEyebrow: "TODAY",
  dayTitle: "Your day, in evidence.",
  loggedSoFar: "LOGGED SO FAR",
  protein: "protein",
  meals: "MEALS",
  loggedCount: "{count} logged",
  itemCount: "{count} item{plural}",
  mealFallback: "Meal",
  dayNote: "Every match stays traceable. Tap Review to inspect the catalogue decision.",
  captureNext: "Capture next meal",
  analysisEyebrow: "MEALOG IS READING",
  analysisTitle: "A little patience.",
  analysisTitleAccent: " Better evidence.",
  analysisCopy: "Your photo stays in the moment while the pipeline makes its decision.",
  analysisStepReading: "Reading the plate",
  analysisStepMatching: "Matching to the catalogue",
  analysisStepPortion: "Estimating portion",
  analysisFootnote: "No nutrient numbers come from the model.",
  navCapture: "Capture",
  navReview: "Review",
  navDay: "Day",
  apiUrlMissing: "The server address is missing.",
  uploadFailed: "Upload failed.",
  draftSafe: "Your draft is safe.",
  cameraCaptureFailed: "The camera could not capture this plate. Try the text input instead.",
  mealAdded: "Meal added to today",
  savedQuestionOpen: "Saved with question open",
};

const dictionaries: Record<Locale, Dictionary> = { tr, en };
export const DEFAULT_LOCALE: Locale = "tr";

export function t(key: StringKey, values: Values = {}, locale: Locale = DEFAULT_LOCALE): string {
  return dictionaries[locale][key].replace(/\{(\w+)\}/g, (placeholder, name: string) => String(values[name] ?? placeholder));
}
