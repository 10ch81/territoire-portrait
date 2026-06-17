export interface GoldenCommune {
  inseeCode: string;
  name: string;
  motif: string;
}

export const GOLDEN_COMMUNES: GoldenCommune[] = [
  {
    inseeCode: "35238",
    name: "Rennes",
    motif: "ville moyenne — exemple principal",
  },
  {
    inseeCode: "44109",
    name: "Nantes",
    motif: "métropole",
  },
  {
    inseeCode: "75056",
    name: "Paris",
    motif: "très grande commune",
  },
  {
    inseeCode: "01001",
    name: "L'Abergement-Clémenciat",
    motif: "commune rurale",
  },
];

/** Commune de référence pour les tests rapides (`npm run quality:sample`). */
export const SAMPLE_QUALITY_COMMUNE: GoldenCommune = GOLDEN_COMMUNES[0];
