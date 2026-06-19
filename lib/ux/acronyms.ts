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
  SIRENE: "Répertoire administratif des entreprises et établissements (INSEE) — complément, pas indicateur de dynamisme économique",
  INSEE: "Institut national de la statistique et des études économiques",
  AZI: "Atlas des zones inondables",
  CATNAT: "Catastrophes naturelles — régime d'indemnisation",
  SSMSI: "Service statistique ministériel de la sécurité intérieure — délinquance enregistrée",
  FILOSOFI: "Fichier localisé social et fiscal — revenus INSEE",
  OFGL: "Observatoire des finances et de la gestion publique locales",
  SIDE: "Système d'information sur la démographie des entreprises (INSEE)",
  FLORES: "Fichier localisé des rémunérations et de l'emploi salarié — secteurs A17 INSEE",
  FINESS: "Fichier national des établissements sanitaires et sociaux",
  QPV: "Quartier prioritaire de la politique de la ville",
  PVD: "Petites villes de demain — programme ANCT de revitalisation des centralités",
  ACV: "Action cœur de ville — programme ANCT de revitalisation des centres-villes",
  FRR: "France Ruralités Revitalisation — zonage de soutien aux territoires ruraux",
  UU: "Unité urbaine — agglomération au sens INSEE (UU2020)",
  LOVAC: "Logements vacants du parc privé — base Cerema croisant fichiers fiscaux et fonciers",
};

export function getAcronymDefinition(term: string): string | undefined {
  return ACRONYMS[term.toUpperCase()];
}
