import { randomUUID } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import { Player, PlayerInput } from "@/lib/types";
import { calculateKd } from "@/lib/kd";

type LeaderboardData = {
  players: Player[];
};

const INITIAL_DATA: LeaderboardData = {
  players: [
    {
      id: "seed-fury-nova",
      nome: "FURY Nova",
      vitorias: 28,
      kills: 93,
      deaths: 48,
      partidas: 42,
    },
    {
      id: "seed-alpha-syndicate",
      nome: "Alpha Syndicate",
      vitorias: 24,
      kills: 82,
      deaths: 48,
      partidas: 40,
    },
    {
      id: "seed-rush-unit",
      nome: "Rush Unit",
      vitorias: 24,
      kills: 80,
      deaths: 49,
      partidas: 44,
    },
  ],
};

function sortPlayers(players: Player[]): Player[] {
  return players.sort((a, b) => {
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

async function ensureTable(): Promise<void> {
  const sql = getSqlClient();

  await sql`
    CREATE TABLE IF NOT EXISTS leaderboard_players (
      id text PRIMARY KEY,
      nome text NOT NULL,
      vitorias integer NOT NULL CHECK (vitorias >= 0),
      kills integer NOT NULL CHECK (kills >= 0),
      deaths integer NOT NULL CHECK (deaths >= 0),
      partidas integer NOT NULL CHECK (partidas >= 0)
    )
  `;

  const countResult = await sql`SELECT COUNT(*)::text AS count FROM leaderboard_players`;
  const count = Number((countResult[0] as { count?: string } | undefined)?.count ?? 0);

  if (count === 0) {
    for (const player of INITIAL_DATA.players) {
      await sql`
        INSERT INTO leaderboard_players (id, nome, vitorias, kills, deaths, partidas)
        VALUES (${player.id}, ${player.nome}, ${player.vitorias}, ${player.kills}, ${player.deaths}, ${player.partidas})
        ON CONFLICT (id) DO NOTHING
      `;
    }
  }
}

async function readData(): Promise<LeaderboardData> {
  const sql = getSqlClient();

  await ensureTable();

  const result = await sql`
    SELECT id, nome, vitorias, kills, deaths, partidas
    FROM leaderboard_players
    ORDER BY
      vitorias DESC,
      CASE WHEN deaths = 0 THEN 999999999 ELSE kills::numeric / deaths END DESC,
      partidas DESC
  `;

  return {
    players: sortPlayers(result as Player[]),
  };
}

export async function listPlayers(): Promise<Player[]> {
  const data = await readData();
  return data.players;
}

export async function addPlayer(input: PlayerInput): Promise<Player> {
  const sql = getSqlClient();

  await ensureTable();

  const player: Player = {
    id: randomUUID(),
    ...input,
  };

  const result = await sql`
    INSERT INTO leaderboard_players (id, nome, vitorias, kills, deaths, partidas)
    VALUES (${player.id}, ${player.nome}, ${player.vitorias}, ${player.kills}, ${player.deaths}, ${player.partidas})
    RETURNING id, nome, vitorias, kills, deaths, partidas
  `;

  return ((result as Player[])[0] ?? player) as Player;
}

export async function updatePlayer(id: string, input: PlayerInput): Promise<Player | null> {
  const sql = getSqlClient();

  await ensureTable();

  const result = await sql`
    UPDATE leaderboard_players
    SET nome = ${input.nome}, vitorias = ${input.vitorias}, kills = ${input.kills}, deaths = ${input.deaths}, partidas = ${input.partidas}
    WHERE id = ${id}
    RETURNING id, nome, vitorias, kills, deaths, partidas
  `;

  return ((result as Player[])[0] ?? null) as Player | null;
}

export async function deletePlayer(id: string): Promise<boolean> {
  const sql = getSqlClient();

  await ensureTable();

  const result = await sql`DELETE FROM leaderboard_players WHERE id = ${id} RETURNING id`;
  return (result as Array<{ id: string }>).length > 0;
}
