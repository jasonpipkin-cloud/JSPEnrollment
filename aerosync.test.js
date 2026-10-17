/** @vitest-environment node */
import {
  AEROSYNC_ENVIRONMENT,
  AEROSYNC_SANDBOX_TOKEN_URL,
  createAerosyncWidgetSession,
} from "./aerosync.js";

describe("Aerosync sandbox session", () => {
  it("uses only the sandbox token URL", () => {
    expect(AEROSYNC_SANDBOX_TOKEN_URL).toBe("https://api.sandbox.aerosync.com/v2/token_widget");
    expect(AEROSYNC_SANDBOX_TOKEN_URL).not.toMatch(/api\.aerosync\.com/);
    expect(AEROSYNC_ENVIRONMENT).toBe("sandbox");
  });

  it("returns 503 when sandbox credentials are missing", async () => {
    await expect(createAerosyncWidgetSession({ env: {} })).rejects.toMatchObject({
      status: 503,
    });
  });

  it("posts to sandbox and returns a client session without secrets", async () => {
    const fetchImpl = vi.fn(async (url, options) => {
      expect(url).toBe(AEROSYNC_SANDBOX_TOKEN_URL);
      expect(url).not.toContain("api.aerosync.com");
      const body = JSON.parse(options.body);
      expect(body.apiKey).toBe("sandbox-key");
      return {
        ok: true,
        json: async () => ({
          token: "widget-token",
          userId: "user-1",
          connectionId: "conn-1",
          aeroPassUserUuid: "uuid-1",
        }),
      };
    });

    const session = await createAerosyncWidgetSession({
      env: {
        AEROSYNC_API_KEY: "sandbox-key",
        AEROSYNC_API_SECRET: "sandbox-secret",
        AEROSYNC_AEROPASS_USER_UUID: "uuid-1",
        AEROSYNC_CONFIGURATION_ID: "config-1",
      },
      fetchImpl,
    });

    expect(session).toEqual({
      token: "widget-token",
      aeroPassUserUuid: "uuid-1",
      connectionId: "conn-1",
      userId: "user-1",
      environment: "sandbox",
      configurationId: "config-1",
    });
    expect(JSON.stringify(session)).not.toMatch(/sandbox-secret/);
  });
});
