/**
 * Deterministic fallback templates for when AI generation fails.
 * These are simple, safe, and always available.
 */
export function getFallbackComment(overall: number): string {
  if (overall >= 80) {
    return "Main character energy. You've found the spot.";
  }
  if (overall >= 40) {
    return "Solid choice. Your Uber Eats driver knows the way.";
  }
  return "Wilderness mode activated. Pack a lunch.";
}

/**
 * Localized fallback comments
 */
const localizedFallbacks: Record<string, (overall: number) => string> = {
  en: getFallbackComment,
  de: (overall: number) => {
    if (overall >= 80) return "Hauptcharakter-Energie. Du hast den Spot gefunden.";
    if (overall >= 40) return "Solide Wahl. Dein Lieferfahrer kennt den Weg.";
    return "Wildnis-Modus aktiviert. Brotzeit einpacken.";
  },
  es: (overall: number) => {
    if (overall >= 80) return "Energía de protagonista. Encontraste el lugar.";
    if (overall >= 40) return "Buena elección. Tu repartidor conoce el camino.";
    return "Modo aventura activado. Lleva almuerzo.";
  },
  fr: (overall: number) => {
    if (overall >= 80) return "Énergie de star. Tu as trouvé le spot.";
    if (overall >= 40) return "Bon choix. Ton livreur connaît le chemin.";
    return "Mode nature activé. Prévois un pique-nique.";
  },
};

export function getLocalizedFallback(overall: number, locale: string): string {
  const fallbackFn = localizedFallbacks[locale] || localizedFallbacks.en;
  return fallbackFn(overall);
}
