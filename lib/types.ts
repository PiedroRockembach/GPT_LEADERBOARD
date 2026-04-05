export type Player = {
  id: string;
  nome: string;
  vitorias: number;
  kd: number;
  score: number;
  partidas: number;
};

export type PlayerInput = Omit<Player, "id">;
