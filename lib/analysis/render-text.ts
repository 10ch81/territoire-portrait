import { formatCount } from "./format";

export function parseFrenchCount(token: string): number {
  return Number.parseInt(token.replace(/[\s\u202f]/g, ""), 10);
}

/** Rendu « N singulier / N pluriel » avec séparateur de milliers français. */
export function renderCountedLabel(
  count: number,
  singular: string,
  plural: string,
): string {
  return `${formatCount(count)} ${count <= 1 ? singular : plural}`;
}

/**
 * Résout les marqueurs « mot(s) » précédés d'un quantificateur :
 * `2 structure(s)` → `2 structures`.
 */
export function resolveOptionalPluralMarkers(text: string): string {
  return text.replace(
    /(\d[\d\s\u202f]*)\s+([\wÀ-ÿ-]+)\(s\)/gi,
    (_match, countToken: string, word: string) => {
      const count = parseFrenchCount(countToken);
      if (!Number.isFinite(count)) {
        return `${countToken} ${word}s`;
      }
      return count <= 1 ? `${countToken} ${word}` : `${countToken} ${word}s`;
    },
  );
}

/** Retire un ratio FLORES « postes pour 100 habitants » ajouté en suffixe. */
export function stripFloresPerCapitaRatio(text: string): string {
  return text
    .replace(/,\s*soit environ \d[\d\s\u202f]* postes pour 100 habitants[^.]*\.?/gi, ".")
    .replace(/\s+\./g, ".")
    .replace(/\.\./g, ".")
    .trim();
}

const ARCEP_LEGACY_PATTERNS: Array<[RegExp, string]> = [
  [
    /Environ\s+([\d,]+\s*%)\s+des logements peuvent être connectés à la fibre\s*\([^)]*ARCEP[^)]*\)\.?/gi,
    "$1 des locaux sont raccordables à la fibre selon l'ARCEP.",
  ],
  [
    /([\d,]+\s*%)\s+des logements (?:peuvent être connectés|éligibles) à la fibre/gi,
    "$1 des locaux sont raccordables à la fibre",
  ],
];

function normalizeArcepWording(text: string): string {
  let result = text;
  for (const [pattern, replacement] of ARCEP_LEGACY_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/** Finition légère des clauses du résumé déterministe (hors phrase 1). */
export function polishSummaryClause(clause: string): string {
  return resolveOptionalPluralMarkers(clause)
    .replace(/\s+recensée\(s\)\s+sur la commune\.?$/i, "")
    .replace(/\s+sur la commune\.?$/i, "")
    .trim();
}

export function containsOptionalPluralMarker(text: string): boolean {
  return /\([\s]*s[\s]*\)/i.test(text);
}

/** Jointure de listes françaises : A ; A et B ; A, B et C. */
export function joinFrenchList(items: string[]): string {
  const cleaned = items.map((item) => item.trim()).filter((item) => item.length > 0);
  if (cleaned.length === 0) return "";
  if (cleaned.length === 1) return cleaned[0]!;
  if (cleaned.length === 2) return `${cleaned[0]} et ${cleaned[1]}`;
  return `${cleaned.slice(0, -1).join(", ")} et ${cleaned.at(-1)}`;
}

/**
 * Jointure de fragments prépositionnels déjà contractés :
 * au chômage ; au chômage et à la vacance ; au chômage, à la vacance et aux risques.
 */
export function joinFrenchPrepositionalList(items: string[]): string {
  return joinFrenchList(items);
}

/**
 * Forme après « à » avec contractions françaises (à le → au, à les → aux).
 * Construit en amont — pas de correction regex en aval.
 */
export function frenchAfterA(nominative: string): string {
  const n = nominative.trim();
  if (/^le /i.test(n)) return `au ${n.slice(3)}`;
  if (/^la /i.test(n)) return `à la ${n.slice(3)}`;
  if (/^les /i.test(n)) return `aux ${n.slice(4)}`;
  if (/^l'/i.test(n)) return `à ${n}`;
  if (/^certains? /i.test(n)) return `à ${n}`;
  if (/^certaines? /i.test(n)) return `à ${n}`;
  if (/^un /i.test(n)) return `à ${n}`;
  if (/^une /i.test(n)) return `à ${n}`;
  if (/^des /i.test(n)) return `à ${n}`;
  return `à ${n}`;
}

/** Finition légère des phrases affichées (listes), sans toucher au résumé déterministe. */
export function polishRenderedSentence(text: string): string {
  return normalizeArcepWording(stripFloresPerCapitaRatio(resolveOptionalPluralMarkers(text))).trim();
}
