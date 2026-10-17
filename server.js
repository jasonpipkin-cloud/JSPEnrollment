import express from "express";
import fs from "fs";
import path from "path";
import { createRequire } from "module";
import { fileURLToPath } from "url";
import { createAerosyncWidgetSession } from "./aerosync.js";
import { initDb, insertContact, listContacts } from "./db.js";
import { openApiSpec } from "./openapi.js";
import { validateContact } from "./src/validation.js";

const require = createRequire(import.meta.url);
const swaggerUi = require("swagger-ui-express");
const defaultDist = path.join(path.dirname(fileURLToPath(import.meta.url)), "dist");

export function createApp({
  insertContact: insertFn,
  listContacts: listFn,
  distDir = defaultDist,
  onStop,
  createAerosyncSession = createAerosyncWidgetSession,
} = {}) {
  if (!insertFn || !listFn) {
    throw new Error("insertContact and listContacts are required.");
  }

  const app = express();
  app.use(express.json({ limit: "32kb" }));

  app.get("/openapi.json", (_req, res) => {
    res.json(openApiSpec);
  });
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(openApiSpec, {
    customSiteTitle: "JSPEnrollment API",
  }));

  app.post("/api/contacts", async (req, res) => {
    const result = validateContact(req.body ?? {});
    if (!result.ok) {
      return res.status(400).json({
        message: "Please correct the highlighted fields.",
        errors: result.errors,
      });
    }

    try {
      const contact = await insertFn(result.value);
      res.status(201).json({ ok: true, contact });
    } catch (error) {
      console.error("insertContact failed", error);
      res.status(500).json({ message: "Could not save the contact." });
    }
  });

  app.get("/api/contacts", async (_req, res) => {
    try {
      const contacts = await listFn();
      res.json({ contacts });
    } catch (error) {
      console.error("listContacts failed", error);
      res.status(500).json({ message: "Could not load contacts." });
    }
  });

  app.post("/api/aerosync/widget-session", async (_req, res) => {
    try {
      const session = await createAerosyncSession();
      res.json(session);
    } catch (error) {
      const status = Number(error?.status) || 502;
      res.status(status).json({
        message: error?.message || "Could not start Aerosync sandbox bank linking.",
      });
    }
  });

  app.post("/api/stop", (_req, res) => {
    res.json({ ok: true });
    setTimeout(() => {
      if (typeof onStop === "function") onStop();
      else process.exit(0);
    }, 150);
  });

  const indexFile = path.join(distDir, "index.html");
  if (fs.existsSync(indexFile)) {
    app.use(express.static(distDir));
    app.get("*", (_req, res) => {
      res.sendFile(indexFile);
    });
  }

  return app;
}

async function start() {
  await initDb();
  const app = createApp({ insertContact, listContacts });
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, "0.0.0.0", () => {
    console.log(`JSPEnrollment listening on ${port}`);
  });
}

const launchedDirectly = path.basename(process.argv[1] ?? "") === "server.js";
if (launchedDirectly) {
  start().catch((error) => {
    console.error("SQL startup failed", error);
    process.exit(1);
  });
}
