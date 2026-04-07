export type Player = {
  id: string;
  nome: string;
  vitorias: number;
  kills: number;
  deaths: number;
  assists: number;
  partidas: number;
};

export type PlayerInput = Omit<Player, "id">;
