import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  computeDepartmentMedians,
  computeDepartmentMediansFromValues,
  findAplHeaderRowIndex,
  findLatestAplSheetName,
  formatAplConsultations,
  formatAplEtpPer100k,
  parseAplEtpRows,
  parseAplGeneralPractitionerRows,
} from "./apl";

describe("lib/apl", () => {
  it("détecte la feuille APL la plus récente", () => {
    assert.equal(
      findLatestAplSheetName(["Paramètres", "APL 2022", "APL 2023"]),
      "APL 2023",
    );
  });

  it("parse les lignes communales APL", () => {
    const rows = [
      ["Code commune INSEE", "Commune", "APL aux médecins généralistes"],
      ["", "", "En nombre de consultations/visites accessibles par habitant standardisé"],
      ["35238", "Rennes", 2.45, 2.1, 2.0, 1.8, 220000, 225000],
    ];

    assert.equal(findAplHeaderRowIndex(rows), 0);
    const communes = parseAplGeneralPractitionerRows(rows, 2023);
    assert.equal(communes["35238"]?.generalPractitioner.value, 2.45);
    assert.equal(communes["35238"]?.generalPractitioner.valueUnder65, 2.1);
  });

  it("calcule la médiane départementale", () => {
    const medians = computeDepartmentMedians({
      "35238": {
        generalPractitioner: {
          year: 2023,
          value: 2,
          valueUnder65: 1.8,
          standardizedPopulation: 100,
          referencePopulation: 100,
        },
      },
      "35001": {
        generalPractitioner: {
          year: 2023,
          value: 4,
          valueUnder65: 3.5,
          standardizedPopulation: 50,
          referencePopulation: 50,
        },
      },
    });

    assert.equal(medians["35"], 3);
  });

  it("formate les consultations APL", () => {
    assert.match(formatAplConsultations(1.942), /1,94\d? consultations \/ hab\. standardisé/);
    assert.equal(formatAplConsultations(null), "Donnée non disponible");
  });

  it("parse les lignes communales APL ETP", () => {
    const rows = [
      ["Code commune INSEE", "Commune", "APL aux infirmières"],
      ["", "", "En ETP pour 100 000 habitants standardisés"],
      ["35238", "Rennes", 125.4, 220000, 225000],
    ];

    const communes = parseAplEtpRows(rows, 2023);
    assert.equal(communes["35238"]?.value, 125.4);
    assert.equal(communes["35238"]?.standardizedPopulation, 220000);
  });

  it("calcule la médiane départementale depuis des valeurs brutes", () => {
    const medians = computeDepartmentMediansFromValues({
      "35238": 100,
      "35001": 200,
    });
    assert.equal(medians["35"], 150);
  });

  it("formate les ETP APL", () => {
    assert.match(formatAplEtpPer100k(125.4), /125,4 ETP \/ 100 000 hab\. standardisés/);
    assert.equal(formatAplEtpPer100k(null), "Donnée non disponible");
  });
});
