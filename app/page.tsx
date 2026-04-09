"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { calculateKd, calculateScore, calculateWinRate } from "@/lib/kd";
import { Player } from "@/lib/types";
import { initDiscordActivity, setSharedState, subscribeSharedState } from "@/discordActivity.js";

type LeaderboardMode = "RANKED" | "X5";

type FormState = {
  nome: string;
  vitorias: string;
  kills: string;
  deaths: string;
  assists: string;
  partidas: string;
};

const initialForm: FormState = {
  nome: "",
  vitorias: "",
  kills: "",
  deaths: "",
  assists: "",
  partidas: "",
};

const LOCAL_STORAGE_KEY = "leaderboard_state_v1";

type SharedLeaderboardState = {
  mode: LeaderboardMode;
  players: Player[];
  source: string;
};

function createClientId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function sortPlayers(players: Player[], mode: LeaderboardMode): Player[] {
  return [...players].sort((a, b) => {
    const bScore = calculateScore(b.kills, b.deaths, b.assists, b.partidas, b.vitorias, mode);
    const aScore = calculateScore(a.kills, a.deaths, a.assists, a.partidas, a.vitorias, mode);

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

function loadLocalPlayers(mode: LeaderboardMode): Player[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as Partial<Record<LeaderboardMode, Player[]>>;
    const items = parsed[mode] ?? [];

    if (!Array.isArray(items)) {
      return [];
    }

    return sortPlayers(
      items
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          id: String(item.id),
          mode,
          nome: String(item.nome ?? ""),
          vitorias: Number(item.vitorias ?? 0),
          kills: Number(item.kills ?? 0),
          deaths: Number(item.deaths ?? 0),
          assists: Number(item.assists ?? 0),
          partidas: Number(item.partidas ?? 0),
        })),
      mode,
    );
  } catch {
    return [];
  }
}

function saveLocalPlayers(mode: LeaderboardMode, players: Player[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const currentRaw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    const current = currentRaw ? (JSON.parse(currentRaw) as Partial<Record<LeaderboardMode, Player[]>>) : {};

    current[mode] = players.map((player) => ({ ...player, mode }));

    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
  } catch {
    // Keep app functional even if localStorage is unavailable.
  }
}

