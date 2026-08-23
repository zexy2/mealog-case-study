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
  | "demoAutoAccept"
  | "demoReview"
  | "demoAbstain"
  | "demoDegraded"
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
  | "captureMedium"
  | "captureMediumScreen"
  | "captureMediumPrinted"
  | "captureMediumToy"
  | "captureMediumUnclear"
  | "savedReviewTitle"
  | "savedReviewSubtitle"
  | "actionAutoAccept"
  | "actionReview"
  | "actionAsk"
  | "editableMatch"
  | "needsMatch"
  | "oneQuestion"
  | "questionPick"
  | "questionConfirm"
  | "clarifyCount"
  | "clarifyIdentity"
  | "clarifyPortion"
  | "countChoice"
  | "clarifyNotSure"
  | "abstainEyebrow"
  | "abstainTitle"
  | "abstainCopy"
  | "abstainObserved"
  | "abstainCandidates"
  | "abstainCode"
  | "abstainNoCandidates"
  | "describeMeal"
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
  | "portionSource"
  | "portionProvenance"
  | "confidence"
  | "exactGrams"
  | "quantity"
  | "quantityUnknown"
  | "quantityValue"
  | "itemWithQuantity"
  | "itemUnknownQuantity"
  | "pending"
  | "saveQuestion"
  | "saveToday"
  | "saveCorrection"
  | "captureAnother"
  | "dayEyebrow"
  | "dayTitle"
  | "loggedSoFar"
  | "dayPortionRange"
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
  | "providerUnavailable"
  | "draftSafe"
  | "cameraCaptureFailed"
  | "mealAdded"
  | "mealUpdated"
  | "mealUndone"
  | "undoMeal"
  | "undoMealAccessibility"
  | "mealRemoved"
  | "removeMealTitle"
  | "removeMealCopy"
  | "removeMealConfirm"
  | "removeMealAccessibility"
  | "cancel"
  | "savedQuestionOpen"
  | "saving"
  | "correctionNeedsServer"
  | "correctionFailed";

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
  demoHint: "Demo modu · Aşağıdaki akışlarla tüm durumları deneyin",
  demoPanelTitle: "DEMO AKIŞLARI",
  demoLoadingNote: "Her akış önce yükleniyor durumunu gösterir.",
  demoAutoAccept: "Otomatik kaydetme",
  demoReview: "Kontrol ekranı",
  demoAbstain: "Emin değilim",
  demoDegraded: "Zayıf kanıtla kontrol",
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
  reviewTitle: "Gününe eklemeden önce bak.",
  reviewSubtitle: "Sonucu incele; kaydetmeden önce karar sende.",
  captureMedium: "FOTOĞRAF ORTAMI",
  captureMediumScreen: "Bu görüntü bir ekranda gösterilen yemeğe benziyor. Gerçek öğünün doğrudan fotoğrafını yükleyin.",
  captureMediumPrinted: "Bu görüntü basılı bir yemek görseline benziyor. Gerçek öğünün doğrudan fotoğrafını yükleyin.",
  captureMediumToy: "Bu görüntü gerçek yemek yerine oyuncak veya modele benziyor. Gerçek öğünün doğrudan fotoğrafını yükleyin.",
  captureMediumUnclear: "Görüntünün gerçek bir öğün fotoğrafı olduğunu doğrulayamadık. Daha net bir yemek fotoğrafı yükleyin.",
  savedReviewTitle: "Günündeki kaydı incele.",
  savedReviewSubtitle: "Düzeltmelerini sunucuya göndererek kaydı güncelle.",
  actionAutoAccept: "Kaydedildi",
  actionReview: "Kontrol et",
  actionAsk: "Emin değilim, sen söyle",
  editableMatch: "Katalog eşleşmesi burada; dilediğin gibi düzenleyebilirsin.",
  needsMatch: "Eşleşme gerekli",
  oneQuestion: "TEK SORU",
  questionPick: "Bu öğün için aşağıdan bir eşleşme seç.",
  questionConfirm: "{food} doğru mu? Değilse aşağıdan seç.",
  clarifyCount: "Kaç {unit} {food} vardı?",
  clarifyIdentity: "Bu öğe {food} mu? Aşağıdan doğru eşleşmeyi seç.",
  clarifyPortion: "Porsiyonunu mevcut aralıkta doğrula: {low}–{high} g.",
  countChoice: "{count} {unit}",
  clarifyNotSure: "Emin değilim",
  abstainEyebrow: "GÜVENLİ EŞLEŞME YOK",
  abstainTitle: "Tanıyamadım.",
  abstainCopy: "Bu yiyecek kataloğumuzun dışında olabilir. Yakın bir tahminle kaydetmek yerine senden tarif etmeni istiyoruz.",
  abstainObserved: "GÖRÜLEN",
  abstainCandidates: "YAKIN ADAYLAR · HİÇBİRİ KABUL EDİLMEDİ",
  abstainCode: "ABSTAIN · TAHMİN YOK",
  abstainNoCandidates: "Bu öğün için aday bulunamadı.",
  describeMeal: "Yemeği kendim yazacağım",
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
  portionSource: "Porsiyon kaynağı",
  portionProvenance: "Porsiyon kanıtı",
  confidence: "Güven",
  exactGrams: "Kullanılan gram",
  quantity: "MİKTAR",
  quantityUnknown: "Miktar bilinmiyor · kontrol et",
  quantityValue: "Miktar: {quantity}{unit}",
  itemWithQuantity: "{quantity}{unit} {name}",
  itemUnknownQuantity: "{name} · miktar bilinmiyor",
  pending: "Bekleniyor",
  saveQuestion: "Soruyu açık bırakarak kaydet",
  saveToday: "Bugüne kaydet",
  saveCorrection: "Düzeltmeyi kaydet",
  captureAnother: "Başka bir tabak çek",
  dayEyebrow: "BUGÜN",
  dayTitle: "Bugün ne yediğini gör.",
  loggedSoFar: "ŞİMDİYE KADAR",
  dayPortionRange: "Porsiyon toplamı: yaklaşık {midpoint} g ({low}–{high} g)",
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
  providerUnavailable: "Sağlayıcıya ulaşılamadı",
  draftSafe: "Taslağın güvende.",
  cameraCaptureFailed: "Bu tabağın fotoğrafı çekilemedi. Metin alanını deneyin.",
  mealAdded: "Öğün bugüne eklendi",
  mealUpdated: "Öğün kaydı güncellendi",
  mealUndone: "Otomatik kayıt geri alındı",
  undoMeal: "Geri al",
  undoMealAccessibility: "Otomatik kaydı geri al",
  mealRemoved: "Öğün bugünden kaldırıldı",
  removeMealTitle: "Kaydı kaldır?",
  removeMealCopy: "Bu öğünü bugünden kaldırmak istediğine emin misin?",
  removeMealConfirm: "Kaldır",
  removeMealAccessibility: "Bu öğünü bugünden kaldır",
  cancel: "Vazgeç",
  savedQuestionOpen: "Soru açık bırakılarak kaydedildi",
  saving: "Sunucu düzeltiyor…",
  correctionNeedsServer: "Düzeltmeyi kaydetmek için sunucu bağlantısı gerekli.",
  correctionFailed: "Düzeltme kaydedilemedi.",
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
  demoAutoAccept: "Auto-save",
  demoReview: "Review state",
  demoAbstain: "I am not sure",
  demoDegraded: "Review weak evidence",
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
  reviewTitle: "Review before it reaches your day.",
  reviewSubtitle: "Inspect the result; you decide before saving.",
  captureMedium: "CAPTURE MEDIUM",
  captureMediumScreen: "This image appears to show food on a screen. Upload a direct photo of the real meal.",
  captureMediumPrinted: "This image appears to be printed food imagery. Upload a direct photo of the real meal.",
  captureMediumToy: "This image may show a toy or model rather than real food. Upload a direct photo of the real meal.",
  captureMediumUnclear: "I could not confirm this is a direct photo of a real meal. Upload a clearer meal photo.",
  savedReviewTitle: "Review the saved record.",
  savedReviewSubtitle: "Send corrections to the server to update this record.",
  actionAutoAccept: "Saved",
  actionReview: "Review",
  actionAsk: "I am not sure, you tell me",
  editableMatch: "The catalogue match is visible and editable.",
  needsMatch: "Needs a match",
  oneQuestion: "ONE QUESTION",
  questionPick: "Choose the closest match for this meal below.",
  questionConfirm: "Is {food} correct? If not, choose below.",
  clarifyCount: "How many {unit} {food} were there?",
  clarifyIdentity: "Is this {food}? Choose the correct match below.",
  clarifyPortion: "Confirm the portion within the current range: {low}–{high} g.",
  countChoice: "{count} {unit}",
  clarifyNotSure: "I am not sure",
  abstainEyebrow: "NO SAFE MATCH",
  abstainTitle: "I could not identify it.",
  abstainCopy: "This food may be outside our catalogue. Instead of saving a nearby guess, tell us what it was.",
  abstainObserved: "OBSERVED",
  abstainCandidates: "NEARBY CANDIDATES · NONE ACCEPTED",
  abstainCode: "ABSTAIN · NO GUESS",
  abstainNoCandidates: "No candidates were found for this meal.",
  describeMeal: "I will describe the meal",
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
  portionSource: "Portion source",
  portionProvenance: "Portion evidence",
  confidence: "Confidence",
  exactGrams: "Exact grams used",
  quantity: "QUANTITY",
  quantityUnknown: "Quantity unknown · review",
  quantityValue: "Quantity: {quantity}{unit}",
  itemWithQuantity: "{quantity}{unit} {name}",
  itemUnknownQuantity: "{name} · quantity unknown",
  pending: "Pending",
  saveQuestion: "Save with question open",
  saveToday: "Save to today",
  saveCorrection: "Save correction",
  captureAnother: "Capture another plate",
  dayEyebrow: "TODAY",
  dayTitle: "Your day, in evidence.",
  loggedSoFar: "LOGGED SO FAR",
  dayPortionRange: "Total portion: about {midpoint} g ({low}–{high} g)",
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
  providerUnavailable: "The provider could not be reached",
  draftSafe: "Your draft is safe.",
  cameraCaptureFailed: "The camera could not capture this plate. Try the text input instead.",
  mealAdded: "Meal added to today",
  mealUpdated: "Meal record updated",
  mealUndone: "Automatic record undone",
  undoMeal: "Undo",
  undoMealAccessibility: "Undo automatic record",
  mealRemoved: "Meal removed from today",
  removeMealTitle: "Remove this record?",
  removeMealCopy: "Are you sure you want to remove this meal from today?",
  removeMealConfirm: "Remove",
  removeMealAccessibility: "Remove this meal from today",
  cancel: "Cancel",
  savedQuestionOpen: "Saved with question open",
  saving: "Server is correcting…",
  correctionNeedsServer: "A server connection is required to save this correction.",
  correctionFailed: "The correction could not be saved.",
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
