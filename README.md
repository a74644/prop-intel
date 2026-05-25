<div align="center">

# PropIntelligence — AI-Powered Australian Property Analytics

**Full-stack proptech platform** — production-grade REST API with a premium React dashboard, interactive Mapbox maps, automated property valuations, and suburb market analytics.

[![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core-8.0-512BD4?style=flat-square&logo=dotnet&logoColor=white)](https://dotnet.microsoft.com/)
[![C#](https://img.shields.io/badge/C%23-12-239120?style=flat-square&logo=csharp&logoColor=white)](https://learn.microsoft.com/en-us/dotnet/csharp/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Mapbox GL](https://img.shields.io/badge/Mapbox_GL_JS-3-000000?style=flat-square&logo=mapbox&logoColor=white)](https://docs.mapbox.com/mapbox-gl-js/)
[![SQL Server](https://img.shields.io/badge/SQL_Server-2022-CC2927?style=flat-square&logo=microsoftsqlserver&logoColor=white)](https://www.microsoft.com/en-au/sql-server/)
[![Docker](https://img.shields.io/badge/Docker_Compose-ready-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docs.docker.com/compose/)
[![EF Core](https://img.shields.io/badge/EF_Core-8-512BD4?style=flat-square&logo=dotnet&logoColor=white)](https://learn.microsoft.com/en-us/ef/core/)
[![xUnit](https://img.shields.io/badge/xUnit-tested-5E5E5E?style=flat-square)](https://xunit.net/)
[![License](https://img.shields.io/badge/License-MIT-E4A53A?style=flat-square)](LICENSE)

</div>

---

## Overview

PropIntelligence is a full-stack Australian property analytics platform built to the technical standard of a real proptech production delivery. The backend exposes a Clean Architecture REST API with CQRS, geospatial search, and an Automated Valuation Model (AVM). The frontend is a premium React/TypeScript dashboard with interactive maps, analytics charts, and a full property management suite — designed with AI integration as a first-class citizen.

> **Data:** 35 seeded properties across Sydney, Melbourne, Brisbane, Gold Coast, Adelaide, and Perth — all with realistic AU addresses, coordinates, sales history, and active listings. Two properties intentionally have no sales history to exercise the "Insufficient Data" AVM path.

---

## Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| API framework | ASP.NET Core 8 | Production-grade; full Swagger/OpenAPI, minimal ceremony |
| Architecture | Clean Architecture | Strict unidirectional dependency flow: `API → Application → Domain ← Infrastructure` |
| CQRS | MediatR 12 | Clean command/query separation; zero coupling between handlers |
| ORM | EF Core 8 + SQL Server 2022 | Code-first migrations, change tracking, indexed lat/lon columns |
| Auth | JWT HS256 + BCrypt (wf=12) | Standard REST auth pattern; RS256 + Key Vault path documented |
| Testing | xUnit + Moq + FluentAssertions | Industry-standard .NET test stack; all deps mocked via interfaces |
| Containers | Docker Compose | One-command full-stack dev environment |
| Frontend | React 18 + TypeScript + Vite | Fast HMR, strict typing, zero-config bundling |
| Styling | Tailwind CSS | Utility-first; custom "Data Noir" design system |
| Maps | Mapbox GL JS (react-map-gl) | GeoJSON property markers, radius circles, interactive popups |
| Charts | Recharts | Area, bar, pie/donut charts for market analytics |
| Fonts | Cormorant + DM Sans + DM Mono | Editorial serif headings, clean body, monospace data |

---

## Features

### Backend API

- **Property search** — filter by suburb, state, postcode, type, bedrooms, price range; paginated `PagedResult<T>`
- **Geospatial radius search** — coordinate + radius (km) via Haversine formula with indexed bounding-box pre-filter
- **AVM (Automated Valuation Model)** — expanding-radius comparable-sales approach; confidence tiers: High / Medium / Low / Insufficient Data
- **Suburb analytics** — 12/24-month median prices, annual growth %, median days on market, auction clearance rate, breakdown by property type
- **Sales history** — per-property timeline; queryable by suburb + date range
- **Role-based auth** — Consumer (read) · Agent (create/update/sales/listings) · Admin (full delete)
- **GeoJSON output** — all property responses include a GeoJSON Point `location` field for direct Mapbox/Leaflet consumption
- **Idempotent data seeder** — 35 AU properties across 6 cities, runs on every startup without duplicating

### Frontend Dashboard

- **"Data Noir" design system** — deep navy (#08111F) base, amber-gold data accents, electric teal interactions; Cormorant serif display, DM Mono for all numbers
- **Interactive Mapbox map** — coloured markers by property type, hover price bubbles, animated pulse rings, radius circle overlay, property slide-up panel
- **AVM confidence gauge** — animated SVG arc meter (High=green / Medium=amber / Low=red) with comparable count and price range
- **Property search** — sidebar filters + grid / list / **map** view toggle; live results on the map as you filter
- **Suburb analytics** — median price trend, price by type bar chart, 12m vs 24m comparison
- **Nearby search** — split map + ranked list view; browser geolocation; city presets; radius circle on map
- **Property management** — full CRUD table (Agent/Admin); add/edit modal with form validation
- **Persistent JWT auth** — login/register, role badge in sidebar, auto-logout on 401

---

## Quick Start

**Prerequisite:** [Docker Desktop](https://www.docker.com/products/docker-desktop/) — no local .NET SDK or SQL Server required.

```bash
# 1. Clone
git clone https://github.com/<your-username>/prop-intelligence.git
cd prop-intelligence

# 2. Configure environment
cp .env.example .env
# Edit .env and fill in SA_PASSWORD, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD

# 3. Start the full stack
docker compose up -d --build
```

On first start (~20 s): SQL Server becomes healthy → EF Core migrations run → 35 properties seeded → admin account created.

| Endpoint | URL |
|---|---|
| **Swagger UI** | `http://localhost:5050/swagger` |
| **API base** | `http://localhost:5050/api` |
| **SQL Server** | `localhost:1433` (connect with Azure Data Studio / SSMS) |

### Run the Frontend

```bash
cd frontend
cp .env.example .env
# Add your Mapbox public token: VITE_MAPBOX_TOKEN=pk.xxx
npm install
npm run dev        # → http://localhost:3000
```

The Vite dev server proxies `/api/*` → `http://localhost:5050` automatically.

### Get a token and call the API

```bash
# Register (default role: Consumer)
curl -X POST http://localhost:5050/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"Pass1234!","firstName":"Dev","lastName":"User"}'

# Search properties — no auth required
curl "http://localhost:5050/api/properties/search?suburb=Surry+Hills&state=NSW"

# AVM valuation — requires Agent or Admin token
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5050/api/properties/<id>/valuation"

# Suburb statistics
curl "http://localhost:5050/api/suburbs/Fitzroy/statistics?state=VIC"
```

---

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│              React / TypeScript Frontend                 │
│  Vite · Tailwind · react-map-gl · Recharts               │
│                  (port 3000)                             │
└──────────────────────┬───────────────────────────────────┘
                       │  HTTPS / JWT Bearer
┌──────────────────────▼───────────────────────────────────┐
│                ASP.NET Core 8 Web API                    │
│  PropertiesController  SuburbsController  AuthController │
│  SalesController                                         │
│  GlobalExceptionMiddleware · JWT Bearer Middleware       │
│                  (port 5050 / 8080 in container)         │
└────────┬───────────────────────────────────┬─────────────┘
         │  MediatR (IRequest / IRequestHandler)
┌────────▼────────────────────────────────────▼────────────┐
│                   Application Layer                      │
│                                                          │
│  Commands                    Queries                     │
│  ────────────────────         ─────────────────────────  │
│  CreateProperty               GetPropertyById            │
│  UpdateProperty               SearchProperties           │
│  DeleteProperty               GetNearbyProperties        │
│  RecordSale                   GetPropertyValuation       │
│  CreateListing                GetSuburbStatistics        │
│  Register / Login             GetSalesHistory            │
│                                                          │
│  GeoUtils  ·  Interfaces  ·  DTOs  ·  PagedResult<T>    │
└────────┬───────────────────────────────────┬─────────────┘
         │  (IRepository / ITokenService / …)
┌────────▼────────────────────────────────────▼────────────┐
│               Infrastructure Layer                       │
│                                                          │
│  ┌─────────────────────────┐  ┌──────────────────────┐  │
│  │  EF Core 8 / SQL Server │  │  Auth                │  │
│  │  PropIntelligenceContext │  │  TokenService  (JWT) │  │
│  │  4 × IRepository impls  │  │  PasswordService     │  │
│  │  UnitOfWork             │  │  (BCrypt wf=12)      │  │
│  │  Code-first migrations  │  └──────────────────────┘  │
│  │  DataSeeder (35 props)  │                            │
│  └─────────────────────────┘                            │
└──────────────────────────────────────────────────────────┘

PropIntelligence.Domain — Property · SalesHistory · PropertyListing · User
Enums: AustralianState · PropertyType · SaleMethod · ListingStatus · UserRole
Zero external dependencies. Static factories + private setters.
```

---

## Project Structure

```
prop-intelligence/
│
├── src/
│   ├── PropIntelligence.Domain/
│   │   ├── Entities/         Property, SalesHistory, PropertyListing, User
│   │   └── Enums/            AustralianState, PropertyType, SaleMethod,
│   │                         ListingStatus, ListingType, UserRole
│   │
│   ├── PropIntelligence.Application/
│   │   ├── Commands/         Auth/, Properties/, Sales/
│   │   ├── Queries/          Properties/, Suburbs/
│   │   ├── Common/           GeoUtils.cs  (Haversine + bounding-box filter)
│   │   ├── DTOs/             All request/response shapes + GeoJsonPoint
│   │   └── Interfaces/       IPropertyRepository, ISalesHistoryRepository,
│   │                         IListingRepository, IUserRepository,
│   │                         ITokenService, IPasswordService, IUnitOfWork
│   │
│   ├── PropIntelligence.Infrastructure/
│   │   ├── Auth/             TokenService (JWT), PasswordService (BCrypt)
│   │   └── Persistence/
│   │       ├── Configurations/  EF entity configs + composite indexes
│   │       ├── Migrations/      InitialCreate + model snapshot
│   │       ├── Repositories.cs  All 4 repository implementations
│   │       ├── PropIntelligenceContext.cs
│   │       └── Seed/            DataSeeder.cs (35 AU properties, idempotent)
│   │
│   └── PropIntelligence.API/
│       ├── Controllers/      Auth, Properties, Suburbs, Sales
│       ├── Middleware/       GlobalExceptionMiddleware
│       ├── Dockerfile
│       └── Program.cs
│
├── tests/
│   └── PropIntelligence.Tests/Unit/
│       ├── GeoUtilsTests.cs                  Haversine accuracy, bounding box
│       ├── CreatePropertyCommandTests.cs     Handler happy path + validation
│       ├── GetPropertyValuationQueryTests.cs AVM confidence tier logic
│       └── SuburbStatisticsQueryTests.cs     Median, growth, clearance rate
│
├── frontend/                    React/TypeScript dashboard
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.tsx           Sidebar navigation shell
│   │   │   └── PropertyMap.tsx      Mapbox GL map with coloured markers
│   │   ├── pages/
│   │   │   ├── AuthPage.tsx         Login/Register with animated AU map
│   │   │   ├── DashboardPage.tsx    Market overview + charts
│   │   │   ├── SearchPage.tsx       Filter sidebar + grid/list/map views
│   │   │   ├── PropertyDetailPage.tsx  AVM gauge + sales timeline + mini map
│   │   │   ├── SuburbAnalyticsPage.tsx CoreLogic-style suburb stats
│   │   │   ├── PropertyManagementPage.tsx  Full CRUD table + modals
│   │   │   └── NearbyPage.tsx       Split map + ranked list proximity search
│   │   ├── lib/
│   │   │   ├── api.ts               Typed API client (JWT injection, error handling)
│   │   │   ├── auth.tsx             AuthContext + JWT persistence
│   │   │   └── utils.ts             Formatters, colour maps, GeoJSON helpers
│   │   └── types/index.ts           Full TypeScript DTOs mirroring backend
│   └── package.json
│
├── docker-compose.yml
├── .env.example
└── PropIntelligence.sln
```

---

## Key Design Decisions

### 1 · Geospatial: Haversine vs. NetTopologySuite

Lat/lon are stored as `double` columns rather than SQL Server `geography` type. The Haversine formula runs in the Application layer on a bounding-box pre-filtered candidate set from indexed lat/lon columns.

**Why:** NetTopologySuite adds a native dependency that complicates Docker images and CI pipelines. For suburb-scale AU property searches (≤50 km radius), Haversine error is ~0.5% — negligible for discovery, unacceptable for surveying. `GeoUtils.cs` documents the SQL spatial index + NetTopologySuite upgrade path for high-volume production loads.

### 2 · AVM Methodology

The `GetPropertyValuationQuery` implements an expanding-radius comparable-sales AVM:

1. Expanding radius: 1 km → 2 km → 5 km until enough comps found
2. Filter: same `PropertyType` ± 1 bedroom (the two highest-impact comparability factors)
3. Recency window: last 18 months
4. **Median** price-per-sqm from comps (robust to outliers; mean is not)
5. Multiply by subject property floor area → point estimate, ±10% confidence band

| Confidence | Criteria |
|---|---|
| **High** | ≥5 comps · ≤1 km · ≤6 months |
| **Medium** | 3–4 comps · or ≤2 km / ≤12 months |
| **Low** | 1–2 comps — indicative only |
| **Insufficient Data** | 0 comps, or no floor area on subject |

Aligns with published CoreLogic/PropTrack confidence methodology.

### 3 · GeoJSON Output

All property responses include a `location: GeoJsonPoint` field per RFC 7946. Coordinates are `[longitude, latitude]` — GeoJSON's `[x, y]` ordering. The frontend consumes this directly without any coordinate swapping, and the Mapbox markers are rendered from the raw GeoJSON.

### 4 · Nullable `AdvertisedPrice`

Australian listings commonly display "Contact Agent" instead of a price. `PropertyListing.AdvertisedPrice` is nullable; `PriceText` always carries a display string (`"Contact Agent"`, `"$1.2M–$1.35M"`, `"Offers Over $950,000"`).

### 5 · Nullable `DaysOnMarket` on Sales

Off-market sales have no listing period. Defaulting to zero would corrupt suburb-level DOM statistics. The field is nullable; the AVM and suburb stats queries filter it appropriately.

### 6 · Uniform Auth Error Messages

`LoginCommand` returns `"Invalid email or password"` for both "email not found" and "wrong password" — preventing email enumeration attacks where an attacker could distinguish registered from unregistered accounts.

### 7 · BCrypt Work Factor 12

Calibrated to ~250 ms hash time on modern hardware — slow enough to deter brute force, fast enough for a tolerable login UX. `PasswordService.cs` includes a comment citing OWASP guidance to recalibrate every 2 years.

### 8 · Frontend: "Data Noir" Design System

Premium real estate intelligence aesthetic:
- **Background:** `#08111F` deep navy
- **Accent 1:** `#E4A53A` amber gold — data highlights, prices
- **Accent 2:** `#12C8C0` electric teal — interactions, live data
- **Display font:** Cormorant (editorial serif — authority without stiffness)
- **Data font:** DM Mono with `tabular-nums` — every price and metric rendered with terminal-grade precision

---

## API Reference (summary)

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Register (default: Consumer role) |
| `POST` | `/api/auth/login` | — | Obtain JWT |

### Properties
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/properties/search` | — | Filter + paginate |
| `GET` | `/api/properties/{id}` | — | Detail + sales history + listings |
| `GET` | `/api/properties/{id}/nearby` | — | Nearby by property (radius km) |
| `GET` | `/api/properties/nearby` | — | Nearby by coordinate |
| `GET` | `/api/properties/{id}/valuation` | Agent+ | AVM estimate + comparables |
| `POST` | `/api/properties` | Agent+ | Create |
| `PUT` | `/api/properties/{id}` | Agent+ | Update attributes |
| `DELETE` | `/api/properties/{id}` | Admin | Delete |
| `POST` | `/api/properties/{id}/sales` | Agent+ | Record sale |

### Suburbs & Sales
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/suburbs/{suburb}/statistics?state=` | — | 12/24m medians, growth, clearance rate |
| `GET` | `/api/sales?propertyId=` | — | Sales history feed |

---

## Running Tests

```bash
dotnet test --logger "console;verbosity=normal"
```

Tests cover: Haversine accuracy (verified against known AU city pair distances), AVM confidence tier boundaries, suburb median/growth calculations, nullable DaysOnMarket handling, uniform auth error messages.

All external dependencies are mocked via interfaces — tests run with no database or network.

---

## Docker Operations

```bash
# Full stack (first run: build → migrate → seed → start)
docker compose up -d --build

# Tail API logs
docker compose logs -f api

# Rebuild API only after a code change (SQL Server data untouched)
docker compose up -d --build --no-deps api

# Full reset including all data
docker compose down -v
```

---

## Roadmap

- [ ] **SQL spatial indexes** — swap `double` lat/lon for `geography` type with NetTopologySuite
- [ ] **Caching** — Redis for suburb statistics (high read, low write)
- [ ] **Background jobs** — Hangfire for scheduled AVM pre-computation
- [ ] **RS256 + Azure Key Vault** — production JWT signing
- [ ] **Integration tests** — `WebApplicationFactory<Program>` + Testcontainers for SQL Server
- [ ] **Rate limiting** — token bucket on public search endpoints

---

## License

[MIT](LICENSE)
