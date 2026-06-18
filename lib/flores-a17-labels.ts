/** Libellés INSEE — 17 grands secteurs d'activité (A17, FLORES). */
export const FLORES_A17_LABELS: Record<string, string> = {
  AZ: "Agriculture, sylviculture et pêche",
  BE: "Industries extractives, énergie, eau, gestion des déchets",
  C1: "Industries agro-alimentaires",
  C2: "Chimie, pharmacie, coke et raffinage",
  C3: "Industries électriques, électroniques, informatiques",
  C4: "Fabrication de machines et équipements",
  C5: "Autres industries manufacturières",
  DE: "Production et distribution d'énergie",
  FZ: "Construction",
  GZ: "Commerce et réparation automobile",
  HZ: "Transports et entreposage",
  IZ: "Hébergement et restauration",
  JZ: "Information et communication",
  KZ: "Activités financières et d'assurance",
  LZ: "Activités immobilières",
  MN: "Activités spécialisées, scientifiques et techniques",
  OQ: "Administration publique, enseignement, santé, action sociale",
  RU: "Autres activités de services",
};

export function getFloresA17Label(code: string): string {
  return FLORES_A17_LABELS[code] ?? code;
}
