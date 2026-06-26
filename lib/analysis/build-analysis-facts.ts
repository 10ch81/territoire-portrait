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
import { buildHealthcareAccessFacts } from "./builders/healthcare-access";
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
  buildLabourMarketFacts,
  buildSocialBenefitsFacts,
} from "./builders/income-employment";
import {
  buildFinancesFacts,
  buildPolicyCityFacts,
  buildPublicServicesFacts,
} from "./builders/misc";
import { buildOpportunityFacts } from "./builders/opportunities";
import { buildTypologyFacts } from "./builders/typology";
import { enrichFactsWithSummaryFragments } from "./summary-fragments";

type FactBuilder = (territory: TerritoryProfile) => AnalysisFact[];

const BUILDERS: FactBuilder[] = [
  buildIdentityFacts,
  buildTypologyFacts,
  buildCentralityFacts,
  buildDemographyFacts,
  buildAgeingFacts,
  buildIncomeFacts,
  buildEmploymentFacts,
  buildLabourMarketFacts,
  buildSocialBenefitsFacts,
  buildEconomyFacts,
  buildEssRgeFacts,
  buildEmploymentSectorsFacts,
  buildEquipmentFacts,
  buildEducationFacts,
  buildHealthFacts,
  buildHealthcareAccessFacts,
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
  const facts = BUILDERS.flatMap((builder) => builder(territory));
  return enrichFactsWithSummaryFragments(facts, territory);
}
