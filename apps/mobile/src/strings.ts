export type Locale = "tr" | "en";

export type StringKey =
  | "brand"
  | "captureEyebrow"
  | "captureTitle"
  | "cameraWaiting"
  | "cameraPermission"
  | "allowCamera"
  | "liveCamera"
  | "frameHint"
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
  | "abstainOutOfCatalogueEyebrow"
  | "abstainOutOfCatalogueTitle"
  | "abstainOutOfCatalogueSubtitle"
  | "abstainGenericMealName"
  | "abstainHonestGuarantee"
  | "suggestDishButton"
  | "suggestDishSuccess"
  | "suggestDishPrototypeTitle"
  | "suggestDishPrototypeCopy"
  | "searchCatalogueButton"
  | "saveAsUncaloriedNoteButton"
  | "saveAnywayLabel"
  | "saveManualCaloriesButton"
  | "manualCaloriesPrompt"
  | "manualCaloriesPlaceholder"
  | "manualSaveButton"
  | "invalidCaloriesTitle"
  | "invalidCaloriesCopy"
  | "manualCaloriesProvenance"
  | "uncaloriedNoteProvenance"
  | "uncaloriedBadge"
  | "manualBadge"
  | "abstainObserved"
  | "abstainCandidates"
  | "abstainCode"
  | "abstainNoCandidates"
  | "emptyPlateEyebrow"
  | "emptyPlateTitle"
  | "emptyPlateSubtitle"
  | "emptyPlateCopy"
  | "emptyPlateOverrideButton"
  | "emptyPlateOverridePrompt"
  | "emptyPlateOverridePlaceholder"
  | "emptyPlateOverrideSubmit"
  | "uploadedPhotoBadge"
  | "mealPhotoBadge"
  | "privacyBadgeSafe"
  | "confirmModelDetectionTitle"
  | "confirmObservedPrefix"
  | "confirmObservedSuffix"
  | "confirmYesLabel"
  | "confirmNoLabel"
  | "correctThisFood"
  | "cancelEdit"
  | "editFoodPrompt"
  | "editFoodPlaceholder"
  | "updateAndMatch"
  | "chooseAndSave"
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
  | "chooseAlternateCandidate"
  | "unresolvedAbstainHint"
  | "removeItem"
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
  | "quantityPending"
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
  | "carbs"
  | "fat"
  | "calories"
  | "macrosTitle"
  | "nutritionTitle"
  | "nutritionSummary"
  | "manualCaloriesSummary"
  | "macrosUnavailable"
  | "macrosPartial"
  | "dayPortionUnavailable"
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
  | "correctionFailed"
  | "clarifyCountRequired"
  | "rateLimitExceeded"
  | "unsupportedMediaType"
  | "payloadTooLarge"
  | "abstainUnmappedHelp"
  | "matchConfidenceHigh"
  | "matchConfidenceMed"
  | "portionStatusVerify"
  | "portionStatusConfirmed"
  | "portionQuestionTitle"
  | "portionChoiceClose"
  | "portionChoiceLess"
  | "portionChoiceMore"
  | "confirmPortionRequired"
  | "saveBlockedCountHint"
  | "countAnswerRequired"
  | "countRecalculationPending"
  | "nutritionRecalculationPending"
  | "countUnknownAccepted"
  | "moreItemsCount";

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
  abstainOutOfCatalogueEyebrow: "KATALOG KAPSAMI DIŞINDA",
  abstainOutOfCatalogueTitle: "Bu öğün katalogda yok.",
  abstainOutOfCatalogueSubtitle: "Fotoğraftaki öğün için güvenli bir katalog eşleşmesi oluşmadı. Resmi laboratuvar besin verisi olmadan kalori eklemedik.",
  abstainGenericMealName: "Katalog dışı öğün",
  abstainHonestGuarantee: "Mealog yalnızca resmi laboratuvar (TÜRKOMP) verisiyle çalışır; katalog dışı yemeklere tahmini/sahte kalori atamaz.",
  suggestDishButton: "Yemeği Kataloğa Öner",
  suggestDishSuccess: "Öneri kaydedildi",
  suggestDishPrototypeTitle: "Öneri kaydedildi (prototip)",
  suggestDishPrototypeCopy: "“{dish}” önerisi bu cihazda işaretlendi. Üretim sürümünde kullanıcı onayıyla anonimleştirilmiş katalog geri bildirim akışına iletilir.",
  searchCatalogueButton: "Katalogda Başka Yemek Ara",
  saveAsUncaloriedNoteButton: "Cihaza Kalorisiz Not Olarak Kaydet",
  saveAnywayLabel: "BU ÖĞÜNÜ YİNE DE KAYDET",
  saveManualCaloriesButton: "Cihaza Manuel Kalori Gir",
  manualCaloriesPrompt: "Bu cihaz için manuel kalori girin (Yerel Kullanıcı Girişi olarak saklanır):",
  manualCaloriesPlaceholder: "Örn. 350",
  manualSaveButton: "Kaydet",
  invalidCaloriesTitle: "Geçersiz kalori",
  invalidCaloriesCopy: "1 ile 5000 arasında geçerli bir kalori değeri girin.",
  manualCaloriesProvenance: "Kullanıcı manuel girişi (yerel)",
  uncaloriedNoteProvenance: "Kalorisiz öğün notu (yerel)",
  uncaloriedBadge: "Kalorisiz not",
  manualBadge: "Manuel",
  abstainObserved: "GÖRÜLEN",
  abstainCandidates: "YAKIN ADAYLAR · HİÇBİRİ KABUL EDİLMEDİ",
  abstainCode: "GÜVENLİ EŞLEŞME YOK · TAHMİN YAPILMADI",
  abstainNoCandidates: "Bu öğün için aday bulunamadı.",
  emptyPlateEyebrow: "YEMEK BULUNAMADI",
  emptyPlateTitle: "Yemek veya İçecek Tespit Edilemedi.",
  emptyPlateSubtitle: "Yiyecek dışı metin, boş tabak veya net olmayan girdi",
  emptyPlateCopy: "Gönderilen girdi veya fotoğrafta yenilebilir bir yemek/içecek tespit edilemedi (boş tabak, yemek dışı metin veya belirsiz görüntü). Lütfen ne yediğinizi yazın veya yeni bir fotoğraf çekin.",
  emptyPlateOverrideButton: "Yemek Adını Kendim Yazayım",
  emptyPlateOverridePrompt: "Ne yediğinizi yazın (katalogda aranacak):",
  emptyPlateOverridePlaceholder: "Örn: Kuru fasulye, simit, mercimek çorbası...",
  emptyPlateOverrideSubmit: "Katalogda Ara ve Eşleştir",
  uploadedPhotoBadge: "Yüklenen Fotoğraf",
  mealPhotoBadge: "Öğün Fotoğrafı",
  privacyBadgeSafe: "EXIF & Konum Temizlendi",
  confirmModelDetectionTitle: "Modelin Tespiti Doğru mu?",
  confirmObservedPrefix: "Yapay zeka bu fotoğrafta: ",
  confirmObservedSuffix: " gördü.",
  confirmYesLabel: "Evet, Doğru ({names})",
  confirmNoLabel: "Hayır, Farklı Bir Yemek Yaz",
  correctThisFood: "Bu Yemeği Düzelt",
  cancelEdit: "Vazgeç",
  editFoodPrompt: "Doğru yemek ismini veya tarifini yazın:",
  editFoodPlaceholder: "Örn: Kıymalı makarna, salata...",
  updateAndMatch: "Güncelle & Eşleştir",
  chooseAndSave: "Seç & Kaydet",

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
  alternates: "BU YEMEĞİ DÜZELT",
  chooseAlternateCandidate: "Yemek bu değilse aşağıdaki katalog eşleşmesini seçin:",
  unresolvedAbstainHint: "Çözülmemiş yemek eşleşmesi var; kaydetmeden önce aşağıdaki listeden eşleştirin.",
  removeItem: "Bu öğeyi tabaktan çıkar",
  whyResult: "Nasıl bulundu?",
  traceDecision: "İsteğe bağlı teknik kaynak ve doğrulama detayı",
  matchedFoodId: "Katalog eşleşmesi",


  sourceDatabase: "Kaynak Veritabanı",
  catalogueProvenance: "Resmi Veri Tabanı",
  portionSource: "Porsiyon Kaynağı",
  portionProvenance: "Porsiyon dayanağı",
  confidence: "Yemek eşleşmesi güveni",
  exactGrams: "Kayda esas ağırlık",
  quantity: "Adet / miktar",
  quantityUnknown: "Miktar belirsiz · standart porsiyon",
  quantityPending: "Adet yanıtı bekleniyor",
  quantityValue: "{quantity}{unit}",
  itemWithQuantity: "{quantity}{unit} {name}",
  itemUnknownQuantity: "{name}",
  pending: "Standart Katalog Porsiyonu",
  saveQuestion: "Soruyu açık bırakarak kaydet",
  saveToday: "Bugüne kaydet",
  saveCorrection: "Düzeltmeyi kaydet",
  captureAnother: "Başka bir tabak çek",
  dayEyebrow: "BUGÜN",
  dayTitle: "Bugün ne yediğini gör.",
  loggedSoFar: "ŞİMDİYE KADAR",
  dayPortionRange: "Porsiyon toplamı: yaklaşık {midpoint} g ({low}–{high} g)",
  protein: "Protein",
  carbs: "Karbonhidrat",
  fat: "Yağ",
  calories: "Kalori",
  macrosTitle: "Besin değerleri",
  nutritionTitle: "BESİN DEĞERLERİ",
  nutritionSummary: "Katalog kaydı ve seçilen porsiyona göre",
  manualCaloriesSummary: "Kalori kullanıcı tarafından girildi; protein, karbonhidrat ve yağ hesaplanmadı.",
  macrosUnavailable: "Makro bilgisi için doğrulanmış katalog kaydı yok.",
  macrosPartial: "Makrolar yalnızca doğrulanmış katalog kayıtlarından hesaplanır.",
  dayPortionUnavailable: "Doğrulanmış porsiyon bilgisi yok.",
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
  frameHint: "Tabağı çerçeveye sığdır",
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
  clarifyCountRequired: "Lütfen adedi seçin veya 'Emin değilim' seçeneğine dokunun.",
  rateLimitExceeded: "İstek limiti aşıldı. Lütfen kısa bir süre sonra tekrar deneyin.",
  unsupportedMediaType: "Desteklenmeyen veya bozuk görsel formatı. Lütfen net bir fotoğraf çekin.",
  payloadTooLarge: "Görsel boyutu çok büyük (10 MB üstü).",
  abstainUnmappedHelp: "Bu yemek resmi katalogda bulunamadı. Lütfen listeden bir alternatif seçin veya farklı bir yemek yazın.",
  matchConfidenceHigh: "Yemek eşleşmesi: Yüksek güven",
  matchConfidenceMed: "Yemek eşleşmesi: Doğrulama önerilir",
  portionStatusVerify: "Porsiyon: Doğrulama gerekli",
  portionStatusConfirmed: "Porsiyon: Onaylandı",
  portionQuestionTitle: "Bu porsiyon sana yakın mı?",
  portionChoiceClose: "Uygun (Yakın)",
  portionChoiceLess: "Daha az",
  portionChoiceMore: "Daha çok",
  confirmPortionRequired: "Devam etmek için porsiyonu doğrula",
  saveBlockedCountHint: "Devam etmek için adet seç veya “Emin değilim” de.",
  countAnswerRequired: "Adet yanıtı gelmeden gram aralığı ve besin değerleri gösterilmez.",
  countRecalculationPending: "Seçtiğin adede göre gram aralığı ve besin değerleri kaydettiğinde sunucuda güncellenecek.",
  nutritionRecalculationPending: "Değişikliğin ardından sunucu porsiyonu ve besin değerlerini yeniden hesaplayacak.",
  countUnknownAccepted: "Miktar belirsiz kaldığı için standart katalog porsiyonu kullanılacak.",
  moreItemsCount: "+{count} öğe daha",
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
  abstainOutOfCatalogueEyebrow: "OUT OF CATALOGUE SCOPE",
  abstainOutOfCatalogueTitle: "This meal is not in the catalogue.",
  abstainOutOfCatalogueSubtitle: "No safe catalogue match was found for the meal in this photo. We did not add calories without verified laboratory data.",
  abstainGenericMealName: "Out-of-catalogue meal",
  abstainHonestGuarantee: "Mealog strictly relies on verified laboratory data (TÜRKOMP/USDA); no hallucinated calories are ever assigned.",
  suggestDishButton: "Suggest Dish to Catalogue",
  suggestDishSuccess: "Suggestion saved",
  suggestDishPrototypeTitle: "Suggestion noted (prototype)",
  suggestDishPrototypeCopy: "“{dish}” is marked on this device. In production, it would be sent to an anonymized catalogue feedback flow with user consent.",
  searchCatalogueButton: "Search Different Food in Catalogue",
  saveAsUncaloriedNoteButton: "Save Local Note to Device (No Calories)",
  saveAnywayLabel: "SAVE THIS MEAL ANYWAY",
  saveManualCaloriesButton: "Enter Manual Calories on Device",
  manualCaloriesPrompt: "Enter manual calories for this device (saved as Local User Entry):",
  manualCaloriesPlaceholder: "e.g. 350",
  manualSaveButton: "Save",
  invalidCaloriesTitle: "Invalid calories",
  invalidCaloriesCopy: "Enter a calorie value between 1 and 5000.",
  manualCaloriesProvenance: "User manual entry (local)",
  uncaloriedNoteProvenance: "Meal note (local)",
  uncaloriedBadge: "Meal note",
  manualBadge: "Manual",
  abstainObserved: "OBSERVED",
  abstainCandidates: "NEARBY CANDIDATES · NONE ACCEPTED",
  abstainCode: "ABSTAIN · NO GUESS",
  abstainNoCandidates: "No candidates were found for this meal.",
  emptyPlateEyebrow: "NO FOOD DETECTED",
  emptyPlateTitle: "No Food or Drink Detected.",
  emptyPlateSubtitle: "Non-food text, empty plate, or unclear input",
  emptyPlateCopy: "No edible food or drink could be detected in this input (empty plate, non-food text, or unclear image). Please type what you ate or take a new photo.",
  emptyPlateOverrideButton: "Type Food Name Myself",
  emptyPlateOverridePrompt: "Type what you ate (will be searched in catalogue):",
  emptyPlateOverridePlaceholder: "e.g. Rice, soup, bagel, eggs...",
  emptyPlateOverrideSubmit: "Search and Match in Catalogue",
  uploadedPhotoBadge: "Uploaded Photo",
  mealPhotoBadge: "Meal Photo",
  privacyBadgeSafe: "EXIF & Location Stripped",
  confirmModelDetectionTitle: "Is the Detection Correct?",
  confirmObservedPrefix: "The vision model detected: ",
  confirmObservedSuffix: " in this photo.",
  confirmYesLabel: "Yes, Correct ({names})",
  confirmNoLabel: "No, Type a Different Food",
  correctThisFood: "Correct This Item",
  cancelEdit: "Cancel",
  editFoodPrompt: "Type the correct food name or recipe:",
  editFoodPlaceholder: "e.g. Pasta with minced meat, salad...",
  updateAndMatch: "Update & Match",
  chooseAndSave: "Select & Save",
  describeMeal: "I will describe the meal",
  chooseManually: "Choose from the catalogue",
  retakePhoto: "Retake the photo",
  portion: "PORTION",
  notEstimated: "Not estimated",
  portionBand: "about {grams} g ({low}–{high} g)",
  portionFor: "{query} portion",
  portionLow: "{grams} g likely minimum",
  portionHigh: "{grams} g upper range",
  portionPending: "Portion waits for your answer.",
  alternates: "CORRECT THIS DISH",
  chooseAlternateCandidate: "If this dish is different, pick a catalogue match below:",
  unresolvedAbstainHint: "Unresolved dish match; pick a catalogue match below before saving.",
  removeItem: "Remove this item from meal",
  whyResult: "Why this result?",
  traceDecision: "Optional technical verification details",
  matchedFoodId: "Matched food_id",
  sourceDatabase: "Source database",
  catalogueProvenance: "Catalogue provenance",
  portionSource: "Portion source",
  portionProvenance: "Portion evidence",
  confidence: "Confidence",
  exactGrams: "Exact grams used",
  quantity: "QUANTITY",
  quantityUnknown: "Quantity unknown · review",
  quantityPending: "Waiting for count answer",
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
  protein: "Protein",
  carbs: "Carbohydrate",
  fat: "Fat",
  calories: "Calories",
  macrosTitle: "Nutrition facts",
  nutritionTitle: "NUTRITION FACTS",
  nutritionSummary: "From the catalogue record and selected portion",
  manualCaloriesSummary: "Calories were entered by the user; protein, carbohydrate, and fat were not calculated.",
  macrosUnavailable: "No verified catalogue record is available for macro values.",
  macrosPartial: "Macros include verified catalogue records only.",
  dayPortionUnavailable: "No verified portion information is available.",
  meals: "MEALS",
  loggedCount: "{count} logged",
  itemCount: "{count} item",
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
  frameHint: "Fit the plate inside the frame",
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
  clarifyCountRequired: "Please select a count or tap 'Not sure'.",
  rateLimitExceeded: "Rate limit exceeded. Please wait a moment.",
  unsupportedMediaType: "Unsupported or corrupt image format. Please capture a clear photo.",
  payloadTooLarge: "Image file is too large (over 10 MB).",
  abstainUnmappedHelp: "This food is not in the canonical catalogue. Please choose an alternative or describe the meal.",
  matchConfidenceHigh: "Food match: High confidence",
  matchConfidenceMed: "Food match: Review recommended",
  portionStatusVerify: "Portion: Confirmation required",
  portionStatusConfirmed: "Portion: Confirmed",
  portionQuestionTitle: "Does this portion look right to you?",
  portionChoiceClose: "Looks right",
  portionChoiceLess: "Less",
  portionChoiceMore: "More",
  confirmPortionRequired: "Confirm portion to continue",
  saveBlockedCountHint: "Select a count or choose “I am not sure” to continue.",
  countAnswerRequired: "Portion range and nutrients stay hidden until the count is answered.",
  countRecalculationPending: "The server will update the portion range and nutrients for this count when you save.",
  nutritionRecalculationPending: "The server will recalculate the portion and nutrition values after this change.",
  countUnknownAccepted: "Because quantity remains unknown, the standard catalogue portion will be used.",
  moreItemsCount: "+{count} more items",
};

