# DarCRM : API (NestJS)

Backend of the real-estate agency platform. The Next.js front (`../darcrm`) talks to it with `API_MODE=http`.

## Run

```bash
cp .env.example .env        # set JWT_SECRET
npm install
npm run start:dev           # http://localhost:4000/api
```

By default it uses an **in-memory database seeded with demo data** (same accounts as the front's mock, password `demo1234`:
`admin@darcrm.tn`, `sami@darcrm.tn`, `leila@darcrm.tn`, `user@darcrm.tn`). Data is lost on restart.

Front, in `darcrm/.env.local`:

```
API_MODE=http
API_BASE_URL=http://localhost:4000/api
```

## Production setup

1. `DB_DRIVER=mongo`, `MONGODB_URI`, `MONGODB_DB`.
2. `SEED_DEMO_DATA=false` and `ADMIN_EMAIL` / `ADMIN_PASSWORD`: the first start on an empty database creates the agency and one admin (further agents: see "Not built yet"). `ADMIN_EMAIL` / `ADMIN_PASSWORD` also work with demo data: the account is created at startup if it does not exist, and never overwritten afterwards (change the password in the profile page).
3. Strong `JWT_SECRET`, `CORS_ORIGINS` set to the site's origin(s). Serve behind HTTPS.
4. WhatsApp alerts: `WHATSAPP_PHONE_NUMBER_ID` + `WHATSAPP_ACCESS_TOKEN` (Meta Cloud API). Free-form text only reaches people who wrote to the agency in the last 24 h; for real alerts, create an approved message template and adapt `src/infrastructure/whatsapp/alert-gateways.ts`.

## Architecture

```
src/
  domain/           pure rules and types (no framework)
  application/      use cases, depend on domain + ports (application/ports.ts)
  infrastructure/   persistence (memory, mongo), repositories, scrypt, seed, WhatsApp
  interface/http/   controllers, zod schemas, session guard, error filter
  app.module.ts     composition root
```

Dependencies point inward. Controllers validate input with zod, resolve the JWT into a domain `Session`, and call a use case. Authorisation (role, per-agent scope) lives in the application layer, not in the controllers.

`src/domain` and `src/application` are copies of the front's. Keep them in sync when you change a business rule (a shared package is the next step if both evolve). Server-only additions: `application/crm/records.ts`, `application/account/upsert-saved-search.ts`.

## API

Full list: `claude/api-contract.md` in the Claude project, or read `src/interface/http/**`. Conventions:

- `Authorization: Bearer <token>` from `POST /api/auth/login`.
- Errors: `{ "message": "...", "fields"?: { "field": "message" } }`. 400 malformed, 401 no/invalid session, 403 wrong role or not your record, 404, 422 business rule.
- Public routes only return the public projection (no owner, commission, mandate, keys, private notes).

## Tests

```bash
npm test                                   # e2e on the in-memory database
MONGODB_TEST_URI=mongodb://localhost:27017 npm test   # also runs the Mongo adapter contract
```

## Not built yet

- Creating/deactivating agents and password reset (agents are seeded or created in the database).
- Photo upload: photos are stored as the URLs the front sends.
- Scheduled reminders (appointment reminders are stored as notifications dated in the future).
- Refresh tokens: access token lifetime is `JWT_TTL_SECONDS` (12 h).
