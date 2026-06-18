import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildAnalysisFacts } from "./build-analysis-facts";
import { saintGironsProfile } from "./fixtures";
import { selectAnalysisFactsForPrompt } from "./select-facts";

describe("selectAnalysisFactsForPrompt", () => {
  it("limite le volume et conserve sécurité + risques séparés", () => {
    const all = buildAnalysisFacts(saintGironsProfile);
    const selected = selectAnalysisFactsForPrompt(all);

    assert.ok(selected.length <= 20);
    assert.ok(selected.length >= 4);

    const security = selected.find((f) => f.theme === "security");
    const risks = selected.find((f) => f.theme === "risks");
    assert.ok(security);
    assert.ok(risks);
  });

  it("évite les doublons de thème identique", () => {
    const all = buildAnalysisFacts(saintGironsProfile);
    const selected = selectAnalysisFactsForPrompt(all);
    const signatures = selected.map((f) => `${f.theme}:${f.sentence.slice(0, 40)}`);
    assert.equal(signatures.length, new Set(signatures).size);
  });
});
