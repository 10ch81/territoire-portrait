export interface RecentCommune {
  inseeCode: string;
  name: string;
  departmentCode?: string;
  visitedAt: string;
}

const STORAGE_KEY = "territoire-portrait:recent-communes";
const MAX_RECENT = 5;

const EMPTY_RECENT: RecentCommune[] = [];

const recentCommuneListeners = new Set<() => void>();

let cachedRaw: string | null | undefined;
let cachedSnapshot: RecentCommune[] = EMPTY_RECENT;

function parseRecentCommunes(raw: string | null): RecentCommune[] {
  if (!raw) {
    return EMPTY_RECENT;
  }
  try {
    const parsed = JSON.parse(raw) as RecentCommune[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENT) : EMPTY_RECENT;
  } catch {
    return EMPTY_RECENT;
  }
}

function readRecentCommunesSnapshot(): RecentCommune[] {
  if (typeof window === "undefined") {
    return EMPTY_RECENT;
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) {
    return cachedSnapshot;
  }

  cachedRaw = raw;
  cachedSnapshot = parseRecentCommunes(raw);
  return cachedSnapshot;
}

function invalidateRecentCommunesCache(): void {
  cachedRaw = undefined;
}

function notifyRecentCommunesListeners(): void {
  for (const listener of recentCommuneListeners) {
    listener();
  }
}

export function subscribeRecentCommunes(onStoreChange: () => void): () => void {
  recentCommuneListeners.add(onStoreChange);

  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) {
      return;
    }
    invalidateRecentCommunesCache();
    onStoreChange();
  };

  window.addEventListener("storage", onStorage);

  return () => {
    recentCommuneListeners.delete(onStoreChange);
    window.removeEventListener("storage", onStorage);
  };
}

export function getRecentCommunesSnapshot(): RecentCommune[] {
  return readRecentCommunesSnapshot();
}

export function getRecentCommunesServerSnapshot(): RecentCommune[] {
  return EMPTY_RECENT;
}

export function loadRecentCommunes(): RecentCommune[] {
  return readRecentCommunesSnapshot();
}

export function saveRecentCommune(entry: Omit<RecentCommune, "visitedAt">): void {
  if (typeof window === "undefined") {
    return;
  }

  const existing = readRecentCommunesSnapshot().filter(
    (c) => c.inseeCode !== entry.inseeCode,
  );
  const updated: RecentCommune[] = [
    { ...entry, visitedAt: new Date().toISOString() },
    ...existing,
  ].slice(0, MAX_RECENT);

  const serialized = JSON.stringify(updated);
  window.localStorage.setItem(STORAGE_KEY, serialized);
  cachedRaw = serialized;
  cachedSnapshot = updated;
  notifyRecentCommunesListeners();
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
