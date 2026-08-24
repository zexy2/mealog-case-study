export function inferImageMimeAndName(uri?: string, declaredMime?: string | null): { mimeType: string; fileName: string } {
  if (declaredMime && declaredMime.trim() !== "") {
    const clean = declaredMime.toLowerCase().trim();
    if (clean.includes("heic")) return { mimeType: "image/heic", fileName: "meal.heic" };
    if (clean.includes("heif")) return { mimeType: "image/heif", fileName: "meal.heif" };
    if (clean.includes("png")) return { mimeType: "image/png", fileName: "meal.png" };
    if (clean.includes("webp")) return { mimeType: "image/webp", fileName: "meal.webp" };
    if (clean.includes("gif")) return { mimeType: "image/gif", fileName: "meal.gif" };
    if (clean.includes("jpeg") || clean.includes("jpg")) return { mimeType: "image/jpeg", fileName: "meal.jpg" };
  }

  const lowerUri = (uri ?? "").toLowerCase();
  if (lowerUri.endsWith(".heic")) return { mimeType: "image/heic", fileName: "meal.heic" };
  if (lowerUri.endsWith(".heif")) return { mimeType: "image/heif", fileName: "meal.heif" };
  if (lowerUri.endsWith(".png")) return { mimeType: "image/png", fileName: "meal.png" };
  if (lowerUri.endsWith(".webp")) return { mimeType: "image/webp", fileName: "meal.webp" };
  if (lowerUri.endsWith(".gif")) return { mimeType: "image/gif", fileName: "meal.gif" };
  return { mimeType: "image/jpeg", fileName: "meal.jpg" };
}
