import { Player } from "@/lib/types";

type LeaderboardMode = "RANKED" | "X5";

type SharedLeaderboardState = {
  mode: LeaderboardMode;
  players: Player[];
  source: string;
};

type DiscordActivityInitResult = {
  sdk: unknown | null;
  isDiscordActivity: boolean;
};

export function initDiscordActivity(): Promise<DiscordActivityInitResult>;
export function setSharedState(state: SharedLeaderboardState): Promise<void>;
export function subscribeSharedState(callback: (state: SharedLeaderboardState) => void): () => void;
