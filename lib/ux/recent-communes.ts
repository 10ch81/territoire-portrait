export interface RecentCommune {
  inseeCode: string;
  name: string;
  departmentCode?: string;
  visitedAt: string;
}

const STORAGE_KEY = "territoire-portrait:recent-communes";
const MAX_RECENT = 5;

export function loadRecentCommunes(): RecentCommune[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as RecentCommune[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

export function saveRecentCommune(entry: Omit<RecentCommune, "visitedAt">): void {
  if (typeof window === "undefined") {
    return;
  }

  const existing = loadRecentCommunes().filter(
    (c) => c.inseeCode !== entry.inseeCode,
  );
  const updated: RecentCommune[] = [
    { ...entry, visitedAt: new Date().toISOString() },
    ...existing,
  ].slice(0, MAX_RECENT);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export const EXAMPLE_COMMUNES: Array<{
  inseeCode: string;
  name: string;
  label: string;
}> = [
  { inseeCode: "44109", name: "Nantes", label: "Nantes (44)" },
  { inseeCode: "69123", name: "Lyon", label: "Lyon (69)" },
  { inseeCode: "35238", name: "Rennes", label: "Rennes (35)" },
];

export const USE_CASE_EXAMPLES = [
  {
    id: "elected",
    title: "Élus & collectivités",
    description: "Fiscalité, logement social, équipements de proximité.",
    inseeCode: "44109",
    anchor: "fiscalite",
  },
  {
    id: "prospect",
    title: "Prospection territoriale",
    description: "Économie locale, immobilier, mobilité et densité.",
    inseeCode: "69123",
    anchor: "economie",
  },
  {
    id: "risks",
    title: "Risques & résilience",
    description: "Radon, inondations, catastrophes naturelles récentes.",
    inseeCode: "35238",
    anchor: "risques",
  },
  {
    id: "security",
    title: "Sécurité publique",
    description: "Délinquance enregistrée (SSMSI), taux pour 1 000 hab.",
    inseeCode: "44109",
    anchor: "securite",
  },
] as const;
