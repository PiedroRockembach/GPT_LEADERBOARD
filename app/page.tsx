"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { calculateKd } from "@/lib/kd";
import { Player } from "@/lib/types";

type FormState = {
  nome: string;
  vitorias: string;
  kills: string;
  deaths: string;
  partidas: string;
};

const initialForm: FormState = {
  nome: "",
  vitorias: "",
  kills: "",
  deaths: "",
  partidas: "",
};

export default function Home() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialForm);

  const title = useMemo(() => (editingId ? "Editar Jogador" : "Adicionar Jogador"), [editingId]);

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
      kills: String(player.kills),
      deaths: String(player.deaths),
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
      kills: Number(form.kills),
      deaths: Number(form.deaths),
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

        <h1>Ranking The Jokers Killers</h1>
        <p>
          Ranking ordenado por <strong>Vitórias</strong>, <strong>KD</strong> e <strong>Partidas</strong>.
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
                    <th>Kills</th>
                    <th>Deaths</th>
                    <th>KD</th>
                    <th>Partidas</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {players.map((player, index) => (
                    <tr key={player.id}>
                      <td data-label="#">{index + 1}</td>
                      <td data-label="Nome">{player.nome}</td>
                      <td data-label="Vitórias">{player.vitorias}</td>
                      <td data-label="Kills">{player.kills}</td>
                      <td data-label="Deaths">{player.deaths}</td>
                      <td data-label="KD">
                        {(() => {
                          const kd = calculateKd(player.kills, player.deaths);
                          return kd === Number.POSITIVE_INFINITY ? "∞" : kd.toFixed(2);
                        })()}
                      </td>
                      <td data-label="Partidas">{player.partidas}</td>
                      <td data-label="Ações" className="actions">
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
