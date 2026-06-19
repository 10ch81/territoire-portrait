import { ENRICHMENT_SECTIONS } from "./sections";

export interface DataLimitSectionLink {
  sectionId: string;
  sectionLabel: string;
}

interface LimitLinkRule {
  pattern: RegExp;
  sectionId: string;
}

const LIMIT_LINK_RULES: LimitLinkRule[] = [
  { pattern: /^Sécurité \(SSMSI\)/, sectionId: "securite" },
  { pattern: /^(Prix DVF|Indicateurs immobiliers \(DVF\))/, sectionId: "immobilier" },
  { pattern: /^Économie :|^Données économiques SIRENE|^FLORES INSEE/, sectionId: "economie" },
  { pattern: /^Équipements BPE|^Scolarisation \(Annuaire/, sectionId: "equipements" },
  { pattern: /^Données RPLS|^LOVAC :/, sectionId: "logement" },
  { pattern: /^(Fiscalité locale|Comptes publics OFGL|Finances locales)/, sectionId: "fiscalite" },
  { pattern: /^Données de risques/, sectionId: "risques" },
  { pattern: /^(Mobilité domicile-travail|Couverture fibre|Données de mobilité)/, sectionId: "mobilite" },
  { pattern: /^FINESS|^APL DREES/, sectionId: "sante" },
  { pattern: /^QPV :/, sectionId: "politique-ville" },
  { pattern: /^Tourisme :/, sectionId: "tourisme" },
  {
    pattern: /^(Données socio-démographiques|Taux de chômage|Niveau de vie médian|France Travail|CNAF|Historique de population|Population affichée)/,
    sectionId: "demographie",
  },
  { pattern: /^Zonage en aire d'attraction|^La typologie/, sectionId: "geographie" },
];

const SECTION_LABELS = new Map(
  ENRICHMENT_SECTIONS.map((section) => [section.id, section.label]),
);

export function resolveDataLimitSectionLink(
  message: string,
): DataLimitSectionLink | null {
  const rule = LIMIT_LINK_RULES.find(({ pattern }) => pattern.test(message));
  if (!rule) {
    return null;
  }

  const sectionLabel = SECTION_LABELS.get(rule.sectionId);
  if (!sectionLabel) {
    return null;
  }

  return {
    sectionId: rule.sectionId,
    sectionLabel,
  };
}
