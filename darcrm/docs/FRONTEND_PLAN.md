# DarCRM — Frontend plan (v1)

Single agency, CRM + public listing site in one Next.js app. The backend does not exist yet: every data
access goes through a **port** (interface) with a working **mock adapter** and an **HTTP adapter stub**.

## 1. Roles and access

| Role | Entry | Sees |
|---|---|---|
| Admin (`admin`) | `/crm` | All listings, leads, agents, deals, commission, dashboard, settings |
| Agent (`agent`) | `/crm` | Own leads, own listings, own appointments, own commission |
| Public user (`user`) | `/compte` | Favorites, saved searches, alerts received |
| Visitor | `/` | Published + available listings only |

Scoping is enforced in the **application layer** (use cases receive a `Session`), never only in the UI.
Public pages only ever receive `PublicListing`, a projection that physically lacks owner, notes,
commission, exact address of protected listings and draft/closed items.

## 2. Route map

Public (`src/app/(public)`):
- `/` home: search-first hero, featured listings, browse by city
- `/annonces` search results: filters in the URL (type, city, price, rooms, surface, sort, page), save-search
- `/annonces/[slug]` detail: gallery, key facts, description, amenities, agent card (call / WhatsApp), inquiry form, similar listings, favorite
- `/connexion`, `/inscription`
- `/compte` favorites, saved searches (WhatsApp alert toggle), alerts received, profile

CRM (`src/app/(crm)/crm`):
- `/crm` dashboard: admin = agency overview; agent = own day
- `/crm/biens`, `/crm/biens/nouveau`, `/crm/biens/[ref]/modifier` listings (visibility, status, owner, internal notes)
- `/crm/prospects` pipeline board (new → contacted → visit scheduled → negotiating → closed / lost) + list view
- `/crm/prospects/[id]` lead profile: criteria, activity log, appointments, matched listings, assignment
- `/crm/rendez-vous` week agenda, create appointment linked to lead + listing
- `/crm/rapprochement` matching: pick a lead → ranked listings with score
- `/crm/agents`, `/crm/agents/[id]` (admin) performance, deals, commission
- `/crm/parametres` agency identity, WhatsApp number, alert settings

## 3. Architecture (dependencies point inward)

```
src/
  domain/          pure TS: entities, value rules, matching, permissions, public projection
  application/     ports (interfaces) + use cases (one file per feature)
  infrastructure/  mock/ (in-memory store + adapters)  http/ (fetch adapters, endpoint stubs)
                   container.ts (composition root, API_MODE=mock|http), session.ts (cookie)
  app/             routes, layouts, server actions (thin: session -> use case -> revalidate)
  components/      ui/ (primitives)  public/  crm/
```

Data flow: Server Component or Server Action → use case(deps, session, input) → port → adapter.
The browser never calls the backend directly (token stays server-side, CORS-free).

## 4. Sync (CRM = source of truth)

- One store behind the ports; public read model queries the same listings.
- Every CRM mutation ends with `revalidatePath` for `/`, `/annonces`, `/annonces/[slug]`.
- Public queries filter `visibility = published AND status = available`.
- Publishing a listing runs `dispatchSavedSearchAlerts` → `AlertGateway.sendWhatsapp` (mock: logged and shown in `/compte`).
- Inquiry form → `createLeadFromInquiry`: stage `new`, assigned to the listing's agent, listing attached, source `website`, CRM notification created.

## 5. UI system

- Tokens from the Stitch `DESIGN.md` (already in `tailwind.config.ts`); Inter everywhere; public headlines use Sora.
- Currency `1 250 000 TND`, `450 TND / mois`; tabular figures for all amounts.
- Primitives: Button, Badge, Icon, Card, Field/Input/Select, Modal, EmptyState, Pagination, Tabs, BarChart (SVG), Avatar.
- Every list has loading (`loading.tsx`), empty, and error states with a next action.
- French copy, sentence case; strings isolated in components so an Arabic/RTL pass is possible later.
- Responsive: public site mobile-first; CRM desktop-first with a collapsing sidebar below `lg`.

## 6. Backend hand-off

- `docs/API_CONTRACT.md` lists every endpoint the frontend expects, with request/response shapes.
- Fill `src/infrastructure/http/*` (each method has the endpoint, a TODO and the DTO mapping) and set
  `API_MODE=http`, `API_BASE_URL=...`. No UI change required.
- Auth placeholder: `POST /auth/login` returns `{ token, user }`; token stored in an httpOnly cookie.

## 7. Demo accounts (mock mode)

- Admin: `admin@darcrm.tn` / `demo1234`
- Agent: `sami@darcrm.tn` / `demo1234`
- Public user: `user@darcrm.tn` / `demo1234`
The login page has one-click buttons for each.

## 8. Phases

1. Domain, ports, mock + HTTP stubs, session, container
2. Public site (home, search, detail + inquiry, auth, account)
3. CRM listings (list, create/edit with visibility, owner, notes)
4. CRM pipeline, lead detail, appointments, matching
5. Admin dashboard, agents, commission, settings
6. Smoke test of the core flow, hand-off

## 9. Out of scope for v1 (designed for, not built)

Multi-agency (every entity carries `agencyId`), Transaction layer for new developments, real photo upload
(placeholder: URL list), real WhatsApp delivery (gateway port), Arabic UI.
