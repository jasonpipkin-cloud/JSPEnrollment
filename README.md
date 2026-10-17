# JSPEnrollment

Personal sandbox prototype of a two-step enrollment flow:

1. Validate and save a contact (name, address, mobile).
2. Optionally link a bank through **Aerosync sandbox**, then close the app.

Built as a small, Dockerized full-stack demo: React 19 + Vite on the client, Express + SQL Server on the server, Vitest coverage around validation, API, and the sandbox widget session.

This is **not** a production payments product. Aerosync calls are locked to sandbox hosts, and secrets stay in environment variables.

## Stack

- React 19 and Vite
- Express REST API with Swagger UI at `/api-docs`
- SQL Server 2022 (Docker)
- Aerosync Web SDK (sandbox only)
- Docker Compose
- Vitest, Testing Library, Supertest

## Run with Docker

```bash
docker compose up --build
```

Open [http://localhost:8081](http://localhost:8081).

SQL credentials in `docker-compose.yml` are **local demo values only**. Bank linking stays off until you set the `AEROSYNC_*` variables.

## Run locally

```bash
cp .env.example .env
npm install
npm run build
npm start
```

Vite dev server (`npm run dev`) proxies `/api` to `http://localhost:3000`.

## Tests

```bash
npm run test:run
```

## API

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/api/contacts` | Validate and store a contact |
| `GET` | `/api/contacts` | List recent contacts |
| `POST` | `/api/aerosync/widget-session` | Create an Aerosync sandbox widget token |
| `GET` | `/api-docs` | Swagger UI |

## Notes

- Address 2 is optional; other contact fields are required.
- Widget sessions refuse any non-sandbox Aerosync environment.
- Replace `public/logo.svg` (or `public/app-config.json`) if you want different branding.
