import { resolveAssetPhrase, resolveIssueAfterA } from "@/lib/analysis/summary-compose";
import { joinFrenchPrepositionalList } from "@/lib/analysis/render-text";
import type { QualifiedAnalysisFact } from "@/lib/analysis/types";

function shortenWatchIssue(sentence: string): string {
  const trimmed = sentence.replace(/\.$/, "").trim();
  if (/quartiers prioritaires/i.test(trimmed)) {
    return "aux quartiers prioritaires";
  }
  if (/chômage/i.test(trimmed)) {
    return "au chômage";
  }
  if (/inondation/i.test(trimmed)) {
    return "aux risques d'inondation";
  }
  if (/sécurité/i.test(trimmed)) {
    return "à la sécurité enregistrée";
  }
  if (/CATNAT|catastrophe naturelle/i.test(trimmed)) {
    return "aux risques naturels";
  }
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

export function pickSynthesisStrengthPhrase(fact: QualifiedAnalysisFact): string {
  const asset = resolveAssetPhrase(fact);
  if (asset) {
    return asset;
  }
  if (/postes salariés/i.test(fact.sentence)) {
    return "une base d'emploi salarié documentée";
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

export function renderSynthesisFromFacts(
  facts: QualifiedAnalysisFact[],
  communeName: string,
): string {
  const strengthFacts = facts
    .filter((fact) => fact.target === "strengths" || fact.polarity === "positive")
    .slice(0, 2);
  const watchFacts = facts
    .filter((fact) => fact.target === "watchPoints" || fact.polarity === "negative")
    .slice(0, 3);

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