const dictionaries: Record<Locale, Dictionary> = { tr, en };
export const DEFAULT_LOCALE: Locale = "tr";

export function t(key: StringKey, values: Values = {}, locale: Locale = DEFAULT_LOCALE): string {
  return dictionaries[locale][key].replace(/\{(\w+)\}/g, (placeholder, name: string) => String(values[name] ?? placeholder));
}

export function formatLocalizedUnit(unit?: string | null, locale: Locale = DEFAULT_LOCALE): string {
  if (!unit) return "";
  const clean = unit.toLowerCase().trim();
  if (locale === "tr") {
    if (clean === "whole" || clean === "piece" || clean === "adet") return "adet";
    if (clean === "serving" || clean === "portion" || clean === "porsiyon") return "porsiyon";
    if (clean === "several") return "adet";
    if (clean === "glass" || clean === "bardak") return "bardak";
    if (clean === "bowl" || clean === "kase") return "kase";
    if (clean === "plate" || clean === "tabak") return "tabak";
    if (clean === "slice" || clean === "dilim") return "dilim";
    if (clean === "g" || clean === "gram") return "g";
    return unit;
  }
  if (clean === "adet") return "piece";
  if (clean === "porsiyon") return "portion";
  if (clean === "bardak") return "glass";
  if (clean === "kase") return "bowl";
  if (clean === "tabak") return "plate";
  if (clean === "dilim") return "slice";
  return unit;
}

