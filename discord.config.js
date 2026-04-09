function readImportMetaEnv() {
  try {
    return new Function("return typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : undefined;")();
  } catch {
    return undefined;
  }
}

function readClientIdFromEnv() {
  const importMetaEnv = readImportMetaEnv();

  return (
    process.env.NEXT_PUBLIC_DISCORD_CLIENT_ID ||
    process.env.NEXT_PUBLIC_CLIENT_ID ||
    process.env.NEXT_PUBLIC_DISCORD_APP_ID ||
    process.env.NEXT_DISCORD_CLIENT_ID ||
    importMetaEnv?.VITE_DISCORD_CLIENT_ID ||
    importMetaEnv?.VITE_CLIENT_ID ||
    importMetaEnv?.VITE_DISCORD_APP_ID ||
    ""
  );
}

export const DISCORD_CONFIG = {
  // TODO: VERIFY CLIENT ID
  CLIENT_ID: readClientIdFromEnv(),
};
