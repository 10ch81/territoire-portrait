import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { saintGironsProfile } from "@/lib/analysis/fixtures";
import {
  buildPortraitHybridPayload,
  buildPortraitLabelsText,
} from "./build-portrait-payload";
import { parsePortraitContent } from "./parse-portrait";
import { portraitNarrativeModel } from "./generate-portrait";
import { stripEmpty } from "./strip-empty";

describe("stripEmpty", () => {
  it("supprime null, chaînes vides et objets vides", () => {
    const input = {
      a: null,
      b: "",
      c: "valeur",
      d: { e: undefined, f: [] },
      g: [1, null, "", 2],
    };

    const result = stripEmpty(input);
    assert.deepEqual(result, {
      c: "valeur",
      g: [1, 2],
    });
  });
});

describe("buildPortraitPayload", () => {
  it("inclut identité et KPI sans sources", () => {
    const labels = buildPortraitLabelsText(saintGironsProfile);
    const hybrid = buildPortraitHybridPayload(saintGironsProfile);

    assert.match(labels, /Identité/);
    assert.match(labels, /Saint-Girons/);
    assert.match(labels, /KPI principaux/);
    assert.match(hybrid, /Données structurées/);
    assert.doesNotMatch(hybrid, /"sources"/);
    assert.doesNotMatch(hybrid, /https?:\/\//);
    assert.doesNotMatch(hybrid, /dataLimits/);
  });

  it("n'inclut pas les coordonnées ni la centralité interne", () => {
    const hybrid = buildPortraitHybridPayload(saintGironsProfile);

    assert.doesNotMatch(hybrid, /coordonnees/);
    assert.doesNotMatch(hybrid, /centraliteTerritoriale/);
  });
});

describe("parsePortraitContent", () => {
  it("extrait titre et paragraphes", () => {
    const content = `Portrait de la commune

Premier paragraphe sur la démographie.

Deuxième paragraphe sur l'économie.`;

    const parsed = parsePortraitContent(content);

    assert.equal(parsed.title, "Portrait de la commune");
    assert.deepEqual(parsed.paragraphs, [
      "Premier paragraphe sur la démographie.",
      "Deuxième paragraphe sur l'économie.",
    ]);
  });

  it("tolère un titre markdown", () => {
    const parsed = parsePortraitContent("# Un titre\n\nUn paragraphe.");

    assert.equal(parsed.title, "Un titre");
    assert.deepEqual(parsed.paragraphs, ["Un paragraphe."]);
  });
});

describe("portraitNarrativeModel", () => {
  it("utilise le mode déterministe sectoriel", () => {
    assert.equal(portraitNarrativeModel, "deterministic-sectorial");
  });
});
