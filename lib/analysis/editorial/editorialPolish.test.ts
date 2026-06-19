import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ESS_RGE_OPPORTUNITY_PATTERN,
  buildFinalTerritorialAnalysis,
} from "../evaluation-helpers";
import { bousseLikeProfile } from "../contextual-reference-profiles";
import {
  chamonixProfile,
  palaiseauProfile,
  rennesProfile,
} from "../reference-communes";
import type { TerritoryAnalysis } from "../../types";
import {
  EDITORIAL_OPPORTUNITY_MAX_LENGTH,
  findEditorialPolishViolations,
} from "./editorialPolish";

const MECHANICAL_PRUDENCE_SUFFIX = / — Interprétation prudente/i;
const ESS_RGE_LEVER_PATTERN = /\b(?:ESS|RGE)\b/i;

function requireEditorial(analysis: TerritoryAnalysis) {
  assert.ok(analysis.editorial, "couche editorial attendue");
  return analysis.editorial!;
}

function collectEditorialText(analysis: TerritoryAnalysis): string {
  const editorial = requireEditorial(analysis);
  return [
    editorial.summary,
    ...editorial.strengths,
    ...editorial.watchPoints,
    ...editorial.opportunities,
  ].join("\n");
}

function countOccurrences(text: string, needle: string): number {
  const normalized = text.toLowerCase();
  const target = needle.toLowerCase();
  let count = 0;
  let index = normalized.indexOf(target);
  while (index >= 0) {
    count += 1;
    index = normalized.indexOf(target, index + target.length);
  }
  return count;
}

describe("editorialPolish — garde-fous v2", () => {
  const profiles = [
    { label: "Rennes", profile: rennesProfile },
    { label: "Palaiseau", profile: palaiseauProfile },
    { label: "Chamonix", profile: chamonixProfile },
    { label: "Bousse", profile: bousseLikeProfile },
  ];

  for (const { label, profile } of profiles) {
    it(`${label} — aucune violation polish globale`, () => {
      const { analysis } = buildFinalTerritorialAnalysis(profile);
      const violations = findEditorialPolishViolations(requireEditorial(analysis));
      assert.equal(violations.length, 0, violations.join("; "));
    });
  }

  for (const { label, profile } of profiles) {
    it(`${label} — sortie v2 sans « portent à » ni ponctuation cassée`, () => {
      const { analysis } = buildFinalTerritorialAnalysis(profile);
      const text = collectEditorialText(analysis);
      assert.doesNotMatch(text, /\bportent à\b/i);
      assert.doesNotMatch(text, /\)\.,/);
      assert.doesNotMatch(text, /\.\./);
      assert.doesNotMatch(text, MECHANICAL_PRUDENCE_SUFFIX);
    });
  }

  for (const { label, profile } of profiles) {
    it(`${label} — opportunités v2 sous ${EDITORIAL_OPPORTUNITY_MAX_LENGTH} caractères`, () => {
      const { analysis } = buildFinalTerritorialAnalysis(profile);
      for (const opportunity of requireEditorial(analysis).opportunities) {
        assert.ok(
          opportunity.length <= EDITORIAL_OPPORTUNITY_MAX_LENGTH,
          `${label}: ${opportunity.length} car. — ${opportunity}`,
        );
      }
    });
  }
});

describe("editorialPolish — Rennes v2", () => {
  const { analysis } = buildFinalTerritorialAnalysis(rennesProfile);
  const editorial = requireEditorial(analysis);

  it("summary contient une centralité majeure", () => {
    assert.match(editorial.summary, /centralité majeure|grande centralité urbaine/i);
  });

  it("summary sans montagne ni touristique", () => {
    assert.doesNotMatch(editorial.summary, /montagne/i);
    assert.doesNotMatch(editorial.summary, /touristique/i);
  });

  it("pas deux opportunités v2 sur les quartiers prioritaires", () => {
    const qpvOpportunities = editorial.opportunities.filter((item) =>
      /quartiers prioritaires/i.test(item),
    );
    assert.ok(qpvOpportunities.length <= 1);
  });

  it("conserve une opportunité insertion/emploi/QPV si faits disponibles", () => {
    const hasEmploymentIssue =
      (rennesProfile.enrichment?.sociodemographics?.unemploymentRate ?? 0) >= 10 ||
      rennesProfile.enrichment?.urbanPolicy?.hasQpv === true;
    assert.ok(hasEmploymentIssue);
    assert.ok(
      editorial.opportunities.some((item) =>
        /insertion|emploi|quartiers prioritaires/i.test(item),
      ),
    );
  });

  it("v2 ne réintroduit pas ESS/RGE générique", () => {
    assert.ok(!editorial.strengths.some((item) => ESS_RGE_LEVER_PATTERN.test(item)));
    assert.ok(
      !editorial.opportunities.some((item) => ESS_RGE_OPPORTUNITY_PATTERN.test(item)),
    );
  });
});