export default function Home() {
  const [mode, setMode] = useState<LeaderboardMode>("RANKED");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);
  const [isDiscordActivity, setIsDiscordActivity] = useState(false);
  const [discordReady, setDiscordReady] = useState(false);
  const clientIdRef = useRef<string>(createClientId());
  const applyingRemoteRef = useRef(false);
  const lastSharedSignatureRef = useRef("");

  const title = useMemo(() => (editingId ? "Editar Jogador" : "Adicionar Jogador"), [editingId]);

  useEffect(() => {
    let unsubscribe = () => {};

    async function bootstrapActivity() {
      setLoading(true);

      // TODO: CALL initDiscordActivity()
      const { isDiscordActivity: embedded } = await initDiscordActivity();

      setIsDiscordActivity(embedded);
      setDiscordReady(embedded);

      if (embedded) {
        unsubscribe = subscribeSharedState((incomingState: SharedLeaderboardState) => {
          if (!incomingState || incomingState.source === clientIdRef.current) {
            return;
          }

          const nextMode = incomingState.mode === "X5" ? "X5" : "RANKED";
          const nextPlayers = sortPlayers(
            (incomingState.players ?? []).map((player) => ({
              ...player,
              mode: nextMode,
              assists: Number(player.assists ?? 0),
              vitorias: Number(player.vitorias ?? 0),
              kills: Number(player.kills ?? 0),
              deaths: Number(player.deaths ?? 0),
              partidas: Number(player.partidas ?? 0),
            })),
            nextMode,
          );

          const signature = JSON.stringify({ mode: nextMode, players: nextPlayers });

          if (signature === lastSharedSignatureRef.current) {
            return;
          }

          applyingRemoteRef.current = true;
          setMode(nextMode);
          setPlayers(nextPlayers);
          lastSharedSignatureRef.current = signature;
          queueMicrotask(() => {
            applyingRemoteRef.current = false;
          });
        });
      }

      setPlayers(loadLocalPlayers(mode));
      setLoading(false);
    }

    void bootstrapActivity();

    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    clearForm();

    if (!isDiscordActivity) {
      setPlayers(loadLocalPlayers(mode));
    }
  }, [mode, isDiscordActivity]);

  useEffect(() => {
    if (loading || applyingRemoteRef.current) {
      return;
    }

    if (!isDiscordActivity) {
      saveLocalPlayers(mode, players);
      return;
    }

    if (!discordReady) {
      return;
    }

    const state: SharedLeaderboardState = {
      mode,
      players,
      source: clientIdRef.current,
    };

    const signature = JSON.stringify({ mode, players });

    if (signature === lastSharedSignatureRef.current) {
      return;
    }

    lastSharedSignatureRef.current = signature;
    // TODO: CONNECT LEADERBOARD STATE
    void setSharedState(state);
  }, [mode, players, loading, isDiscordActivity, discordReady]);

  function clearForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function fillForm(player: Player) {
    setEditingId(player.id);
    setForm({
      nome: player.nome,
      vitorias: String(player.vitorias),
      kills: String(player.kills),
      deaths: String(player.deaths),
      assists: String(player.assists),
      partidas: String(player.partidas),
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      id: editingId ?? createClientId(),
      mode,
      nome: form.nome,
      vitorias: mode === "RANKED" ? 0 : Number(form.vitorias),
      kills: Number(form.kills),
      deaths: Number(form.deaths),
      assists: mode === "RANKED" ? 0 : Number(form.assists),
      partidas: Number(form.partidas),
    };

    try {
      const nextPlayer: Player = {
        id: payload.id,
        mode,
        nome: payload.nome.trim(),
        vitorias: payload.vitorias,
        kills: payload.kills,
        deaths: payload.deaths,
        assists: payload.assists,
        partidas: payload.partidas,
      };

      if (!nextPlayer.nome) {
        throw new Error("Nome é obrigatório.");
      }

      const numericFields = [nextPlayer.vitorias, nextPlayer.kills, nextPlayer.deaths, nextPlayer.assists, nextPlayer.partidas];
      if (numericFields.some((value) => Number.isNaN(value) || value < 0)) {
        throw new Error("Preencha apenas números válidos maiores ou iguais a zero.");
      }

      setPlayers((currentPlayers) => {
        const exists = currentPlayers.some((player) => player.id === nextPlayer.id);
        const updatedPlayers = exists
          ? currentPlayers.map((player) => (player.id === nextPlayer.id ? nextPlayer : player))
          : [...currentPlayers, nextPlayer];

        return sortPlayers(updatedPlayers, mode);
      });

      clearForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removePlayer(id: string) {
    setError(null);

    try {
      if (editingId === id) {
        clearForm();
      }

      setPlayers((currentPlayers) => currentPlayers.filter((player) => player.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    }
  }

  return (
    <main className="page-shell">
      <section className="title-card">

        <h1>Ranking The Jokers Killers</h1>
        <p>
          {mode === "RANKED" ? (
            <>
              Ranking ordenado por <strong>Score</strong>, com base em K/D e partidas.
            </>
          ) : (
            <>
              Ranking ordenado por <strong>Score</strong>, com base em K/D, partidas e vitórias.
            </>
          )}
        </p>
        <div className="mode-switcher">
          <button
            type="button"
            className={mode === "RANKED" ? "mode-button active" : "mode-button"}
            onClick={() => setMode("RANKED")}
          >
            RANKED
          </button>
          <button
            type="button"
            className={mode === "X5" ? "mode-button active" : "mode-button"}
            onClick={() => setMode("X5")}
          >
            X5
          </button>
        </div>
      </section>

      <section className="grid-layout">
        <form className="panel" onSubmit={onSubmit}>
          <h2>{title}</h2>

          <label>
            Nome
            <input
              required
              type="text"
              value={form.nome}
              onChange={(event) => setForm((prev) => ({ ...prev, nome: event.target.value }))}
              placeholder="Ex.: YanGOD"
            />
          </label>

          {mode !== "RANKED" && (
            <label>
              Vitórias
              <input
                required
                type="number"
                min="0"
                value={form.vitorias}
                onChange={(event) => setForm((prev) => ({ ...prev, vitorias: event.target.value }))}
              />
            </label>
          )}

          <label>
            Kills
            <input
              required
              type="number"
              min="0"
              value={form.kills}
              onChange={(event) => setForm((prev) => ({ ...prev, kills: event.target.value }))}
            />
          </label>

          <label>
            Deaths
            <input
              required
              type="number"
              min="0"
              value={form.deaths}
              onChange={(event) => setForm((prev) => ({ ...prev, deaths: event.target.value }))}
            />
          </label>

          {mode !== "RANKED" && (
            <label>
              Assists
              <input
                required
                type="number"
                min="0"
                value={form.assists}
                onChange={(event) => setForm((prev) => ({ ...prev, assists: event.target.value }))}
              />
            </label>
          )}

          <label>
            Partidas
            <input
              required
              type="number"
              min="0"
              value={form.partidas}
              onChange={(event) => setForm((prev) => ({ ...prev, partidas: event.target.value }))}
            />
          </label>

          <div className="button-row">
            <button disabled={submitting} type="submit">
              {submitting ? "Salvando..." : editingId ? "Atualizar" : "Adicionar"}
            </button>
            {editingId && (
              <button type="button" className="secondary" onClick={clearForm}>
                Cancelar
              </button>
            )}
          </div>
        </form>

        <article className="panel">
          <div className="table-header">
            <h2>{mode}</h2>
            <span>{players.length} registros</span>
          </div>

          {error && <p className="error-box">{error}</p>}

          {loading ? (
            <p className="muted">Carregando leaderboard...</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Colocação</th>
                    <th>Nome</th>
                    <th>K/D</th>
                    <th>K/D/A</th>
                    <th>Nº partidas</th>
                    {mode !== "RANKED" && <th>Vitórias</th>}
                    {mode !== "RANKED" && <th>WR</th>}
                    <th>Score</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, index) => {
                    const kd = calculateKd(player.kills, player.deaths);
                    const wr = mode === "RANKED" ? null : calculateWinRate(player.vitorias, player.partidas);
                    const score = calculateScore(player.kills, player.deaths, player.assists, player.partidas, player.vitorias, mode);

                    return (
                      <tr key={player.id}>
                        <td data-label="Colocação">#{index + 1}</td>
                        <td data-label="Nome">{player.nome}</td>
                        <td data-label="K/D">{kd === Number.POSITIVE_INFINITY ? "∞" : kd.toFixed(2)}</td>
                        <td data-label="K/D/A">{player.kills}/{player.deaths}/{player.assists}</td>
                        <td data-label="Nº partidas">{player.partidas}</td>
                        {mode !== "RANKED" && <td data-label="Vitórias">{player.vitorias}</td>}
                        {mode !== "RANKED" && <td data-label="WR">{wr?.toFixed(1)}%</td>}
                        <td data-label="Score">{Number.isFinite(score) ? score.toFixed(3) : "∞"}</td>
                        <td data-label="Ações" className="actions">
                          <button type="button" className="icon-button" onClick={() => fillForm(player)}>
                            Editar
                          </button>
                          <button type="button" className="icon-button danger" onClick={() => void removePlayer(player.id)}>
                            Remover
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
