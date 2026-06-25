/** Préfixe vocabulaire applicatif (JSON-LD, sans ontologie RDF externe). */
export const TERRITOIRE_PORTRAIT_VOCAB = "https://w3id.org/territoire-portrait/vocab#";

export const JSONLD_CONTEXT = {
  "@vocab": "https://schema.org/",
  tp: TERRITOIRE_PORTRAIT_VOCAB,
  observation: { "@id": "tp:observation", "@container": "@set" },
  vintage: "tp:vintage",
  fragile: "tp:fragile",
  sensitive: "tp:sensitive",
  scale: "tp:scale",
  departmentRank: "tp:departmentRank",
  sourceDataset: { "@id": "tp:sourceDataset", "@type": "@id" },
  block: "tp:block",
  generatedAt: "tp:generatedAt",
} as const;
