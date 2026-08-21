import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const { DEFAULT_LOCALE, questionText, t } = await import("./strings.ts");
const appConfig = JSON.parse(readFileSync(new URL("../app.json", import.meta.url), "utf8"));
const demoSource = readFileSync(new URL("./demoData.ts", import.meta.url), "utf8");

assert.equal(DEFAULT_LOCALE, "tr");
assert.equal(t("captureTitle"), "Ne yedin?");
assert.equal(t("whyResult"), "Nasıl bulundu?");
assert.equal(t("portionBand", { grams: 180, low: 140, high: 230 }), "yaklaşık 180 g (140-230 g)");

assert.match(demoSource, /question: questionText\(askItem\)/);
assert.doesNotMatch(demoSource, /Is this kuru fasulye/);
assert.equal(questionText({
  food_id: "tr.lahmacun",
  candidates: [{ food_id: "tr.lahmacun", name: "Lahmacun" }],
}), "Lahmacun doğru mu? Değilse aşağıdan seç.");

const info = appConfig.expo.ios.infoPlist;
assert.match(info.NSCameraUsageDescription, /kamerayı/);
assert.match(info.NSPhotoLibraryUsageDescription, /fotoğrafını/);
assert.match(appConfig.expo.plugins[0][1].cameraPermission, /kamerayla/);
assert.match(appConfig.expo.plugins[1][1].photosPermission, /fotoğrafını/);

console.log("mobile Turkish runtime locale checks passed");
