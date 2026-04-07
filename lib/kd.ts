export function calculateKd(kills: number, deaths: number): number {
  if (deaths === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return kills / deaths;
}

export function calculateWinRate(vitorias: number, partidas: number): number {
  if (partidas === 0) {
    return 0;
  }

  return (vitorias / partidas) * 100;
}

export function calculateScore(kills: number, deaths: number, partidas: number, vitorias: number): number {
  if (partidas <= 0) {
    return 0;
  }

  const kd = calculateKd(kills, deaths);
  if (!Number.isFinite(kd)) {
    return Number.POSITIVE_INFINITY;
  }

  const partidasWeight = Math.sqrt(partidas / (partidas + 3));
  const winBonus = 1 + (vitorias / partidas) * 0.3;

  return kd * partidasWeight * winBonus;
}