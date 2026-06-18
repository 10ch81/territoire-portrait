import type { AnalysisFact, AnalysisFactTarget } from "./types";
import { scoreAnalysisFact, type ScoreContext } from "./score-facts";

const CONFIDENCE_ORDER = { high: 3, medium: 2, low: 1 } as const;

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}\s%€./-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function indicatorKeys(fact: AnalysisFact): string[] {
  const year = String(fact.year ?? "na");
  const bindings = fact.numericBindings ?? [];

  if (bindings.length > 0) {
    return bindings.map((b) => `${fact.theme}:${String(b.value)}:${year}`);
  }

  return [`${fact.theme}:text:${normalizeText(fact.sentence).slice(0, 72)}:${year}`];
}

function tokenOverlapRatio(a: string, b: string): number {
  const tokensA = new Set(normalizeText(a).split(" ").filter((t) => t.length > 3));
  const tokensB = new Set(normalizeText(b).split(" ").filter((t) => t.length > 3));
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let overlap = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) overlap += 1;
  }

  return overlap / Math.min(tokensA.size, tokensB.size);
}

export function areSemanticallySimilar(a: AnalysisFact, b: AnalysisFact): boolean {
  if (a.theme !== b.theme) return false;

  const normalizedA = normalizeText(a.sentence);
  const normalizedB = normalizeText(b.sentence);
  if (normalizedA === normalizedB) return true;

  const keysA = new Set(indicatorKeys(a));
  const keysB = new Set(indicatorKeys(b));
  for (const key of keysA) {
    if (keysB.has(key)) return true;
  }

  return tokenOverlapRatio(a.sentence, b.sentence) >= 0.65;
}

export function compareFactQuality(
  a: AnalysisFact,
  b: AnalysisFact,
  context: ScoreContext,
): number {
  const confidenceDiff =
    CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence];
  if (confidenceDiff !== 0) return confidenceDiff;

  const scoreDiff = scoreAnalysisFact(a, context) - scoreAnalysisFact(b, context);
  if (scoreDiff !== 0) return scoreDiff;

  const sentenceDiff = a.sentence.length - b.sentence.length;
  if (sentenceDiff !== 0) return sentenceDiff;

  return (a.limitations?.length ?? 0) - (b.limitations?.length ?? 0);
}

function pickBetterFact(
  current: AnalysisFact,
  candidate: AnalysisFact,
  context: ScoreContext,
): AnalysisFact {
  return compareFactQuality(candidate, current, context) > 0 ? candidate : current;
}

function dedupeWithinTarget(
  facts: AnalysisFact[],
  context: ScoreContext,
): AnalysisFact[] {
  const byIndicator = new Map<string, AnalysisFact>();

  for (const fact of facts) {
    for (const key of indicatorKeys(fact)) {
      const existing = byIndicator.get(key);
      byIndicator.set(
        key,
        existing ? pickBetterFact(existing, fact, context) : fact,
      );
    }
  }

  const indicatorDeduped = [...new Set(byIndicator.values())];
  const result: AnalysisFact[] = [];

  for (const fact of indicatorDeduped) {
    const similarIndex = result.findIndex((existing) =>
      areSemanticallySimilar(existing, fact),
    );
    if (similarIndex === -1) {
      result.push(fact);
      continue;
    }

    result[similarIndex] = pickBetterFact(result[similarIndex], fact, context);
  }

  return result.sort(
    (a, b) => scoreAnalysisFact(b, context) - scoreAnalysisFact(a, context),
  );
}

export function dedupeFactsForTarget(
  facts: AnalysisFact[],
  target: AnalysisFactTarget,
  context: ScoreContext,
): AnalysisFact[] {
  const scoped = facts.filter((f) => f.target === target);
  return dedupeWithinTarget(scoped, context);
}

export function dedupeSelectedFacts(
  facts: AnalysisFact[],
  context: ScoreContext,
): AnalysisFact[] {
  const targets: AnalysisFactTarget[] = [
    "summary",
    "strengths",
    "watchPoints",
    "opportunities",
  ];

  const deduped: AnalysisFact[] = [];
  for (const target of targets) {
    deduped.push(...dedupeFactsForTarget(facts, target, context));
  }

  return deduped;
}

export function hasDuplicateIndicatorInTarget(
  facts: AnalysisFact[],
  target: AnalysisFactTarget,
): boolean {
  const scoped = facts.filter((f) => f.target === target);
  const keys = new Set<string>();

  for (const fact of scoped) {
    for (const key of indicatorKeys(fact)) {
      if (keys.has(key)) return true;
      keys.add(key);
    }
  }

  return false;
}
