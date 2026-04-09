import { DISCORD_CONFIG } from "./discord.config.js";

let discordSdk = null;
let subscribed = false;

function isDiscordHost() {
  if (typeof window === "undefined") {
    return false;
  }

  const hasDiscordGlobal = typeof window.DiscordSDK === "function";
  const referrer = typeof document !== "undefined" ? document.referrer : "";
  const fromDiscordReferrer = /discord(app)?\.com/i.test(referrer);
  const params = new URLSearchParams(window.location.search);
  const hasActivityParams = params.has("frame_id") || params.has("instance_id") || params.has("guild_id");

  return hasDiscordGlobal || fromDiscordReferrer || hasActivityParams;
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
    return { sdk: null, isDiscordActivity: false };
  }

  if (!isDiscordHost()) {
    return { sdk: null, isDiscordActivity: false };
  }

  if (!DISCORD_CONFIG.CLIENT_ID || DISCORD_CONFIG.CLIENT_ID === "COLOCAR_CLIENT_ID_AQUI") {
    return { sdk: null, isDiscordActivity: false };
  }

  if (discordSdk) {
    return { sdk: discordSdk, isDiscordActivity: true };
  }

  try {
    const DiscordSDKCtor = window.DiscordSDK;

    if (typeof DiscordSDKCtor !== "function") {
      return { sdk: null, isDiscordActivity: false };
    }

    discordSdk = new DiscordSDKCtor(DISCORD_CONFIG.CLIENT_ID);
    await discordSdk.ready();

    return { sdk: discordSdk, isDiscordActivity: true };
  } catch {
    discordSdk = null;
    return { sdk: null, isDiscordActivity: false };
  }
}

export async function setSharedState(state) {
  if (!discordSdk) {
    return;
  }

  try {
    await discordSdk.commands.setActivityInstanceState({ state });
  } catch {
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
