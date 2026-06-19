import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSourceVintageResult,
  extractYearsFromText,
  maxYear,
  replaceEmbeddedYear,
  replaceInseeCommunalYear,
} from "./source-vintage-discovery";

describe("source-vintage-discovery", () => {
  it("extractYearsFromText ignore les années hors plage", () => {
    assert.deepEqual(
      extractYearsFromText("Millésime 2023, recensement 1999, projection 2110"),
      [2023],
    );
  });

  it("maxYear retourne null si aucune année", () => {
    assert.equal(maxYear([]), null);
    assert.equal(maxYear(extractYearsFromText("sans date")), null);
  });

  it("replaceEmbeddedYear remplace le millésime Melodi", () => {
    assert.equal(
      replaceEmbeddedYear(
        "https://api.insee.fr/melodi/file/DS_BPE/DS_BPE_2024_CSV_FR",
        2025,
      ),
      "https://api.insee.fr/melodi/file/DS_BPE/DS_BPE_2025_CSV_FR",
    );
  });

  it("replaceInseeCommunalYear remplace le millésime RP", () => {
    assert.equal(
      replaceInseeCommunalYear(
        "https://www.insee.fr/fr/statistiques/fichier/8581696/base-cc-evol-struct-pop-2022_csv.zip",
        2023,
      ),
      "https://www.insee.fr/fr/statistiques/fichier/8581696/base-cc-evol-struct-pop-2023_csv.zip",
    );
  });

  it("buildSourceVintageResult classe update_available", () => {
    const result = buildSourceVintageResult({
      id: "filosofi",
      label: "FILOSOFI",
      supportedVintage: 2023,
      discoveredVintage: 2024,
      discoveryMethod: "test",
      referenceUrl: "https://example.com",
      ingestScript: "ingest-social.ts",
      adoptionHint: "hint",
    });

    assert.equal(result.status, "update_available");
  });

  it("buildSourceVintageResult classe current si millésime identique", () => {
    const result = buildSourceVintageResult({
      id: "bpe",
      label: "BPE",
      supportedVintage: 2024,
      discoveredVintage: 2024,
      discoveryMethod: "test",
      referenceUrl: "https://example.com",
      ingestScript: "ingest-bpe.ts",
      adoptionHint: "hint",
    });

    assert.equal(result.status, "current");
  });
});
