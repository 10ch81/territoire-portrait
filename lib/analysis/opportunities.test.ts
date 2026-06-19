import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "./build-analysis-facts";
import { createPanelProfile, saintGironsProfile } from "./fixtures";
import {
  buildOpportunityCandidates,
  dedupeOpportunityCandidates,
  selectOpportunities,
} from "./opportunities";
import { selectAnalysisFactsForPrompt } from "./select-facts";

const moduleDir = dirname(fileURLToPath(import.meta.url));

function selectedOpportunities(profile: ReturnType<typeof createPanelProfile>) {
  const facts = buildAnalysisFacts(profile);
  return selectAnalysisFactsForPrompt(facts, profile).filter(
    (fact) => fact.target === "opportunities",
  );
}

function buildCandidates(profile: ReturnType<typeof createPanelProfile>) {
  const facts = buildAnalysisFacts(profile);
  const selected = selectAnalysisFactsForPrompt(facts, profile);
  return buildOpportunityCandidates({
    territory: profile,
    allFacts: facts,
    selectedStrengths: selected.filter((fact) => fact.target === "strengths"),
    selectedWatchPoints: selected.filter((fact) => fact.target === "watchPoints"),
  });
}

describe("opportunities — scoring et sélection", () => {
  it("ne code aucune commune ni code INSEE dans le module opportunités", () => {
    const source = readFileSync(join(moduleDir, "opportunities.ts"), "utf8");
    assert.doesNotMatch(source, /\b0\d{4}\b/);
    assert.doesNotMatch(source, /Saint-Girons|09225|99025|99026/i);
  });

  it("tourisme — absent si capacité faible isolée", () => {
    const profile = createPanelProfile("lowTourismCapacity");
    const opportunities = selectedOpportunities(profile);

    assert.ok(
      !opportunities.some((fact) => fact.theme === "tourism"),
      "capacité touristique faible seule ne doit pas produire d'opportunité",
    );
  });

  it("tourisme — peut remonter si plusieurs signaux convergent", () => {
    const profile = createPanelProfile("tourist");
    const opportunities = selectedOpportunities(profile);

    assert.ok(opportunities.some((fact) => fact.theme === "tourism"));
  });

  it("fibre — ne remonte pas automatiquement sans point fort ni enjeu plus spécifique", () => {
    const profile = createPanelProfile("withArcep");
    const facts = buildAnalysisFacts(profile);
    const selected = selectAnalysisFactsForPrompt(facts, profile);
    const candidates = buildOpportunityCandidates({
      territory: profile,
      allFacts: facts,
      selectedStrengths: selected.filter((fact) => fact.target === "strengths"),
      selectedWatchPoints: selected.filter((fact) => fact.target === "watchPoints"),
    });
    const fiberCandidate = candidates.find((item) => item.fact.theme === "connectivity");

    if (fiberCandidate) {
      assert.ok(
        fiberCandidate.relatedStrengthThemes.includes("connectivity") ||
          fiberCandidate.opportunityScore < 5,
      );
    }
  });

  it("ESS/RGE — absent avec volumes faibles sans lien d'enjeu", () => {
    const profile = createPanelProfile("lowEssVolume");
    const opportunities = selectedOpportunities(profile);

    assert.ok(!opportunities.some((fact) => fact.theme === "ess_rge"));
  });

  it("ESS/RGE — peut remonter si volumes significatifs", () => {
    const opportunities = selectedOpportunities(saintGironsProfile);
    assert.ok(opportunities.some((fact) => fact.theme === "ess_rge"));
  });

  it("risques — score élevé si watchPoint risques sélectionné", () => {
    const profile = createPanelProfile("coastal");
    const candidates = buildCandidates(profile);
    const riskCandidate = candidates.find((item) => item.fact.theme === "risks");

    assert.ok(riskCandidate);
    assert.equal(riskCandidate!.kind, "responds_to_watchpoint");
    assert.ok(riskCandidate!.opportunityScore >= 5);
    assert.ok(selectedOpportunities(profile).some((fact) => fact.theme === "risks"));
  });

  it("logement — remonte seulement si vacance qualifiée défavorable", () => {
    const profile = createPanelProfile("residential");
    assert.ok(
      !selectedOpportunities(profile).some(
        (fact) => fact.theme === "housing" && /Réhabiliter/i.test(fact.sentence),
      ),
    );

    const rehab = selectedOpportunities(saintGironsProfile).find(
      (fact) => fact.theme === "housing",
    );
    assert.ok(rehab);
  });

  it("QPV — remonte seulement si QPV présent", () => {
    const profile = createPanelProfile("withQpv");
    const opportunities = selectedOpportunities(profile);

    assert.ok(opportunities.some((fact) => fact.theme === "policy_city"));
    assert.ok(
      !selectedOpportunities(createPanelProfile("withoutQpv")).some(
        (fact) => fact.theme === "policy_city",
      ),
    );
  });

  it("insertion emploi — remonte si chômage défavorable et ressources locales", () => {
    const opportunities = selectedOpportunities(saintGironsProfile);
    assert.ok(
      opportunities.some(
        (fact) =>
          fact.theme === "employment" ||
          (fact.theme === "ess_rge" && /insertion/i.test(fact.sentence)),
      ),
    );
  });

  it("fallback — deux opportunités solides suffisent", () => {
    const profile = createPanelProfile("twoNegativeEnjeux");
    const opportunities = selectedOpportunities(profile);

    assert.ok(opportunities.length >= 2);
    assert.ok(opportunities.length <= 4);
    assert.ok(!opportunities.some((fact) => fact.theme === "tourism"));
    assert.ok(!opportunities.some((fact) => fact.theme === "connectivity"));
  });

  it("déduplication — pas deux opportunités de même famille d'action", () => {
    const profile = saintGironsProfile;
    const candidates = buildCandidates(profile);
    const selected = selectOpportunities(candidates);
    const families = selected.map((item) => item.actionFamily);

    assert.equal(new Set(families).size, families.length);
    assert.equal(
      dedupeOpportunityCandidates(candidates).length,
      new Set(dedupeOpportunityCandidates(candidates).map((item) => item.actionFamily))
        .size,
    );
  });

  it("non-régression — résumé, strengths et watchPoints conservés", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const selected = selectAnalysisFactsForPrompt(facts, saintGironsProfile);

    assert.ok(selected.some((fact) => fact.target === "summary"));
    assert.ok(selected.filter((fact) => fact.target === "strengths").length >= 3);
    assert.ok(selected.filter((fact) => fact.target === "watchPoints").length >= 3);
    assert.ok(selected.filter((fact) => fact.target === "opportunities").length >= 2);
  });
});
