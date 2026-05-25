# PropIntelligence Frontend

Premium AI-powered Australian property analytics dashboard — React + TypeScript + Vite.

## Design System

**"Data Noir"** aesthetic: deep navy (#08111F) foundation with amber gold (#E4A53A) data accents and electric teal (#12C8C0) for interactions.

- **Display font:** Cormorant (authoritative serif for headings)
- **Body font:** DM Sans (clean, modern)
- **Data font:** DM Mono (all numbers, codes, metadata — tabular-nums)

## Quick Start

```bash
# Install
npm install

# Dev server (proxies /api → http://localhost:5050)
npm run dev   # → http://localhost:3000

# Production build
npm run build
```

The API backend must be running at `http://localhost:5050`.
Start it with: `cd ../src/PropIntelligence.API && dotnet run`

Or with Docker: `docker compose up -d` from the project root.

## Pages

| Route             | Page                     | Description                                            |
|-------------------|--------------------------|--------------------------------------------------------|
| `/auth`           | Auth                     | Login/Register with animated AU map                    |
| `/`               | Dashboard                | Market metrics, trend chart, type breakdown, recent listings |
| `/search`         | Property Search          | Filter by suburb, state, type, price, beds — grid/list |
| `/properties/:id` | Property Detail          | Full specs, AVM confidence gauge, sales timeline, nearby |
| `/analytics`      | Suburb Analytics         | CoreLogic-style suburb intelligence with charts        |
| `/manage`         | Property Management      | Full CRUD table for agents/admins                      |
| `/nearby`         | Nearby Properties        | Coordinate + radius search, city presets               |

## API Wiring

All calls proxy through Vite (`/api → http://localhost:5050`).

- **Auth:** `POST /api/auth/login` · `POST /api/auth/register` → JWT stored in localStorage
- **Properties:** `GET /api/properties/search` · `GET /api/properties/{id}` · `GET /api/properties/{id}/valuation` · `GET /api/properties/{id}/nearby`
- **Sales:** `GET /api/sales?propertyId=...`
- **Suburbs:** `GET /api/suburbs/{suburb}/statistics?state=NSW`
- **Write ops** (Agent/Admin role required): `POST` / `PUT` / `DELETE /api/properties`

## Roles

- **Consumer** — read-only access to all GET endpoints
- **Agent** — can create/update properties, record sales, create listings
- **Admin** — all of the above + delete properties

Register → default Consumer role. Role shown in sidebar.
