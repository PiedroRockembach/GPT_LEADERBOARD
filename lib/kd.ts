export function calculateKd(kills: number, deaths: number): number {
  if (deaths === 0) {
    return kills;
  }

  return kills / deaths;
}

export function calculateWinRate(vitorias: number, partidas: number): number {
  if (partidas === 0) {
    return 0;
  }

  return (vitorias / partidas) * 100;
}

export function calculateScore(
  kills: number,
  deaths: number,
  assists: number,
  partidas: number,
  vitorias: number,
  mode: "RANKED" | "X5" = "X5",
): number {
  if (partidas <= 0) {
    return 0;
  }

  const score = mode === "RANKED"
    ? calculateRankedScore(kills, deaths, partidas)
    : calculateX5Score(kills, deaths, assists, partidas, vitorias);

  return score;
}

/*
  @param kills - Total number of kills
  @param deaths - Total number of deaths
  @param assists - Total number of assists
  @param partidas - Total number of matches played

  Calculates the score for a player based on their performance in ranked matches. The score is influenced by the player's kill-death ratio (KD), the number of matches played, and the win rate. The formula for ranked matches is:
  Score = (kills / deaths) × √(partidas / (partidas + 10))
*/
function calculateRankedScore(
  kills: number,
  deaths: number,
  partidas: number,

): number {
  const kd = calculateKd(kills, deaths);
  const score = kd * Math.sqrt(partidas / (partidas + 10));
  return score;  
}

/*
  @param kills - Total number of kills
  @param deaths - Total number of deaths
  @param assists - Total number of assists
  @param partidas - Total number of matches played
  @param vitorias - Total number of victories

  Calculates the score for a player based on their performance in X5 matches. The score is influenced by the player's kill-death ratio (KD), the number of matches played, and the win rate. The formula for X5 matches is:
  Score = (kills / deaths) × √(partidas / (partidas + 3)) × (1 + (vitorias / partidas) × 0.3)
*/
function calculateX5Score(
  kills: number,
  deaths: number,
  assists: number,
  partidas: number,
  vitorias: number
): number {
  if (partidas <= 0) {
    return 0;
  } 
  const kd = calculateKd(kills, deaths);
  const winrate = vitorias / partidas;
  const score = kd * Math.sqrt(partidas / (partidas + 3)) * (1 + winrate * 0.3);
  return score;
}