/**
 * zsviczian -- omit redundant translations from the single Obsidian artifact.
 * Author: zsviczian. https://github.com/zsviczian/excalidraw/pull/491
 * i18n.t() already falls back to English for an empty or absent translation.
 * Empty strings and strings identical to that fallback therefore consume bundle
 * space without changing a label. Keep source JSON, language availability,
 * non-string values and object shape; the normal ESM build remains unchanged.
 */
function compactTranslations(translations, fallback) {
  if (
    !translations ||
    typeof translations !== "object" ||
    Array.isArray(translations)
  ) {
    return translations;
  }
  return Object.fromEntries(
    Object.entries(translations).flatMap(([key, value]) => {
      if (
        typeof value === "string" &&
        (value === "" || value === fallback?.[key])
      ) {
        return [];
      }
      return [[key, compactTranslations(value, fallback?.[key])]];
    }),
  );
}

module.exports = { compactTranslations };
