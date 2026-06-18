export const ACRONYMS: Record<string, string> = {
  BPE: "Base permanente des équipements — recensement INSEE des équipements et services",
  RPLS: "Répertoire des logements locatifs des bailleurs sociaux",
  IRVE: "Infrastructure de recharge pour véhicules électriques",
  DVF: "Demandes de valeurs foncières — transactions immobilières",
  AAV: "Aire d'attraction des villes — zonage INSEE",
  REI: "Relevé des éléments d'imposition — fiscalité locale",
  EPCI: "Établissement public de coopération intercommunale",
  ESS: "Économie sociale et solidaire",
  RGE: "Reconnu garant de l'environnement",
  SIRENE: "Répertoire des entreprises et établissements (INSEE)",
  INSEE: "Institut national de la statistique et des études économiques",
  AZI: "Atlas des zones inondables",
  CATNAT: "Catastrophes naturelles — régime d'indemnisation",
  SSMSI: "Service statistique ministériel de la sécurité intérieure — délinquance enregistrée",
  GTFS: "General Transit Feed Specification — arrêts de transport collectif open data",
  QPV: "Quartier prioritaire de la politique de la ville",
};

export function getAcronymDefinition(term: string): string | undefined {
  return ACRONYMS[term.toUpperCase()];
}
