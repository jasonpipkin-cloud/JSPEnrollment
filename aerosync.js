/** Sandbox-only Aerosync token endpoint. Production hosts are not used. */
export const AEROSYNC_SANDBOX_TOKEN_URL = "https://api.sandbox.aerosync.com/v2/token_widget";
export const AEROSYNC_ENVIRONMENT = "sandbox";

function missingConfigError() {
  const error = new Error(
    "Aerosync sandbox is not configured. Set AEROSYNC_API_KEY, AEROSYNC_API_SECRET, and AEROSYNC_AEROPASS_USER_UUID.",
  );
  error.status = 503;
  return error;
}

function sessionError(message, status = 502) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function readTokenPayload(body) {
  const data = body?.data?.data ?? body?.data ?? body ?? {};
  const token = data.token || data.accessToken || "";
  const aeroPassUserUuid = data.aeroPassUserUuid || data.aeropassUserUuid || "";
  const connectionId = data.connectionId || data.connection_id || "";
  const userId = data.userId || data.user_id || "";
  return { token, aeroPassUserUuid, connectionId, userId };
}

export async function createAerosyncWidgetSession({
  env = process.env,
  fetchImpl = fetch,
} = {}) {
  const apiKey = String(env.AEROSYNC_API_KEY ?? "").trim();
  const apiSecret = String(env.AEROSYNC_API_SECRET ?? "").trim();
  const aeroPassUserUuid = String(env.AEROSYNC_AEROPASS_USER_UUID ?? "").trim();
  const configurationId = String(env.AEROSYNC_CONFIGURATION_ID ?? "").trim();

  if (!apiKey || !apiSecret || !aeroPassUserUuid) {
    throw missingConfigError();
  }

  let response;
  try {
    response = await fetchImpl(AEROSYNC_SANDBOX_TOKEN_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
      },
      body: JSON.stringify({ apiKey, apiSecret, aeroPassUserUuid }),
    });
  } catch {
    throw sessionError("Could not reach Aerosync sandbox.");
  }

  let body = {};
  try {
    body = await response.json();
  } catch {
    body = {};
  }

  if (!response.ok) {
    throw sessionError("Aerosync sandbox rejected the widget session request.");
  }

  const payload = readTokenPayload(body);
  const uuid = payload.aeroPassUserUuid || aeroPassUserUuid;
  if (!payload.token || !uuid) {
    throw sessionError("Aerosync sandbox did not return a widget token.");
  }

  return {
    token: payload.token,
    aeroPassUserUuid: uuid,
    connectionId: payload.connectionId || undefined,
    userId: payload.userId || undefined,
    environment: AEROSYNC_ENVIRONMENT,
    configurationId,
  };
}
