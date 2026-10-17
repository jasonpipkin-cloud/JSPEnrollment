/** @vitest-environment node */
import request from "supertest";
import { createApp } from "./server.js";
import { openApiSpec } from "./openapi.js";
import { validContact } from "./src/testFixtures.js";

function testApp(overrides = {}) {
  const insertContact = overrides.insertContact ?? vi.fn(async (value) => ({
    id: "1",
    ...value,
    createdAt: "2026-08-20T18:00:00.000Z",
  }));
  const listContacts = overrides.listContacts ?? vi.fn(async () => []);
  const onStop = overrides.onStop ?? vi.fn();
  const createAerosyncSession = overrides.createAerosyncSession ?? vi.fn(async () => ({
    token: "sandbox-token",
    aeroPassUserUuid: "sandbox-uuid",
    environment: "sandbox",
    configurationId: "",
  }));
  const app = createApp({ insertContact, listContacts, onStop, createAerosyncSession });
  return { app, insertContact, listContacts, onStop, createAerosyncSession };
}

describe("JSPEnrollment API", () => {
  it("rejects an empty POST with field errors", async () => {
    const { app, insertContact } = testApp();
    const response = await request(app).post("/api/contacts").send({});
    expect(response.status).toBe(400);
    expect(response.body.message).toMatch(/correct the highlighted fields/i);
    expect(response.body.errors.firstName).toBeDefined();
    expect(response.body.errors.address2).toBeUndefined();
    expect(insertContact).not.toHaveBeenCalled();
  });

  it("saves a valid contact", async () => {
    const { app, insertContact } = testApp();
    const response = await request(app).post("/api/contacts").send(validContact);
    expect(response.status).toBe(201);
    expect(response.body.ok).toBe(true);
    expect(response.body.contact.firstName).toBe("Ada");
    expect(insertContact).toHaveBeenCalledWith(expect.objectContaining({
      firstName: "Ada",
      state: "CA",
      mobilePhone: "4155550100",
    }));
  });

  it("normalizes phone numbers before insert", async () => {
    const { app, insertContact } = testApp();
    await request(app).post("/api/contacts").send({
      ...validContact,
      mobilePhone: "1-415-555-0100",
    });
    expect(insertContact).toHaveBeenCalledWith(expect.objectContaining({
      mobilePhone: "4155550100",
    }));
  });

  it("returns 500 when insert fails", async () => {
    const { app } = testApp({
      insertContact: vi.fn(async () => {
        throw new Error("db down");
      }),
    });
    const response = await request(app).post("/api/contacts").send(validContact);
    expect(response.status).toBe(500);
    expect(response.body.message).toMatch(/could not save/i);
  });

  it("lists saved contacts", async () => {
    const { app } = testApp({
      listContacts: vi.fn(async () => [{ id: "1", ...validContact }]),
    });
    const response = await request(app).get("/api/contacts");
    expect(response.status).toBe(200);
    expect(response.body.contacts).toHaveLength(1);
    expect(response.body.contacts[0].lastName).toBe("Lovelace");
  });

  it("serves the OpenAPI document", async () => {
    const { app } = testApp();
    const response = await request(app).get("/openapi.json");
    expect(response.status).toBe(200);
    expect(response.body.openapi).toMatch(/^3\./);
    expect(response.body.paths["/api/contacts"].post).toBeDefined();
    expect(response.body.paths["/api/contacts"].get).toBeDefined();
    expect(response.body.paths["/api/aerosync/widget-session"].post).toBeDefined();
    expect(openApiSpec.info.title).toBe("JSPEnrollment API");
  });

  it("serves the Swagger UI page", async () => {
    const { app } = testApp();
    const response = await request(app).get("/api-docs/");
    expect(response.status).toBe(200);
    expect(response.text).toMatch(/swagger/i);
  });

  it("stops the application", async () => {
    vi.useFakeTimers();
    const { app, onStop } = testApp();
    const response = await request(app).post("/api/stop");
    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    await vi.advanceTimersByTimeAsync(200);
    expect(onStop).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it("returns a sandbox Aerosync widget session", async () => {
    const { app, createAerosyncSession } = testApp();
    const response = await request(app).post("/api/aerosync/widget-session");
    expect(response.status).toBe(200);
    expect(response.body.environment).toBe("sandbox");
    expect(response.body.token).toBe("sandbox-token");
    expect(createAerosyncSession).toHaveBeenCalled();
  });

  it("returns 503 when Aerosync sandbox is not configured", async () => {
    const error = new Error("Aerosync sandbox is not configured.");
    error.status = 503;
    const { app } = testApp({
      createAerosyncSession: vi.fn(async () => {
        throw error;
      }),
    });
    const response = await request(app).post("/api/aerosync/widget-session");
    expect(response.status).toBe(503);
    expect(response.body.message).toMatch(/not configured/i);
  });
});
