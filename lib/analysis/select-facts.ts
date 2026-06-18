import type { AnalysisFact, AnalysisFactTarget } from "./types";

const CONFIDENCE_ORDER = { high: 0, medium: 1, low: 2 } as const;

const TARGET_LIMITS: Record<AnalysisFactTarget, { min: number; max: number }> = {
  summary: { min: 2, max: 4 },
  strengths: { min: 3, max: 5 },
  watchPoints: { min: 3, max: 5 },
  opportunities: { min: 3, max: 5 },
};

function factSignature(fact: AnalysisFact): string {
  const bindingKey = (fact.numericBindings ?? [])
    .map((b) => `${b.theme}:${b.label}:${b.value}`)
    .join("|");
  return `${fact.theme}:${fact.sentence.slice(0, 80)}:${bindingKey}`;
}

function themesConflict(a: AnalysisFact, b: AnalysisFact): boolean {
  const pairs: Array<[string, string]> = [
    ["security", "risks"],
    ["economy", "employment_sectors"],
    ["equipments", "education"],
    ["equipments", "health"],
    ["mobility", "connectivity"],
    ["energy", "connectivity"],
  ];

  return pairs.some(
    ([t1, t2]) =>
      (a.theme === t1 && b.theme === t2) || (a.theme === t2 && b.theme === t1),
  );
}

function sortByConfidence(facts: AnalysisFact[]): AnalysisFact[] {
  return [...facts].sort(
    (a, b) => CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence],
  );
}

export function groupFactsByTarget(
  facts: AnalysisFact[],
): Record<AnalysisFactTarget, AnalysisFact[]> {
  const groups: Record<AnalysisFactTarget, AnalysisFact[]> = {
    summary: [],
    strengths: [],
    watchPoints: [],
    opportunities: [],
  };

  for (const fact of facts) {
    groups[fact.target].push(fact);
  }

  return groups;
}

export function selectAnalysisFactsForPrompt(facts: AnalysisFact[]): AnalysisFact[] {
  const selected: AnalysisFact[] = [];
  const seen = new Set<string>();

  const ensureIdentityInSummary = () => {
    const hasIdentity = selected.some((f) => f.theme === "identity" || f.theme === "demography");
    if (hasIdentity) return;

    const candidate =
      facts.find((f) => f.theme === "identity" && f.target === "summary") ??
      facts.find((f) => f.theme === "demography");

    if (candidate && !seen.has(candidate.id)) {
      selected.push({ ...candidate, target: "summary" });
      seen.add(candidate.id);
    }
  };

  for (const target of Object.keys(TARGET_LIMITS) as AnalysisFactTarget[]) {
    const limit = TARGET_LIMITS[target];
    const candidates = sortByConfidence(facts.filter((f) => f.target === target));

    let count = 0;
    for (const candidate of candidates) {
      if (count >= limit.max) break;
      if (seen.has(candidate.id)) continue;

      const signature = factSignature(candidate);
      if (seen.has(signature)) continue;

      const conflicts = selected.some(
        (existing) =>
          existing.target === target && themesConflict(existing, candidate),
      );
      if (conflicts) continue;

      if (
        candidate.confidence === "low" &&
        candidates.some(
          (other) =>
            other.theme === candidate.theme &&
            other.confidence !== "low" &&
            other.id !== candidate.id,
        )
      ) {
        continue;
      }

      selected.push(candidate);
      seen.add(candidate.id);
      seen.add(signature);
      count += 1;
    }
  }

  ensureIdentityInSummary();

  const securityFact = facts.find((f) => f.theme === "security");
  const risksFact = facts.find((f) => f.theme === "risks");
  if (securityFact && !selected.some((f) => f.id === securityFact.id)) {
    selected.push(securityFact);
  }
  if (risksFact && !selected.some((f) => f.id === risksFact.id)) {
    selected.push(risksFact);
  }

  return selected;
}
