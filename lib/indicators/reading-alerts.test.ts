import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createPanelProfile } from "@/lib/analysis/fixtures";
import { collectTerritoryReadingAlerts } from "./reading-alerts";

describe("collectTerritoryReadingAlerts", () => {
  it("signale une forte part de résidences secondaires", () => {
    const territory = createPanelProfile("urbanDense");
    territory.enrichment!.housing = {
      ...territory.enrichment!.housing!,
      secondaryResidenceSharePercent: 25,
    };
    const alerts = collectTerritoryReadingAlerts(territory);
    assert.ok(alerts.some((alert) => /résidences secondaires/i.test(alert)));
  });

  it("signale les petites communes", () => {
    const territory = createPanelProfile("urbanDense");
    territory.population = 400;
    const alerts = collectTerritoryReadingAlerts(territory);
    assert.ok(alerts.some((alert) => /500 hab/i.test(alert)));
  });
});
