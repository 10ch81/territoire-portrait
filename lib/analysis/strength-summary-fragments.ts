import { formatFrenchPercentOneDecimal } from "../age-aggregates";
import { formatCount } from "./format";
import type { AnalysisFact } from "./types";

export const STRENGTH_SUMMARY_MAX_FRAGMENTS = 5;

function bindingValue(fact: AnalysisFact, labelPattern: RegExp): number | null {
  const match = fact.numericBindings?.find((item) => labelPattern.test(item.label));
  if (!match) return null;
  const value = typeof match.value === "number" ? match.value : Number.parseFloat(String(match.value));
  return Number.isFinite(value) ? value : null;
}

export function strengthSummaryFragment(fact: AnalysisFact): string | null {
  switch (fact.theme) {
    case "employment_sectors": {
      const posts = bindingValue(fact, /postes salariés/i);
      if (posts !== null) {
        return `${formatCount(Math.round(posts))} postes salariés`;
      }
      return "un volume important d'emplois salariés";
    }
    case "equipments": {
      const total = bindingValue(fact, /équipements BPE/i);
      if (total !== null) {
        return `${formatCount(Math.round(total))} équipements recensés`;
      }
      return "une offre conséquente en équipements";
    }
    case "health": {
      const count = bindingValue(fact, /établissements FINESS/i);
      if (count !== null) {
        return `${formatCount(Math.round(count))} établissements de santé recensés`;
      }
      return "une offre conséquente en santé";
    }
    case "education": {
      const count = bindingValue(fact, /établissements scolaires/i);
      if (count !== null) {
        return `${formatCount(Math.round(count))} établissements scolaires`;
      }
      return "une offre conséquente en enseignement";
    }
    case "demography": {
      if (!/moins de 30 ans/i.test(fact.sentence)) {
        return null;
      }
      const share = bindingValue(fact, /part moins de 30 ans/i);
      if (share !== null) {
        return `une part de ${formatFrenchPercentOneDecimal(share)} % de moins de 30 ans`;
      }
      return "une forte part de jeunes adultes";
    }
    default:
      return null;
  }
}

export function buildStrengthSummaryPhrase(strengths: AnalysisFact[]): string {
  const fragments = strengths
    .filter((fact) => fact.target === "strengths")
    .map(strengthSummaryFragment)
    .filter((fragment): fragment is string => fragment !== null)
    .slice(0, STRENGTH_SUMMARY_MAX_FRAGMENTS);

  if (fragments.length === 0) {
    return "des atouts documentés dans les sources consultées";
  }

  if (fragments.length === 1) {
    return fragments[0]!;
  }

  const head = fragments.slice(0, -1).join(", ");
  const tail = fragments[fragments.length - 1]!;
  return `${head} et ${tail}`;
}