describe("editorialPolish — Palaiseau v2", () => {
  const { analysis } = buildFinalTerritorialAnalysis(palaiseauProfile);
  const editorial = requireEditorial(analysis);

  it("summary sans touristique", () => {
    assert.doesNotMatch(editorial.summary, /touristique/i);
  });

  it("summary sans double « avec » maladroite", () => {
    assert.doesNotMatch(editorial.summary, /, avec [^,]+, avec /i);
  });

  it("opportunité v2 courte et centrée croissance/équipements/centralité", () => {
    const opportunity = editorial.opportunities[0] ?? "";
    assert.ok(opportunity.length <= EDITORIAL_OPPORTUNITY_MAX_LENGTH);
    assert.match(opportunity, /croissance/i);
    assert.match(opportunity, /équipements|services/i);
    assert.match(opportunity, /centralité|emploi/i);
  });

  it("opportunité v2 sans empilement des cinq enjeux", () => {
    const opportunity = (editorial.opportunities[0] ?? "").toLowerCase();
    const themes = [
      "croissance",
      "équipements",
      "base d'emploi",
      "risques naturels",
      "sécurité",
    ];
    assert.ok(!themes.every((theme) => opportunity.includes(theme)));
  });

  it("v2 ne réintroduit pas ESS/RGE générique", () => {
    assert.ok(!editorial.strengths.some((item) => ESS_RGE_LEVER_PATTERN.test(item)));
    assert.ok(
      !editorial.opportunities.some((item) => ESS_RGE_OPPORTUNITY_PATTERN.test(item)),
    );
  });
});

describe("editorialPolish — Chamonix v2", () => {
  const { analysis } = buildFinalTerritorialAnalysis(chamonixProfile);
  const editorial = requireEditorial(analysis);

  it("summary contient ville-centre de montagne ou vocation touristique", () => {
    assert.match(
      editorial.summary,
      /ville-centre de montagne|vocation touristique/i,
    );
  });

  it("summary ne répète pas exactement le label typologique en parenthèse", () => {
    const label = "ville-centre de montagne à forte vocation touristique";
    assert.ok(countOccurrences(editorial.summary, label) <= 1);
    for (const match of editorial.summary.matchAll(/\(([^)]+)\)/g)) {
      const inner = match[1]?.trim() ?? "";
      if (inner.length === 0) continue;
      assert.ok(
        !editorial.summary
          .slice(0, match.index)
          .toLowerCase()
          .includes(inner.toLowerCase()),
        `parenthèse redondante: (${inner})`,
      );
    }
  });

  it("opportunité tourisme disponible", () => {
    assert.ok(
      editorial.opportunities.some((item) => /tourisme|hébergement|fréquentation/i.test(item)),
    );
  });

  it("v2 ne réintroduit pas ESS/RGE générique", () => {
    assert.ok(!editorial.strengths.some((item) => ESS_RGE_LEVER_PATTERN.test(item)));
    assert.ok(
      !editorial.opportunities.some((item) => ESS_RGE_OPPORTUNITY_PATTERN.test(item)),
    );
  });
});

describe("editorialPolish — Bousse v2", () => {
  const { analysis } = buildFinalTerritorialAnalysis(bousseLikeProfile);
  const editorial = requireEditorial(analysis);

  it("summary contient petite commune ou couronne périurbaine", () => {
    assert.match(editorial.summary, /petite commune|couronne périurbaine|périurbain/i);
  });

  it("points forts v2 ne sont pas tous des copies MVP", () => {
    const distinct = editorial.strengths.filter(
      (item, index) => item !== analysis.strengths[index],
    );
    assert.ok(distinct.length > 0, editorial.strengths.join(" | "));
  });

  it("points forts v2 sans suffixe de prudence mécanique", () => {
    for (const strength of editorial.strengths) {
      assert.doesNotMatch(strength, MECHANICAL_PRUDENCE_SUFFIX);
    }
  });

  it("MVP conserve la prudence sécurité petits effectifs", () => {
    const securityWatch = analysis.watchPoints.find((item) => /sécurité|SSMSI/i.test(item));
    assert.ok(securityWatch);
    assert.match(securityWatch!, /faible volume de faits|diffusion partielle/i);
  });
});

describe("editorialPolish — MVP inchangé", () => {
  it("Rennes MVP summary distinct de v2", () => {
    const { analysis } = buildFinalTerritorialAnalysis(rennesProfile);
    assert.notEqual(analysis.summary, requireEditorial(analysis).summary);
  });
});