export function formatLocalizedProvenance(source?: string | null, locale: Locale = DEFAULT_LOCALE): string {
  if (!source) return locale === "tr" ? "Standart katalog porsiyonu" : "Catalogue portion";
  const clean = source.toLowerCase().trim();
  if (locale === "tr") {
    if (clean.includes("catalogue_default_scaled")) return "Katalog tanımı × adet";
    if (clean.includes("catalogue_default")) return "Standart katalog porsiyonu";
    if (clean.includes("user_stated")) return "Kullanıcı beyanı";
    if (clean.includes("visual_estimate")) return "Görsel porsiyon tahmini";
    return source.replace(/_/g, " ");
  }
  if (clean.includes("catalogue_default_scaled")) return "Catalogue default × quantity";
  if (clean.includes("catalogue_default")) return "Standard catalogue portion";
  if (clean.includes("user_stated")) return "User stated portion";
  if (clean.includes("visual_estimate")) return "Visual estimate";
  return source.replace(/_/g, " ");
}

type QuestionItem = {
  food_id: string;
  candidates: Array<{ food_id: string; name: string }>;
};

export function questionText(item?: QuestionItem): string {
  const match = item?.candidates.find((candidate) => candidate.food_id === item.food_id);
  return match ? t("questionConfirm", { food: match.name }) : t("questionPick");
}
