# API contract

Implemented by `../server` (NestJS). Enable with `API_MODE=http` and `API_BASE_URL=http://localhost:4000/api`.
Authoritative source: `server/src/interface/http/**` (controllers) and `server/README.md`.

Conventions: JSON, `Authorization: Bearer <token>`, ISO dates. Errors are `{ message, fields? }` with
400 (malformed), 401 (no/invalid session), 403 (wrong role / not your record), 404, 422 (business rule), 429.
The server enforces role scoping; the front only displays.

| Area | Routes |
|---|---|
| Auth | `POST /auth/login`, `POST /auth/register`, `GET /auth/me` |
| Public | `GET /public/agency`, `/public/cities`, `/public/listings` (filters `transaction, cityId, propertyType, priceMin, priceMax, minRooms, minArea, sort, page, pageSize`), `/public/listings/featured`, `/public/listings/by-ids?ids=`, `/public/listings/{slug}`, `/public/listings/{slug}/similar`; `POST /public/listings/{slug}/inquiries` → `{ leadId }` |
| Agents | `GET /agents`, `/agents/{id}` (full for staff, public fields otherwise) |
| Profile | `PUT /me/profile` (any role: name, phone; staff also whatsapp, jobTitle), `POST /me/password` |
| Account | `GET /me/profile`, `/me/favorites`, `PUT/DELETE /me/favorites/{id}`, `GET/POST /me/saved-searches`, `PUT/DELETE /me/saved-searches/{id}`, `GET /me/alerts` |
| Listings | `GET/POST /crm/listings`, `GET/PUT/DELETE /crm/listings/{id}`, `POST /crm/listings/{id}/publish|unpublish`. Server assigns `id`, `ref`, `slug` on POST |
| Leads | `GET/POST /crm/leads`, `GET/PUT /crm/leads/{id}`, `GET/POST /crm/leads/{id}/activities` |
| Agenda | `GET/POST /crm/appointments`, `GET/PATCH /crm/appointments/{id}` (status only) |
| Deals | `GET/POST /crm/deals` (POST closes the listing; one deal per lead) |
| Other | `GET /crm/notifications`, `PATCH /crm/notifications/read`, `GET/PUT /crm/settings/agency` (admin) |

Dashboards, matching and agent performance are computed in the front's application layer from these lists.
