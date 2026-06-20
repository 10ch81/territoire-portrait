import type { EditorialProfileId } from "@/lib/types";

export type PortraitSectorId =
  | "identity"
  | "demography"
  | "economy"
  | "social_fragility"
  | "equipments"
  | "health"
  | "housing"
  | "mobility"
  | "environmental_risks"
  | "security"
  | "tourism"
  | "public_finances"
  | "synthesis";

export interface PortraitSectorBlock {
  id: PortraitSectorId;
  index: number;
  title: string;
  paragraph: string;
  factIds: string[];
  omittedReason?: string;
}

export interface PortraitClosingSynthesis {
  resume: string;
  watchPoints: string[];
  opportunities: string[];
}

export interface PortraitNarrative {
  title: string;
  paragraphs: string[];
  sectors?: PortraitSectorBlock[];
  closingSynthesis?: PortraitClosingSynthesis;
  profileId?: EditorialProfileId;
  generatedBy: "deterministic" | "mistral_polish";
  dataLimits?: string[];
}

export interface PortraitGenerationResult {
  portrait: PortraitNarrative | null;
  error?: string;
}
