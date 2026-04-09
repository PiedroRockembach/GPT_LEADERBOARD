import { DISCORD_CONFIG } from "./discord.config.js";
import { DiscordSDK as EmbeddedDiscordSDK } from "@discord/embedded-app-sdk";

let discordSdk = null;
let subscribed = false;
let readyState = "idle";
let lastError = null;

function getClientIdPreview(clientId) {
  if (!clientId) {
    return "";
  }

  if (clientId.length <= 8) {
    return clientId;
  }

  return `${clientId.slice(0, 4)}...${clientId.slice(-4)}`;
}

function getQueryParamFlags() {
  if (typeof window === "undefined") {
    return {
      hasFrameId: false,
      hasInstanceId: false,
      hasGuildId: false,
    };
  }

  const params = new URLSearchParams(window.location.search);

  return {
    hasFrameId: params.has("frame_id"),
    hasInstanceId: params.has("instance_id"),
    hasGuildId: params.has("guild_id"),
  };
}

function isInIframe() {
  if (typeof window === "undefined") {
    return false;
  }

  // TODO: IFRAME SAFE
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function getEnvSnapshot() {
  let importMetaEnv;

  try {
    importMetaEnv = new Function("return typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : undefined;")();
  } catch {
    importMetaEnv = undefined;
  }

  return {
    NEXT_PUBLIC_DISCORD_CLIENT_ID: process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID || "",
    NEXT_PUBLIC_CLIENT_ID: process.env.NEXT_PUBLIC_CLIENT_ID || "",
    NEXT_PUBLIC_DISCORD_APP_ID: process.env.NEXT_PUBLIC_DISCORD_APP_ID || "",
    VITE_DISCORD_CLIENT_ID: importMetaEnv?.VITE_DISCORD_CLIENT_ID || "",
    VITE_CLIENT_ID: importMetaEnv?.VITE_CLIENT_ID || "",
    VITE_DISCORD_APP_ID: importMetaEnv?.VITE_DISCORD_APP_ID || "",
  };
}

function getDiscordSdkCtor() {
  if (typeof EmbeddedDiscordSDK === "function") {
    return EmbeddedDiscordSDK;
  }

  if (typeof window === "undefined") {
    return null;
  }

  if (typeof window.DiscordSDK === "function") {
    return window.DiscordSDK;
  }

  if (window.discordSdk && typeof window.discordSdk.DiscordSDK === "function") {
    return window.discordSdk.DiscordSDK;
  }

  return null;
}

function getScriptLoaded() {
  if (typeof document === "undefined") {
    return false;
  }

  return Array.from(document.querySelectorAll("script[src]")).some((script) =>
    script.src.includes("discord.com/api/embedded-app-sdk.js"),
  );
}

function isDiscordHost() {
  if (typeof window === "undefined") {
    return false;
  }

  const referrer = typeof document !== "undefined" ? document.referrer : "";
  const fromDiscordReferrer = /discord(app)?\.com/i.test(referrer);
  const flags = getQueryParamFlags();
  const hasActivityParams = flags.hasFrameId || flags.hasInstanceId || flags.hasGuildId;

  return isInIframe() && (fromDiscordReferrer || hasActivityParams);
}

function parseSharedPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const candidate = payload;

  if (candidate.state && typeof candidate.state === "object") {
    return candidate.state;
  }

  if (typeof candidate.state === "string") {
    try {
      return JSON.parse(candidate.state);
    } catch {
      return null;
    }
  }

  if (candidate.activity_instance_state && typeof candidate.activity_instance_state === "object") {
    return candidate.activity_instance_state;
  }

  if (typeof candidate.activity_instance_state === "string") {
    try {
      return JSON.parse(candidate.activity_instance_state);
    } catch {
      return null;
    }
  }

  return null;
}

export async function initDiscordActivity() {
  if (typeof window === "undefined") {
    return { sdk: null, isDiscordActivity: false, ready: false, readyState: "idle", error: null };
  }

  const embedded = isDiscordHost();

  if (!embedded) {
    readyState = "skipped";
    lastError = null;
    return { sdk: null, isDiscordActivity: false, ready: false, readyState, error: null };
  }

  if (!DISCORD_CONFIG.CLIENT_ID || DISCORD_CONFIG.CLIENT_ID === "COLOCAR_CLIENT_ID_AQUI") {
    readyState = "error";
    lastError = "Discord CLIENT_ID missing. Configure NEXT_PUBLIC_DISCORD_CLIENT_ID or VITE_DISCORD_CLIENT_ID.";
    console.error("Discord CLIENT_ID missing");
    return { sdk: null, isDiscordActivity: embedded, ready: false, readyState, error: lastError };
  }

  if (discordSdk) {
    return { sdk: discordSdk, isDiscordActivity: true, ready: readyState === "ready", readyState, error: lastError };
  }

  try {
    readyState = "loading";
    const DiscordSDKCtor = getDiscordSdkCtor();

    if (typeof DiscordSDKCtor !== "function") {
      throw new Error("DiscordSDK constructor not found.");
    }

    discordSdk = new DiscordSDKCtor(DISCORD_CONFIG.CLIENT_ID);

    // TODO: DISCORD READY
    await discordSdk.ready();
    readyState = "ready";
    lastError = null;

    return { sdk: discordSdk, isDiscordActivity: true, ready: true, readyState, error: null };
  } catch (error) {
    discordSdk = null;
    readyState = "error";
    lastError = error instanceof Error ? error.message : "Unknown Discord SDK initialization error.";
    console.error("Discord SDK init failed:", error);
    return { sdk: null, isDiscordActivity: true, ready: false, readyState, error: lastError };
  }
}

export async function setSharedState(state) {
  if (!discordSdk) {
    return;
  }

  try {
    await discordSdk.commands.setActivityInstanceState({ state });
  } catch (error) {
    console.error("Discord setActivityInstanceState failed:", error);
    // Silent fallback: app must keep working outside Discord sync.
  }
}

export function subscribeSharedState(callback) {
  if (!discordSdk || subscribed) {
    return () => {};
  }

  subscribed = true;

  const handler = (payload) => {
    const state = parseSharedPayload(payload);

    if (state) {
      callback(state);
    }
  };

  discordSdk.subscribe("ACTIVITY_INSTANCE_STATE_UPDATE", handler);

  return () => {
    if (discordSdk && typeof discordSdk.unsubscribe === "function") {
      discordSdk.unsubscribe("ACTIVITY_INSTANCE_STATE_UPDATE", handler);
    }

    subscribed = false;
  };
}

export function debugDiscordActivity() {
  const flags = getQueryParamFlags();
  const info = {
    clientId: DISCORD_CONFIG.CLIENT_ID,
    clientIdPreview: getClientIdPreview(DISCORD_CONFIG.CLIENT_ID),
    isIframe: isInIframe(),
    isDiscordEnvironment: isDiscordHost(),
    sdkLoaded: Boolean(discordSdk),
    scriptTagLoaded: getScriptLoaded(),
    readyState,
    lastError,
    queryFlags: flags,
    env: getEnvSnapshot(),
  };

  console.debug("[Discord Activity Debug]", info);

  return info;
}
