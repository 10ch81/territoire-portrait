import type { AnalysisFact } from "./types";
import type { DemographySnapshot } from "./summary-phrases";
import { joinFrenchPrepositionalList } from "./render-text";

const DEFAULT_ASSET_PHRASE = "peu d'atouts documentés dans les sources consultées";

export function resolveAssetPhrase(fact: AnalysisFact): string | null {
  return fact.summaryAssetPhrase?.trim() || null;
}

export function resolveIssueAfterA(fact: AnalysisFact): string | null {
  return fact.summaryIssueAfterA?.trim() || null;
}

function formatIssuesClause(afterAItems: string[]): string {
  if (afterAItems.length === 0) return "";
  return `avec des enjeux liés ${joinFrenchPrepositionalList(afterAItems)}`;
}

export function buildSummaryPhrase2(
  assetPhrase: string,
  demography: DemographySnapshot,
  issueAfterA: string[],
  contextPhrase?: string | null,
): string {
  const context = contextPhrase?.trim() || null;
  const issuesClause = formatIssuesClause(issueAfterA);

  if (demography.trend === "growth" && context) {
    const base = `Le portrait met en évidence ${assetPhrase} et ${context}`;
    if (issueAfterA.length === 0) {
      return `${base}.`;
    }
    return `${base}, ${issuesClause}.`;
  }

  if (demography.trend === "decline" && context) {
    const base = `Le portrait met en évidence ${assetPhrase}, avec ${context}`;
    if (issueAfterA.length === 0) {
      return `${base}.`;
    }
    return `${base} et des enjeux liés ${joinFrenchPrepositionalList(issueAfterA)}.`;
  }

  if (demography.trend === "stable" && context) {
    const base = `Le portrait met en évidence ${assetPhrase} et ${context}`;
    if (issueAfterA.length === 0) {
      return `${base}.`;
    }
    return `${base}, ${issuesClause}.`;
  }

  const base = `Le portrait met en évidence ${assetPhrase}`;
  if (issueAfterA.length === 0) {
    return `${base}.`;
  }
  return `${base}, ${issuesClause}.`;
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
  /\bà le\b/i,
  /\bà les\b/i,
  /\bde le\b/i,
  /\bde les\b/i,
  /liés à le\b/i,
  /liés à les\b/i,
  /liés à au\b/i,
  /avec des enjeux liés à le\b/i,
  /avec des enjeux liés à les\b/i,
];

/** Détecte des fragments non prêts ou des formulations interdites dans le résumé. */
export function hasUnreadySummaryFragments(summary: string): boolean {
  return FORBIDDEN_SUMMARY_PATTERNS.some((pattern) => pattern.test(summary));
}

/** Validation défensive des contractions françaises incorrectes. */
export function hasInvalidFrenchContractions(text: string): boolean {
  return (
    /\bà le\b/i.test(text) ||
    /\bà les\b/i.test(text) ||
    /\bde le\b/i.test(text) ||
    /\bde les\b/i.test(text) ||
    /liés à le\b/i.test(text) ||
    /liés à les\b/i.test(text) ||
    /liés à au\b/i.test(text) ||
    /avec des enjeux liés à le\b/i.test(text)
  );
}

/** Vérifie que les fragments afterA sont prépositionnels et contractés. */
export function issueAfterAFragmentsAreGrammatical(issueAfterA: string[]): boolean {
  return issueAfterA.every((phrase) =>
    /^(?:au |à la |aux |à l'|à certains? |à certaines? |à un |à une |à des )/i.test(phrase.trim()),
  );
}
