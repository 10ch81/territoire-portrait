import { resolveAssetPhrase, resolveIssueAfterA } from "@/lib/analysis/summary-compose";
import { joinFrenchPrepositionalList } from "@/lib/analysis/render-text";
import { scoreAnalysisFact } from "@/lib/analysis/score-facts";
import { isRadonRiskWatchFact } from "@/lib/analysis/risk-watch-subtypes";
import { passesWatchPointSelectionGates } from "@/lib/analysis/watch-point-selection-gates";
import { MIN_ABSOLUTE_SALARIED_POSTS } from "@/lib/analysis/strength-signals";
import type { QualifiedAnalysisFact } from "@/lib/analysis/types";
import type { SectorRenderContext } from "./sector-catalog";

const MAX_SYNTHESIS_WATCH_FACTS = 3;

function shortenWatchIssue(sentence: string): string {
  const trimmed = sentence.replace(/\.$/, "").trim();
  if (/quartiers prioritaires/i.test(trimmed)) {
    return "aux quartiers prioritaires";
  }
  if (/chômage/i.test(trimmed)) {
    return "au chômage";
  }
  if (/zones à risque d'inondation|risque d'inondation/i.test(trimmed)) {
    return "à l'exposition aux risques d'inondation";
  }
  if (/catastrophe naturelle/i.test(trimmed)) {
    return "aux catastrophes naturelles reconnues";
  }
  if (/sécurité|SSMSI/i.test(trimmed)) {
    return "à la sécurité enregistrée";
  }
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

export function pickSynthesisStrengthPhrase(fact: QualifiedAnalysisFact): string {
  const asset = resolveAssetPhrase(fact);
  if (asset) {
    return asset;
  }
  if (/postes salariés/i.test(fact.sentence)) {
    const posts = fact.numericBindings?.find((binding) =>
      /postes salariés/i.test(binding.label),
    )?.value;
    if (typeof posts === "number" && posts >= MIN_ABSOLUTE_SALARIED_POSTS) {
      return "une base d'emploi salarié documentée";
    }
    return "une activité économique locale recensée";
  }
  if (/moins de 30 ans/i.test(fact.sentence)) {
    return "une forte proportion de jeunes";
  }
  if (/équipements/i.test(fact.sentence)) {
    return "une offre d'équipements recensée";
  }
  return fact.sentence.replace(/\.$/, "").toLowerCase();
}

export function pickSynthesisWatchPhrase(fact: QualifiedAnalysisFact): string {
  const issue = resolveIssueAfterA(fact);
  if (issue) {
    return issue;
  }
  return shortenWatchIssue(fact.sentence);
}

export function selectSynthesisWatchFacts(
  candidates: QualifiedAnalysisFact[],
  ctx: SectorRenderContext,
): QualifiedAnalysisFact[] {
  const eligible = candidates
    .filter(
      (fact) =>
        fact.target === "watchPoints" &&
        !isRadonRiskWatchFact(fact) &&
        passesWatchPointSelectionGates(fact, ctx.territory, ctx.territoryContext),
    )
    .sort((a, b) => scoreAnalysisFact(b, ctx) - scoreAnalysisFact(a, ctx));

  const picked: QualifiedAnalysisFact[] = [];
  let riskCount = 0;

  for (const fact of eligible) {
    if (picked.length >= MAX_SYNTHESIS_WATCH_FACTS) {
      break;
    }
    if (fact.theme === "risks") {
      if (riskCount >= 1) {
        continue;
      }
      riskCount += 1;
    }
    picked.push(fact);
  }

  return picked;
}

export function renderSynthesisFromFacts(
  facts: QualifiedAnalysisFact[],
  ctx: SectorRenderContext,
): string {
  const communeName = ctx.territory.name;

  const strengthFacts = facts
    .filter((fact) => fact.target === "strengths" || fact.polarity === "positive")
    .slice(0, 2);
  const watchFacts = selectSynthesisWatchFacts(
    facts.filter((fact) => fact.target === "watchPoints"),
    ctx,
  );

  const strengths = strengthFacts.map(pickSynthesisStrengthPhrase);
  const watches = watchFacts.map(pickSynthesisWatchPhrase);

  const strengthPart =
    strengths.length > 0
      ? `${communeName} combine ${strengths.join(" et ")}`
      : `${communeName} présente un profil territorial contrasté`;

  if (watches.length === 0) {
    return `${strengthPart}.`;
  }

  return `${strengthPart}, avec des enjeux liés ${joinFrenchPrepositionalList(watches)}.`;
}
