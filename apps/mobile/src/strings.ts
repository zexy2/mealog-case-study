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
  | "demoPanelTitle"
  | "demoLoadingNote"
  | "demoReview"
  | "demoAbstain"
  | "demoError"
  | "demoEmpty"
  | "liveContractHint"
  | "pendingCaptureTitle"
  | "pendingCaptureCopy"
  | "resume"
  | "nothingLost"
  | "retry"
  | "errorEyebrow"
  | "errorTitle"
  | "demoProviderError"
  | "reviewEyebrow"
  | "reviewTitle"
  | "reviewSubtitle"
  | "actionAutoAccept"
  | "actionReview"
  | "actionAsk"
  | "editableMatch"
  | "needsMatch"
  | "oneQuestion"
  | "questionPick"
  | "questionConfirm"
  | "abstainEyebrow"
  | "abstainTitle"
  | "abstainCopy"
  | "abstainObserved"
  | "abstainCandidates"
  | "abstainCode"
  | "abstainNoCandidates"
  | "chooseManually"
  | "retakePhoto"
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
  | "emptyEyebrow"
  | "emptyTitle"
  | "emptyCopy"
  | "emptyAction"
  | "analysisEyebrow"
  | "analysisTitle"
  | "analysisTitleAccent"
  | "analysisCopy"
  | "analysisStepReading"
  | "analysisStepMatching"
  | "analysisStepPortion"
  | "analysisFootnote"
  | "degradedTitle"
  | "degradedCopy"
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
  demoHint: "Demo modu · Aşağıdaki örneklerle dört durumu deneyin",
  demoPanelTitle: "DEMO AKIŞLARI",
  demoLoadingNote: "Her akış önce yükleniyor durumunu gösterir.",
  demoReview: "Kontrol ekranı",
  demoAbstain: "Emin değilim",
  demoError: "Hata ve tekrar dene",
  demoEmpty: "Boş günü göster",
  liveContractHint: "Fotoğraf ve metin aynı öğün akışını kullanır",
  pendingCaptureTitle: "Bekleyen kayıt kaydedildi",
  pendingCaptureCopy: "Aynı anahtarla yeniden deneyebilirsiniz.",
  resume: "Devam et",
  nothingLost: "Hiçbir şey kaybolmadı",
  retry: "Tekrar dene",
  errorEyebrow: "AKIŞ DURDU",
  errorTitle: "Bir sorun çıktı.",
  demoProviderError: "Sağlayıcı yanıt vermedi. Taslağın güvende.",
  reviewEyebrow: "KONTROL ET VE DÜZELT",
  reviewTitle: "Kontrol sende.",
  reviewSubtitle: "Gününe eklemeden önce son bir kez bak.",
  actionAutoAccept: "Kaydedildi",
  actionReview: "Kontrol et",
  actionAsk: "Emin değilim, sen söyle",
  editableMatch: "Katalog eşleşmesi burada; dilediğin gibi düzenleyebilirsin.",
  needsMatch: "Eşleşme gerekli",
  oneQuestion: "TEK SORU",
  questionPick: "Bu öğün için aşağıdan bir eşleşme seç.",
  questionConfirm: "{food} doğru mu? Değilse aşağıdan seç.",
  abstainEyebrow: "GÜVENLİ EŞLEŞME YOK",
  abstainTitle: "Bu öğünü güvenle tanımlayamadık.",
  abstainCopy: "Katalogda yeterli kanıt yok. Yakın bir tahmin seçmek yerine senden yardım istiyoruz.",
  abstainObserved: "GÖRÜLEN",
  abstainCandidates: "YAKIN ADAYLAR · HİÇBİRİ KABUL EDİLMEDİ",
  abstainCode: "ABSTAIN · TAHMİN YOK",
  abstainNoCandidates: "Bu öğün için aday bulunamadı.",
  chooseManually: "Katalogdan kendim seç",
  retakePhoto: "Fotoğrafı yeniden çek",
  portion: "PORSİYON",
  notEstimated: "Tahmin edilemedi",
  portionBand: "yaklaşık {grams} g ({low}–{high} g)",
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
  emptyEyebrow: "BUGÜN SESSİZ",
  emptyTitle: "Henüz bir öğün yok.",
  emptyCopy: "İlk tabağını ekle; günün kanıtı burada birikmeye başlasın.",
  emptyAction: "İlk öğünü ekle",
  analysisEyebrow: "TABAK OKUNUYOR",
  analysisTitle: "Biraz sabır.",
  analysisTitleAccent: " Daha iyi kanıt.",
  analysisCopy: "Fotoğrafın işleniyor; öğünün için kanıt oluşturuluyor.",
  analysisStepReading: "Tabak okunuyor",
  analysisStepMatching: "Katalogda eşleşme aranıyor",
  analysisStepPortion: "Porsiyon tahmin ediliyor",
  analysisFootnote: "Besin değerlerini model hesaplamaz.",
  degradedTitle: "Yanıt zayıf kanıtla geldi",
  degradedCopy: "Sağlayıcı geri dönüşü kullanıldı. Kaydetmeden önce sonucu kontrol et.",
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
  demoHint: "Demo mode · use the examples below to visit each state",
  demoPanelTitle: "DEMO FLOWS",
  demoLoadingNote: "Every flow shows the loading state first.",
  demoReview: "Review state",
  demoAbstain: "I am not sure",
  demoError: "Error and retry",
  demoEmpty: "Show empty day",
  liveContractHint: "Photo and text use the same meal contract",
  pendingCaptureTitle: "Pending capture saved",
  pendingCaptureCopy: "The same key is ready to retry.",
  resume: "Resume",
  nothingLost: "Nothing lost",
  retry: "Retry",
  errorEyebrow: "FLOW PAUSED",
  errorTitle: "Something went wrong.",
  demoProviderError: "The provider did not respond. Your draft is safe.",
  reviewEyebrow: "REVIEW & CORRECT",
  reviewTitle: "Make it yours.",
  reviewSubtitle: "One last look before it lands in your day.",
  actionAutoAccept: "Saved",
  actionReview: "Review",
  actionAsk: "I am not sure, you tell me",
  editableMatch: "The catalogue match is visible and editable.",
  needsMatch: "Needs a match",
  oneQuestion: "ONE QUESTION",
  questionPick: "Choose the closest match for this meal below.",
  questionConfirm: "Is {food} correct? If not, choose below.",
  abstainEyebrow: "NO SAFE MATCH",
  abstainTitle: "We could not identify this meal safely.",
  abstainCopy: "The catalogue does not contain enough evidence. We ask you instead of presenting a nearby guess.",
  abstainObserved: "OBSERVED",
  abstainCandidates: "NEARBY CANDIDATES · NONE ACCEPTED",
  abstainCode: "ABSTAIN · NO GUESS",
  abstainNoCandidates: "No candidates were found for this meal.",
  chooseManually: "Choose from the catalogue",
  retakePhoto: "Retake the photo",
  portion: "PORTION",
  notEstimated: "Not estimated",
  portionBand: "about {grams} g ({low}–{high} g)",
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
  emptyEyebrow: "A QUIET DAY",
  emptyTitle: "No meals yet.",
  emptyCopy: "Capture your first plate and let today's evidence start here.",
  emptyAction: "Capture first meal",
  analysisEyebrow: "MEALOG IS READING",
  analysisTitle: "A little patience.",
  analysisTitleAccent: " Better evidence.",
  analysisCopy: "Your photo stays in the moment while the pipeline makes its decision.",
  analysisStepReading: "Reading the plate",
  analysisStepMatching: "Matching to the catalogue",
  analysisStepPortion: "Estimating portion",
  analysisFootnote: "No nutrient numbers come from the model.",
  degradedTitle: "Response arrived with weak evidence",
  degradedCopy: "A provider fallback was used. Review this result before saving it.",
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

type QuestionItem = {
  food_id: string;
  candidates: Array<{ food_id: string; name: string }>;
};

export function questionText(item?: QuestionItem): string {
  const match = item?.candidates.find((candidate) => candidate.food_id === item.food_id);
  return match ? t("questionConfirm", { food: match.name }) : t("questionPick");
}
