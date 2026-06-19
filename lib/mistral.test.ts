import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { buildFinalTerritorialAnalysis } from "./analysis/evaluation-helpers";
import { saintGironsProfile } from "./analysis/fixtures";
import { analyzeTerritory } from "./mistral";

const originalFetch = globalThis.fetch;
const envSnapshot = {
  apiKey: process.env.MISTRAL_API_KEY,
  model: process.env.MISTRAL_MODEL,
};

function restoreEnv(): void {
  if (envSnapshot.apiKey === undefined) {
    delete process.env.MISTRAL_API_KEY;
  } else {
    process.env.MISTRAL_API_KEY = envSnapshot.apiKey;
  }

  if (envSnapshot.model === undefined) {
    delete process.env.MISTRAL_MODEL;
  } else {
    process.env.MISTRAL_MODEL = envSnapshot.model;
  }
}

function mockMistralFetch(
  handler: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
): void {
  globalThis.fetch = handler as typeof fetch;
}

function mistralSuccessResponse(content: string): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("analyzeTerritory — repli canonique", () => {
  beforeEach(() => {
    process.env.MISTRAL_API_KEY = "test-key";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    restoreEnv();
  });

  it("sans MISTRAL_API_KEY retourne la sortie canonique avec listes", async () => {
    delete process.env.MISTRAL_API_KEY;

    const expected = buildFinalTerritorialAnalysis(saintGironsProfile);
    const result = await analyzeTerritory(saintGironsProfile);

    assert.equal(result.configured, false);
    assert.equal(result.llmUsed, false);
    assert.equal(result.degraded, true);
    assert.ok(result.error);
    assert.equal(result.analysis?.summary, expected.analysis.summary);
    assert.deepEqual(result.analysis?.strengths, expected.analysis.strengths);
    assert.deepEqual(result.analysis?.watchPoints, expected.analysis.watchPoints);
    assert.deepEqual(result.analysis?.opportunities, expected.analysis.opportunities);
    assert.ok(result.analysis!.summary.trim().length > 0);
    assert.ok(result.analysis!.strengths.length > 0);
  });

  it("erreur HTTP Mistral retourne la sortie canonique", async () => {
    mockMistralFetch(async () => new Response("quota exceeded", { status: 429 }));

    const expected = buildFinalTerritorialAnalysis(saintGironsProfile);
    const result = await analyzeTerritory(saintGironsProfile);

    assert.equal(result.configured, true);
    assert.equal(result.llmUsed, false);
    assert.equal(result.degraded, true);
    assert.match(result.error ?? "", /statut 429/);
    assert.equal(result.analysis?.summary, expected.analysis.summary);
    assert.deepEqual(result.analysis?.strengths, expected.analysis.strengths);
    assert.deepEqual(result.analysis?.watchPoints, expected.analysis.watchPoints);
    assert.deepEqual(result.analysis?.opportunities, expected.analysis.opportunities);
  });

  it("JSON invalide Mistral retourne la sortie canonique", async () => {
    mockMistralFetch(async () => mistralSuccessResponse("pas du json {"));

    const expected = buildFinalTerritorialAnalysis(saintGironsProfile);
    const result = await analyzeTerritory(saintGironsProfile);

    assert.equal(result.configured, true);
    assert.equal(result.llmUsed, false);
    assert.equal(result.degraded, true);
    assert.match(result.error ?? "", /JSON mal formé/);
    assert.equal(result.analysis?.summary, expected.analysis.summary);
    assert.deepEqual(result.analysis?.strengths, expected.analysis.strengths);
    assert.deepEqual(result.analysis?.watchPoints, expected.analysis.watchPoints);
    assert.deepEqual(result.analysis?.opportunities, expected.analysis.opportunities);
  });
});
