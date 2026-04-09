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
  ready: boolean;
  readyState: "idle" | "loading" | "ready" | "error" | "skipped";
  error: string | null;
};

type DiscordActivityDebugInfo = {
  clientId: string;
  clientIdPreview: string;
  isIframe: boolean;
  isDiscordEnvironment: boolean;
  sdkLoaded: boolean;
  scriptTagLoaded: boolean;
  readyState: "idle" | "loading" | "ready" | "error" | "skipped";
  lastError: string | null;
  queryFlags: {
    hasFrameId: boolean;
    hasInstanceId: boolean;
    hasGuildId: boolean;
  };
  env: {
    NEXT_PUBLIC_DISCORD_CLIENT_ID: string;
    NEXT_PUBLIC_CLIENT_ID: string;
    NEXT_PUBLIC_DISCORD_APP_ID: string;
    VITE_DISCORD_CLIENT_ID: string;
    VITE_CLIENT_ID: string;
    VITE_DISCORD_APP_ID: string;
  };
};

export function initDiscordActivity(): Promise<DiscordActivityInitResult>;
export function setSharedState(state: SharedLeaderboardState): Promise<void>;
export function subscribeSharedState(callback: (state: SharedLeaderboardState) => void): () => void;
export function debugDiscordActivity(): DiscordActivityDebugInfo;
