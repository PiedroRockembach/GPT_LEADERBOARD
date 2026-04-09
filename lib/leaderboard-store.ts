import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { Player, PlayerInput } from "@/lib/types";
import { calculateKd, calculateScore } from "@/lib/kd";

type LeaderboardData = {
  players: Player[];
};

export type LeaderboardMode = "RANKED" | "X5";

const DEFAULT_MODE: LeaderboardMode = "RANKED";

function sortPlayers(players: Player[]): Player[] {
  return players.sort((a, b) => {
    const bScore = calculateScore(b.kills, b.deaths, b.assists, b.partidas, b.vitorias, b.mode);
    const aScore = calculateScore(a.kills, a.deaths, a.assists, a.partidas, a.vitorias, a.mode);
    if (bScore !== aScore) {
      return bScore - aScore;
    }

    if (b.vitorias !== a.vitorias) {
      return b.vitorias - a.vitorias;
    }

    const bKd = calculateKd(b.kills, b.deaths);
    const aKd = calculateKd(a.kills, a.deaths);
    if (bKd !== aKd) {
      return bKd - aKd;
    }

    return b.partidas - a.partidas;
  });
}

function getSqlClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is not configured.");
  }

  return neon(databaseUrl);
}

function normalizeMode(mode?: string | null): LeaderboardMode {
  return mode === "X5" ? "X5" : DEFAULT_MODE;
}

function serializePlayer(row: Record<string, unknown>): Player {
  return {
    id: String(row.id),
    mode: normalizeMode(typeof row.mode === "string" ? row.mode : DEFAULT_MODE),
    nome: String(row.nome),
    vitorias: Number(row.vitorias),
    kills: Number(row.kills),
    deaths: Number(row.deaths),
    assists: Number(row.assists ?? 0),
    partidas: Number(row.partidas),
  };
}

async function ensureTable(): Promise<void> {
  const sql = getSqlClient();

  await sql`
    CREATE TABLE IF NOT EXISTS leaderboard_players (
      id text PRIMARY KEY,
      mode text NOT NULL DEFAULT 'RANKED' CHECK (mode IN ('RANKED', 'X5')),
      nome text NOT NULL,
      vitorias integer NOT NULL CHECK (vitorias >= 0),
      kills integer NOT NULL CHECK (kills >= 0),
      deaths integer NOT NULL CHECK (deaths >= 0),
      assists integer NOT NULL CHECK (assists >= 0),
      partidas integer NOT NULL CHECK (partidas >= 0)
    )
  `;

  await sql`
    ALTER TABLE leaderboard_players
    ADD COLUMN IF NOT EXISTS mode text NOT NULL DEFAULT 'RANKED'
  `;

  await sql`
    ALTER TABLE leaderboard_players
    ADD COLUMN IF NOT EXISTS assists integer NOT NULL DEFAULT 0
  `;

  await sql`
    UPDATE leaderboard_players
    SET mode = 'RANKED'
    WHERE mode IS NULL OR mode = ''
  `;

}

async function readData(mode: LeaderboardMode): Promise<LeaderboardData> {
  const sql = getSqlClient();

  await ensureTable();

  const result = await sql`
    SELECT id, mode, nome, vitorias, kills, deaths, assists, partidas
    FROM leaderboard_players
    WHERE mode = ${mode}
    ORDER BY
      (
        (CASE WHEN deaths = 0 THEN 999999999 ELSE kills::numeric / deaths END)
        * SQRT(partidas::numeric / (partidas + 3))
        * CASE WHEN mode = 'X5' THEN (1 + (CASE WHEN partidas = 0 THEN 0 ELSE vitorias::numeric / partidas END) * 0.3) ELSE 1 END
      ) DESC,
      vitorias DESC,
      CASE WHEN deaths = 0 THEN 999999999 ELSE kills::numeric / deaths END DESC,
      partidas DESC
  `;

  return {
    players: sortPlayers((result as Array<Record<string, unknown>>).map(serializePlayer)),
  };
}

export async function listPlayers(mode: LeaderboardMode = DEFAULT_MODE): Promise<Player[]> {
  const data = await readData(normalizeMode(mode));
  return data.players;
}

export async function addPlayer(input: PlayerInput, mode: LeaderboardMode = DEFAULT_MODE): Promise<Player> {
  const sql = getSqlClient();

  await ensureTable();

  const player: Player = {
    id: randomUUID(),
    mode: normalizeMode(mode),
    ...input,
  };

  const result = await sql`
    INSERT INTO leaderboard_players (id, mode, nome, vitorias, kills, deaths, assists, partidas)
    VALUES (${player.id}, ${player.mode}, ${player.nome}, ${player.vitorias}, ${player.kills}, ${player.deaths}, ${player.assists}, ${player.partidas})
    RETURNING id, mode, nome, vitorias, kills, deaths, assists, partidas
  `;

  return (serializePlayer((result as Array<Record<string, unknown>>)[0] ?? player)) as Player;
}

export async function updatePlayer(id: string, input: PlayerInput): Promise<Player | null> {
  const sql = getSqlClient();

  await ensureTable();

  const result = await sql`
    UPDATE leaderboard_players
    SET nome = ${input.nome}, vitorias = ${input.vitorias}, kills = ${input.kills}, deaths = ${input.deaths}, assists = ${input.assists}, partidas = ${input.partidas}
    WHERE id = ${id}
    RETURNING id, mode, nome, vitorias, kills, deaths, assists, partidas
  `;

  const row = (result as Array<Record<string, unknown>>)[0];
  return row ? serializePlayer(row) : null;
}

export async function deletePlayer(id: string): Promise<boolean> {
  const sql = getSqlClient();

  await ensureTable();

  const result = await sql`DELETE FROM leaderboard_players WHERE id = ${id} RETURNING id`;
  return (result as Array<{ id: string }>).length > 0;
}
