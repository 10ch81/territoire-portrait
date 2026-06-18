import type { AnalysisFact } from "./types";
import type { DemographySnapshot } from "./summary-phrases";
import { joinFrenchList } from "./render-text";

const DEFAULT_ASSET_PHRASE = "peu d'atouts documentés dans les sources consultées";

export function resolveAssetPhrase(fact: AnalysisFact): string | null {
  return fact.summaryAssetPhrase?.trim() || null;
}

export function resolveIssuePhrase(fact: AnalysisFact): string | null {
  return fact.summaryIssuePhrase?.trim() || null;
}

export function buildSummaryPhrase2(
  assetPhrase: string,
  demography: DemographySnapshot,
  issuePhrases: string[],
  contextPhrase?: string | null,
): string {
  const issues = joinFrenchList(issuePhrases);
  const context = contextPhrase?.trim() || null;

  if (demography.trend === "growth" && context) {
    const base = `Le portrait met en évidence ${assetPhrase} et ${context}`;
    if (issuePhrases.length === 0) {
      return `${base}.`;
    }
    return `${base}, avec des enjeux liés à ${issues}.`;
  }

  if (demography.trend === "decline" && context) {
    const base = `Le portrait met en évidence ${assetPhrase}, avec ${context}`;
    if (issuePhrases.length === 0) {
      return `${base}.`;
    }
    return `${base} et des enjeux liés à ${issues}.`;
  }

  if (demography.trend === "stable" && context) {
    const base = `Le portrait met en évidence ${assetPhrase} et ${context}`;
    if (issuePhrases.length === 0) {
      return `${base}.`;
    }
    return `${base}, avec des enjeux liés à ${issues}.`;
  }

  const base = `Le portrait met en évidence ${assetPhrase}`;
  if (issuePhrases.length === 0) {
    return `${base}.`;
  }
  return `${base}, avec des enjeux liés à ${issues}.`;
}

export function pickDefaultAssetPhrase(): string {
  return DEFAULT_ASSET_PHRASE;
}

const FORBIDDEN_SUMMARY_PATTERNS: RegExp[] = [
  /met en évidence centralité\b/i,
  /liés à taux\b/i,
  /liés à vacance\b(?! résidentielle)/i,
  /\bincivilités\b/i,
  /\bstructure\(s\)/i,
  /\brecensée\(s\)/i,
  /recul de population de\s+-/i,
  /recul de\s+-/i,
  /logements (?:raccordables|éligibles) à la fibre/i,
  /taux de chômage des actifs/i,
  /sécurité et incivilités/i,
  /logement et habitat/i,
  /Elle combine/i,
  /avec une évolution de/i,
  /et le taux de chômage/i,
];

/** Détecte des fragments non prêts ou des formulations interdites dans le résumé. */
export function hasUnreadySummaryFragments(summary: string): boolean {
  return FORBIDDEN_SUMMARY_PATTERNS.some((pattern) => pattern.test(summary));
}

/** Vérifie que les groupes nominaux insérés après « liés à » ont un article. */
export function issuePhrasesAreGrammatical(issuePhrases: string[]): boolean {
  return issuePhrases.every((phrase) =>
    /^(?:le |la |les |l'|certains |des |une |un )/i.test(phrase.trim()),
  );
}
