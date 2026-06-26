/**
 * Panier « services et équipements de la vie courante » (Observatoire des territoires,
 * indicateur serv_com_equip.nb) — types BPE 2024 recensés par l'OT.
 * Source OT : BPE INSEE ; agrégation locale depuis le cache communal.
 */
export const DAILY_LIFE_EQUIPMENT_TYPE_CODES = [
  "A101",
  "A133",
  "A203",
  "A206",
  "B104",
  "B105",
  "B201",
  "B202",
  "B207",
  "B316",
  "B326",
  "C107",
  "C201",
  "C301",
  "D106",
  "D108",
  "D113",
  "D265",
  "D277",
  "D281",
  "D307",
  "D401",
  "D502",
  "F116",
  "F121",
] as const;

export type DailyLifeEquipmentTypeCode = (typeof DAILY_LIFE_EQUIPMENT_TYPE_CODES)[number];

export const DAILY_LIFE_EQUIPMENTS_NOTE =
  "Somme des équipements BPE du panier « vie courante » Observatoire des territoires (commerces, services, santé de proximité, enseignement, loisirs). Dénombrement sur la commune, sans mesure d'accessibilité spatiale.";

export function sumDailyLifeEquipments(byType: Record<string, number>): number {
  let total = 0;

  for (const code of DAILY_LIFE_EQUIPMENT_TYPE_CODES) {
    const count = byType[code];
    if (typeof count === "number" && Number.isFinite(count)) {
      total += count;
    }
  }

  return total;
}
