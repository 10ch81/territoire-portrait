import type { TerritoryProfile } from "../types";
import type { AnalysisFact } from "./types";
import { resetFactCounter } from "./builders/utils";
import { buildIdentityFacts } from "./builders/identity";
import { buildCentralityFacts } from "./builders/centrality";
import { buildDemographyFacts } from "./builders/demography";
import { buildAgeingFacts } from "./builders/ageing";
import { buildEconomyFacts, buildEssRgeFacts } from "./builders/economy";
import { buildEmploymentSectorsFacts } from "./builders/employment-sectors";
import { buildConnectivityFacts } from "./builders/connectivity";
import { buildHealthFacts } from "./builders/health";
import { buildEducationFacts } from "./builders/education";
import { buildEquipmentFacts } from "./builders/equipments";
import { buildHousingFacts, buildSocialHousingFacts } from "./builders/housing";
import { buildSecurityFacts } from "./builders/security";
import { buildRiskFacts } from "./builders/risks";
import { buildMobilityFacts, buildEnergyFacts } from "./builders/mobility";
import { buildTourismFacts } from "./builders/tourism";
import { buildRealEstateFacts } from "./builders/real-estate";
import {
  buildEmploymentFacts,
  buildIncomeFacts,
} from "./builders/income-employment";
import {
  buildFinancesFacts,
  buildPolicyCityFacts,
  buildPublicServicesFacts,
} from "./builders/misc";
import { buildOpportunityFacts } from "./builders/opportunities";

type FactBuilder = (territory: TerritoryProfile) => AnalysisFact[];

const BUILDERS: FactBuilder[] = [
  buildIdentityFacts,
  buildCentralityFacts,
  buildDemographyFacts,
  buildAgeingFacts,
  buildIncomeFacts,
  buildEmploymentFacts,
  buildEconomyFacts,
  buildEssRgeFacts,
  buildEmploymentSectorsFacts,
  buildEquipmentFacts,
  buildEducationFacts,
  buildHealthFacts,
  buildHousingFacts,
  buildSocialHousingFacts,
  buildSecurityFacts,
  buildRiskFacts,
  buildMobilityFacts,
  buildConnectivityFacts,
  buildEnergyFacts,
  buildTourismFacts,
  buildRealEstateFacts,
  buildPublicServicesFacts,
  buildPolicyCityFacts,
  buildFinancesFacts,
  buildOpportunityFacts,
];

export function buildAnalysisFacts(territory: TerritoryProfile): AnalysisFact[] {
  resetFactCounter();
  return BUILDERS.flatMap((builder) => builder(territory));
}
