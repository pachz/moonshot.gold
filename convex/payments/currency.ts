export function tomanToRials(toman: number): number {
  return toman * 10;
}

export function rialsToToman(rials: number): number {
  return Math.round(rials / 10);
}
