import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { buildAnalysisFacts } from "../lib/analysis/build-analysis-facts";
import { buildCanonicalAnalysisOutput } from "../lib/analysis/build-canonical-output";
import { selectAnalysisFactsForPrompt } from "../lib/analysis/select-facts";
import { getEnrichedTerritoryByInsee } from "../lib/enrichment";
import { analyzeTerritory } from "../lib/mistral";

function loadEnvLocal(): void {
  const envPath = resolve(process.cwd(), ".env.local");

  if (!existsSync(envPath)) {
    return;
  }

  const content = readFileSync(envPath, "utf-8");

  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function assertTypologyInSummary(territory: NonNullable<Awaited<ReturnType<typeof getEnrichedTerritoryByInsee>>>): void {
  const typologyLabel = territory.enrichment?.territoryTypology?.summaryLabel;
  console.log("Typologie:", typologyLabel ?? "—");

  if (!typologyLabel) {
    console.error("Typologie absente — vérifier data/cache/typology-by-commune.json");
    process.exit(1);
  }

  const facts = buildAnalysisFacts(territory);
  const selected = selectAnalysisFactsForPrompt(facts, territory);
  const canonical = buildCanonicalAnalysisOutput(territory, selected);

  console.log("Résumé déterministe (extrait):", canonical.summary.slice(0, 320));

  if (!canonical.summary.includes(typologyLabel)) {
    console.error("Le résumé déterministe n'intègre pas le fragment typologique attendu.");
    process.exit(1);
  }

  console.log("Fragment typologique présent dans le résumé déterministe.\n");
}

async function main(): Promise<void> {
  loadEnvLocal();

  const sampleInsee = "44109";
  console.log(`\n🔍 Chargement de la commune INSEE ${sampleInsee} (Nantes)…\n`);

  const territory = await getEnrichedTerritoryByInsee(sampleInsee);

  if (!territory) {
    console.error("Commune introuvable.");
    process.exit(1);
  }

  console.log("Territoire :", territory.name);
  console.log("Population :", territory.population ?? "Donnée non disponible");

  assertTypologyInSummary(territory);

  console.log("🤖 Appel Mistral…\n");

  const result = await analyzeTerritory(territory);

  if (!result.configured) {
    console.warn("⚠️", result.error);
    process.exit(0);
  }

  if (result.error) {
    console.error("❌", result.error);
    process.exit(1);
  }

  console.log(JSON.stringify(result.analysis, null, 2));
  console.log("\n✅ Analyse terminée.\n");
}

main().catch((error: unknown) => {
  console.error("Erreur inattendue :", error);
  process.exit(1);
});
