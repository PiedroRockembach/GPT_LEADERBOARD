export function calculateKd(kills: number, deaths: number): number {
  if (deaths === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return kills / deaths;
}