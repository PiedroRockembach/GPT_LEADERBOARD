import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Player, PlayerInput } from "@/lib/types";

const DATA_FILE = path.join(process.cwd(), "data", "leaderboard.json");

type LeaderboardData = {
  players: Player[];
};

const INITIAL_DATA: LeaderboardData = {
  players: [
    {
      id: randomUUID(),
      nome: "FURY Nova",
      vitorias: 28,
      kills: 93,
      deaths: 48,
      partidas: 42,
    },
    {
      id: randomUUID(),
      nome: "Alpha Syndicate",
      vitorias: 24,
      kills: 82,
      deaths: 48,
      partidas: 40,
    },
    {
      id: randomUUID(),
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

    const bKd = b.kills / b.deaths;
    const aKd = a.kills / a.deaths;
    if (bKd !== aKd) {
      return bKd - aKd;
    }

    return b.partidas - a.partidas;
  });
}

async function ensureDataFile(): Promise<void> {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
    await fs.writeFile(DATA_FILE, JSON.stringify(INITIAL_DATA, null, 2), "utf-8");
  }
}

async function readData(): Promise<LeaderboardData> {
  await ensureDataFile();
  const raw = await fs.readFile(DATA_FILE, "utf-8");
  const parsed = JSON.parse(raw) as LeaderboardData;

  parsed.players = sortPlayers(parsed.players);
  return parsed;
}

async function writeData(data: LeaderboardData): Promise<void> {
  data.players = sortPlayers(data.players);
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function listPlayers(): Promise<Player[]> {
  const data = await readData();
  return data.players;
}

export async function addPlayer(input: PlayerInput): Promise<Player> {
  const data = await readData();

  const player: Player = {
    id: randomUUID(),
    ...input,
  };

  data.players.push(player);
  await writeData(data);

  return player;
}

export async function updatePlayer(id: string, input: PlayerInput): Promise<Player | null> {
  const data = await readData();
  const index = data.players.findIndex((player) => player.id === id);

  if (index < 0) {
    return null;
  }

  const updated: Player = {
    id,
    ...input,
  };

  data.players[index] = updated;
  await writeData(data);

  return updated;
}

export async function deletePlayer(id: string): Promise<boolean> {
  const data = await readData();
  const filtered = data.players.filter((player) => player.id !== id);

  if (filtered.length === data.players.length) {
    return false;
  }

  data.players = filtered;
  await writeData(data);

  return true;
}
