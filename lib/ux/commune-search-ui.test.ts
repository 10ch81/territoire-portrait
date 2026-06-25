import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPanelProfile } from "@/lib/analysis/fixtures";
import {
  buildCommuneSearchSuggestions,
  pickCommuneSearchInsee,
} from "./commune-search-ui";

describe("buildCommuneSearchSuggestions", () => {
  it("priorise les communes puis les adresses BAN", () => {
    const rennes = createPanelProfile("urbanDense");
    const suggestions = buildCommuneSearchSuggestions(
      {
        query: "rennes",
        matches: [rennes],
        resolved: null,
        addressMatches: [
          {
            label: "12 Rue de la Paix 35000 Rennes",
            inseeCode: "35238",
            communeName: "Rennes",
            postalCode: "35000",
            score: 0.9,
          },
        ],
      },
      2,
    );

    assert.equal(suggestions.length, 2);
    assert.equal(suggestions[0]?.kind, "commune");
    assert.equal(suggestions[1]?.kind, "address");
  });
});

describe("pickCommuneSearchInsee", () => {
  it("retombe sur une adresse BAN si aucune commune", () => {
    const insee = pickCommuneSearchInsee({
      query: "12 rue de la paix rennes",
      matches: [],
      resolved: null,
      addressMatches: [
        {
          label: "12 Rue de la Paix 35000 Rennes",
          inseeCode: "35238",
          communeName: "Rennes",
          postalCode: "35000",
          score: 0.9,
        },
      ],
    });

    assert.equal(insee, "35238");
  });
});
