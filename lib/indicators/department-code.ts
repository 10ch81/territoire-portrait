/** Code département (2 ou 3 chiffres) à partir d'un code INSEE communal. */
export function departmentCodeFromInsee(inseeCode: string): string {
  if (inseeCode.startsWith("97") || inseeCode.startsWith("98")) {
    return inseeCode.slice(0, 3);
  }

  return inseeCode.slice(0, 2);
}
