import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "./build-analysis-facts";
import { ruralProfileMinimal, saintGironsProfile } from "./fixtures";

describe("buildAnalysisFacts", () => {
  it("Saint-Girons — évolution démographique distincte de la part 60+", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const demography = facts.find((f) => f.theme === "demography");
    const ageing = facts.find((f) => f.theme === "ageing");

    assert.ok(demography);
    assert.ok(ageing);
    assert.match(demography!.sentence, /-5,7\s*%/);
    assert.match(demography!.sentence, /2010.*2022/);
    assert.match(ageing!.sentence, /38,1\s*%/);
    assert.match(ageing!.sentence, /60 ans et plus/);
    assert.doesNotMatch(demography!.sentence, /38,1/);
    assert.doesNotMatch(ageing!.sentence, /recul|baisse/);
  });

  it("Saint-Girons — SIDE et ESS/RGE produisent deux constats séparés", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const side = facts.find((f) => f.theme === "economy");
    const ess = facts.find((f) => f.theme === "ess_rge");

    assert.ok(side);
    assert.ok(ess);
    assert.match(side!.sentence, /658.*entreprises/);
    assert.match(side!.sentence, /749.*établissements/);
    assert.match(side!.sentence, /SIDE/);
    assert.match(ess!.sentence, /289.*ESS/);
    assert.match(ess!.sentence, /12.*RGE/);
    assert.doesNotMatch(side!.sentence, /ESS/);
  });

  it("Saint-Girons — FLORES séparé de SIDE", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const flores = facts.find((f) => f.theme === "employment_sectors");

    assert.ok(flores);
    assert.match(flores!.sentence, /FLORES/);
    assert.match(flores!.sentence, /postes salariés/);
    assert.doesNotMatch(flores!.sentence, /unités légales/);
  });

  it("Saint-Girons — BPE équipements totaux", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const bpe = facts.find(
      (f) => f.theme === "equipments" && f.sentence.includes("515"),
    );

    assert.ok(bpe);
    assert.match(bpe!.sentence, /515.*équipements/);
    assert.match(bpe!.sentence, /BPE/);
  });

  it("Saint-Girons — RPLS zéro sans absence de logements sociaux", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const rpls = facts.find((f) => f.theme === "social_housing");

    assert.ok(rpls);
    assert.match(rpls!.sentence, /Aucun logement locatif social.*RPLS/i);
    assert.doesNotMatch(rpls!.sentence, /absence de logements sociaux/i);
  });

  it("Saint-Girons — logements vacants", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const housing = facts.find(
      (f) => f.theme === "housing" && f.sentence.includes("vacants"),
    );

    assert.ok(housing);
    assert.match(housing!.sentence, /18,8\s*%/);
    assert.match(housing!.sentence, /vacants/i);
  });

  it("Saint-Girons — SSMSI et risques séparés", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const security = facts.find((f) => f.theme === "security");
    const risks = facts.find((f) => f.theme === "risks");

    assert.ok(security);
    assert.ok(risks);
    assert.match(security!.sentence, /SSMSI/);
    assert.match(risks!.sentence, /CATNAT/i);
    assert.doesNotMatch(security!.sentence, /CATNAT/i);
    assert.doesNotMatch(risks!.sentence, /SSMSI/i);
  });

  it("Saint-Girons — mobilité et connectivité ARCEP séparés", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const mobility = facts.find(
      (f) => f.theme === "mobility" && f.sentence.includes("voiture"),
    );
    const connectivity = facts.find((f) => f.theme === "connectivity");

    assert.ok(mobility);
    assert.ok(connectivity);
    assert.match(mobility!.sentence, /69,3\s*%/);
    assert.match(connectivity!.sentence, /ARCEP/);
    assert.match(connectivity!.sentence, /locaux sont raccordables à la fibre/i);
    assert.doesNotMatch(connectivity!.sentence, /voiture/i);
  });

  it("Saint-Girons — FINESS et Éducation", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const health = facts.find((f) => f.theme === "health");
    const education = facts.find((f) => f.theme === "education");

    assert.ok(health);
    assert.ok(education);
    assert.match(health!.sentence, /FINESS/);
    assert.doesNotMatch(health!.sentence, /accessibilité aux soins/i);
    assert.match(education!.sentence, /5.*établissements scolaires/);
  });

  it("Saint-Girons — tourisme prudent", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const tourism = facts.filter((f) => f.theme === "tourism");

    assert.ok(tourism.length >= 1);
    const descriptive = tourism.filter((f) => f.target !== "opportunities");
    const allText = descriptive.map((f) => f.sentence).join(" ");
    assert.match(allText, /75.*hébergement/i);
    assert.doesNotMatch(allText, /sous-exploité/i);
    assert.doesNotMatch(allText, /approfondir, faute de/i);
  });

  it("Saint-Girons — DVF indicatif", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const dvf = facts.find((f) => f.theme === "real_estate");

    assert.ok(dvf);
    assert.match(dvf!.sentence, /114.*ventes immobilières/);
    assert.match(dvf!.sentence, /1\s429.*€\/m²/);
    assert.doesNotMatch(dvf!.sentence, /marché actif|prix stables/i);
  });

  it("Saint-Girons — SSMSI supérieur département uniquement si taux communal > département (+10 %)", () => {
    const facts = buildAnalysisFacts(saintGironsProfile);
    const security = facts.find((f) => f.theme === "security");

    assert.ok(security);
    assert.match(security!.sentence, /^Un indicateur de sécurité —/);
    assert.match(security!.sentence, /dépasse la référence départementale/);
  });

  it("commune sans enrichissement — aucun constat thématique", () => {
    const facts = buildAnalysisFacts(ruralProfileMinimal);

    assert.ok(facts.some((f) => f.theme === "identity"));
    assert.equal(facts.some((f) => f.theme === "demography"), false);
  });
});
