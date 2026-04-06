"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Player } from "@/lib/types";

type FormState = {
  nome: string;
  vitorias: string;
  kd: string;
  score: string;
  partidas: string;
};

const initialForm: FormState = {
  nome: "",
  vitorias: "",
  kd: "",
  score: "",
  partidas: "",
};

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const title = useMemo(() => (editingId ? "Editar time" : "Adicionar time"), [editingId]);

  async function fetchPlayers() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/players", { cache: "no-store" });

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
    void fetchPlayers();
  }, []);

  function clearForm() {
    setForm(initialForm);
    setEditingId(null);
  }

  function fillForm(player: Player) {
    setEditingId(player.id);
    setForm({
      nome: player.nome,
      vitorias: String(player.vitorias),
      kd: String(player.kd),
      score: String(player.score),
      partidas: String(player.partidas),
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    const payload = {
      ...(editingId ? { id: editingId } : {}),
      nome: form.nome,
      vitorias: Number(form.vitorias),
      kd: Number(form.kd),
      score: Number(form.score),
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
      await fetchPlayers();
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

      await fetchPlayers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.");
    }
  }

  return (
    <main className="page-shell">
      <section className="title-card">

        <h1>The Jokers Killers Leaderboard</h1>
        <p>
          Ranking ordenado por <strong>Vitórias</strong>, <strong>KD</strong>, <strong>Score</strong> e <strong>Partidas</strong>.
        </p>
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
              placeholder="Ex.: Team Phoenix"
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
            KD
            <input
              required
              type="number"
              min="0"
              step="0.01"
              value={form.kd}
              onChange={(event) => setForm((prev) => ({ ...prev, kd: event.target.value }))}
            />
          </label>

          <label>
            Score
            <input
              required
              type="number"
              min="0"
              value={form.score}
              onChange={(event) => setForm((prev) => ({ ...prev, score: event.target.value }))}
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
            <h2>Jogadores</h2>
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
                    <th>#</th>
                    <th>Nome</th>
                    <th>Vitórias</th>
                    <th>KD</th>
                    <th>Score</th>
                    <th>Partidas</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, index) => (
                    <tr key={player.id}>
                      <td>{index + 1}</td>
                      <td>{player.nome}</td>
                      <td>{player.vitorias}</td>
                      <td>{player.kd.toFixed(2)}</td>
                      <td>{player.score}</td>
                      <td>{player.partidas}</td>
                      <td className="actions">
                        <button type="button" className="icon-button" onClick={() => fillForm(player)}>
                          Editar
                        </button>
                        <button type="button" className="icon-button danger" onClick={() => void removePlayer(player.id)}>
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
