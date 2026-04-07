"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { calculateKd, calculateScore, calculateWinRate } from "@/lib/kd";
import { Player } from "@/lib/types";

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

export default function Home() {
  const [mode, setMode] = useState<LeaderboardMode>("RANKED");
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const title = useMemo(() => (editingId ? "Editar Jogador" : "Adicionar Jogador"), [editingId]);

  async function fetchPlayers(selectedMode: LeaderboardMode) {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/players?mode=${selectedMode}`, { cache: "no-store" });

      if (!response.ok) {
        throw new Error("Falha ao buscar leaderboard.");
      }

      const data = (await response.json()) as Player[];
      setPlayers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    clearForm();
    void fetchPlayers(mode);
  }, [mode]);

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
      ...(editingId ? { id: editingId } : {}),
      mode,
      nome: form.nome,
      vitorias: Number(form.vitorias),
      kills: Number(form.kills),
      deaths: Number(form.deaths),
      assists: Number(form.assists),
      partidas: Number(form.partidas),
    };

    const method = editingId ? "PUT" : "POST";

    try {
      const response = await fetch("/api/players", {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? "Falha ao salvar registro.");
      }

      clearForm();
      await fetchPlayers(mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removePlayer(id: string) {
    setError(null);

    try {
      const response = await fetch("/api/players", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        throw new Error(data.message ?? "Falha ao remover registro.");
      }

      if (editingId === id) {
        clearForm();
      }

      await fetchPlayers(mode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    }
  }

  return (
    <main className="page-shell">
      <section className="title-card">

        <h1>Ranking The Jokers Killers</h1>
        <p>
          Ranking ordenado por <strong>Score</strong>, com base em K/D, partidas e vitórias.
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
                    <th>WR</th>
                    <th>Score</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, index) => {
                    const kd = calculateKd(player.kills, player.deaths);
                    const wr = calculateWinRate(player.vitorias, player.partidas);
                    const score = calculateScore(player.kills, player.deaths, player.partidas, player.vitorias, mode);

                    return (
                      <tr key={player.id}>
                        <td data-label="Colocação">#{index + 1}</td>
                        <td data-label="Nome">{player.nome}</td>
                        <td data-label="K/D">{kd === Number.POSITIVE_INFINITY ? "∞" : kd.toFixed(2)}</td>
                        <td data-label="K/D/A">{player.kills}/{player.deaths}/{player.assists}</td>
                        <td data-label="Nº partidas">{player.partidas}</td>
                        <td data-label="WR">{wr.toFixed(1)}%</td>
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
