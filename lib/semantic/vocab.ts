/** Préfixe vocabulaire applicatif (JSON-LD, sans ontologie RDF externe). */
export const TERRITOIRE_PORTRAIT_VOCAB = "https://w3id.org/territoire-portrait/vocab#";

export const JSONLD_CONTEXT = {
  "@vocab": "https://schema.org/",
  tp: TERRITOIRE_PORTRAIT_VOCAB,
  observation: { "@id": "tp:observation", "@container": "@set" },
  comparisonObservation: { "@id": "tp:comparisonObservation", "@container": "@set" },
  valuesByCommune: { "@id": "tp:valuesByCommune", "@container": "@set" },
  highlights: { "@id": "tp:highlights", "@container": "@set" },
  readingLimits: { "@id": "tp:readingLimits", "@container": "@set" },
  priorities: { "@id": "tp:priorities", "@container": "@set" },
  vintage: "tp:vintage",
  fragile: "tp:fragile",
  sensitive: "tp:sensitive",
  scale: "tp:scale",
  departmentRank: "tp:departmentRank",
  sourceDataset: { "@id": "tp:sourceDataset", "@type": "@id" },
  block: "tp:block",
  generatedAt: "tp:generatedAt",
  valueType: "tp:valueType",
} as const;
