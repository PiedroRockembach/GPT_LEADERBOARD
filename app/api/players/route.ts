import { NextResponse } from "next/server";
import { addPlayer, deletePlayer, listPlayers, updatePlayer } from "@/lib/leaderboard-store";
import { PlayerInput } from "@/lib/types";

function validateInput(body: unknown): { valid: true; data: PlayerInput } | { valid: false; message: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, message: "Payload inválido." };
  }

  const { nome, vitorias, kills, deaths, partidas } = body as Record<string, unknown>;

  if (typeof nome !== "string" || !nome.trim()) {
    return { valid: false, message: "Nome é obrigatório." };
  }

  if ([vitorias, kills, deaths, partidas].some((value) => typeof value !== "number" || Number.isNaN(value))) {
    return { valid: false, message: "Campos numéricos inválidos." };
  }

  const normalizedData: PlayerInput = {
    nome: nome.trim(),
    vitorias: vitorias as number,
    kills: kills as number,
    deaths: deaths as number,
    partidas: partidas as number,
  };

  return {
    valid: true,
    data: normalizedData,
  };
}

export async function GET() {
  const players = await listPlayers();
  return NextResponse.json(players);
}

export async function POST(request: Request) {
  const payload = validateInput(await request.json());

  if (!payload.valid) {
    return NextResponse.json({ message: payload.message }, { status: 400 });
  }

  const created = await addPlayer(payload.data);
  return NextResponse.json(created, { status: 201 });
}

export async function PUT(request: Request) {
  const body = (await request.json()) as { id?: string };

  if (!body.id) {
    return NextResponse.json({ message: "ID obrigatório." }, { status: 400 });
  }

  const payload = validateInput(body);

  if (!payload.valid) {
    return NextResponse.json({ message: payload.message }, { status: 400 });
  }

  const updated = await updatePlayer(body.id, payload.data);

  if (!updated) {
    return NextResponse.json({ message: "Jogador não encontrado." }, { status: 404 });
  }

  return NextResponse.json(updated);
}

export async function DELETE(request: Request) {
  const body = (await request.json()) as { id?: string };

  if (!body.id) {
    return NextResponse.json({ message: "ID obrigatório." }, { status: 400 });
  }

  const removed = await deletePlayer(body.id);

  if (!removed) {
    return NextResponse.json({ message: "Jogador não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
