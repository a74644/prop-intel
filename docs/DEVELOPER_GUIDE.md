# Developer Guide — PropIntelligence

Technical reference for architecture, local setup, API, testing, and deployment.

---

## Table of Contents

1. [Local Setup](#local-setup)
2. [Architecture](#architecture)
3. [Project Structure](#project-structure)
4. [API Reference](#api-reference)
5. [Key Design Decisions](#key-design-decisions)
6. [Running Tests](#running-tests)
7. [Docker Operations](#docker-operations)
8. [EF Core Migrations](#ef-core-migrations)
9. [Seeded Data](#seeded-data)
10. [Roadmap](#roadmap)

---

## Local Setup

**Option A — Docker (no local SDK required)**

```bash
cp .env.example .env
# Edit .env: set SA_PASSWORD, JWT_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD
docker compose up -d --build
```

On first start (~20 s): SQL Server becomes healthy → EF Core migrations run → 35 properties seeded → admin account created.

| Service | URL |
|---|---|
| **Swagger UI** | `http://localhost:5050/swagger` |
| **API base** | `http://localhost:5050/api` |
| **SQL Server** | `localhost:1433` |

**Option B — Local SDK**

Create `src/PropIntelligence.API/appsettings.Development.json`:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost,1433;Database=PropIntelligence;User Id=sa;Password=YourStrong!Password123;TrustServerCertificate=True;"
  },
  "Jwt": {
    "Secret": "your-local-dev-secret-at-least-32-chars-long",
    "Issuer": "PropIntelligence",
    "Audience": "PropIntelligence",
    "ExpiryMinutes": 60
  },
  "Seed": {
    "AdminEmail": "admin@propintelligence.local",
    "AdminPassword": "Admin@PropIntel2024!"
  },
  "OpenRouter": {
    "ApiKey": "sk-or-v1-your-key-here",
    "Model": "openrouter/free"
  }
}
```

```bash
docker compose up -d sqlserver   # start DB only
cd src/PropIntelligence.API && dotnet run
```

**Frontend**

```bash
cd frontend
cp .env.example .env
# Set VITE_MAPBOX_TOKEN=pk.xxx
npm install
npm run dev      # → http://localhost:3000
```

Vite proxies `/api/*` → `http://localhost:5050` automatically.

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
│  SalesController  AISearchController                     │
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
│  NaturalLanguageSearch        AIPropertySearch           │
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
│  │  DataSeeder (35 props)  │  ┌──────────────────────┐  │
│  └─────────────────────────┘  │  AI / LLM            │  │
│                                │  OpenRouter client   │  │
│                                │  Prompt templates    │  │
│                                └──────────────────────┘  │
└──────────────────────────────────────────────────────────┘

PropIntelligence.Domain — Property · SalesHistory · PropertyListing · User
Enums: AustralianState · PropertyType · SaleMethod · ListingStatus · UserRole
Zero external dependencies. Static factories + private setters.
```

**Dependency rule:** `API → Application → Domain ← Infrastructure`. The Domain knows nothing; Infrastructure and API implement interfaces declared in Application.

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
│       ├── Controllers/      Auth, Properties, Suburbs, Sales, AISearch
│       ├── Middleware/       GlobalExceptionMiddleware
│       ├── Dockerfile
│       └── Program.cs
│
├── tests/
│   └── PropIntelligence.Tests/Unit/
│       ├── GeoUtilsTests.cs
│       ├── CreatePropertyCommandTests.cs
│       ├── GetPropertyValuationQueryTests.cs
│       └── SuburbStatisticsQueryTests.cs
│
├── frontend/
│   └── src/
│       ├── components/
│       │   ├── Layout.tsx           Sidebar navigation shell
│       │   └── PropertyMap.tsx      Mapbox GL map with coloured markers
│       ├── pages/
│       │   ├── AuthPage.tsx
│       │   ├── DashboardPage.tsx
│       │   ├── SearchPage.tsx
│       │   ├── PropertyDetailPage.tsx
│       │   ├── SuburbAnalyticsPage.tsx
│       │   ├── PropertyManagementPage.tsx
│       │   └── NearbyPage.tsx
│       └── lib/
│           ├── api.ts               Typed API client (JWT injection)
│           ├── auth.tsx             AuthContext + persistence
│           └── utils.ts             Formatters, colour maps, GeoJSON helpers
│
├── docs/                      Additional documentation
├── docker-compose.yml
├── .env.example
└── PropIntelligence.sln
```

---

## API Reference

### Auth
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | — | Register (default: Consumer) |
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

### AI Search
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/ai/search` | — | Natural language → structured property query |

**Example curl calls:**

```bash
# Register
curl -X POST http://localhost:5050/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@example.com","password":"Pass1234!","firstName":"Dev","lastName":"User"}'

# Search
curl "http://localhost:5050/api/properties/search?suburb=Surry+Hills&state=NSW"

# AVM
curl -H "Authorization: Bearer <token>" \
  "http://localhost:5050/api/properties/<id>/valuation"

# Suburb stats
curl "http://localhost:5050/api/suburbs/Fitzroy/statistics?state=VIC"

# AI natural language search
curl -X POST http://localhost:5050/api/ai/search \
  -H "Content-Type: application/json" \
  -d '{"query":"3 bedroom house near a good school in Melbourne under $1.5M"}'
```

---

## Key Design Decisions

### 1 · Geospatial: Haversine vs. NetTopologySuite

Lat/lon stored as `double` columns rather than SQL Server `geography`. Haversine runs in the Application layer on a bounding-box pre-filtered candidate set (indexed lat/lon columns).

**Why:** NetTopologySuite adds a native dependency that complicates Docker images and CI. For suburb-scale AU searches (≤50 km), Haversine error is ~0.5% — acceptable for discovery. `GeoUtils.cs` documents the SQL spatial index + NetTopologySuite upgrade path for high-volume production.

### 2 · AVM Methodology

`GetPropertyValuationQuery` implements an expanding-radius comparable-sales AVM:

1. Expanding radius: 1 km → 2 km → 5 km until enough comps found
2. Filter: same `PropertyType` ± 1 bedroom
3. Recency window: last 18 months
4. **Median** price-per-sqm from comps (robust to outliers; mean is not)
5. Multiply by subject floor area → point estimate, ±10% confidence band

| Confidence | Criteria |
|---|---|
| **High** | ≥5 comps · ≤1 km · ≤6 months |
| **Medium** | 3–4 comps · or ≤2 km / ≤12 months |
| **Low** | 1–2 comps — indicative only |
| **Insufficient** | 0 comps, or no floor area on subject |

Aligns with published CoreLogic/PropTrack confidence methodology.

### 3 · AI Natural Language Search

Queries like *"3-bed house in Melbourne under $1.2M near schools"* are sent to an LLM via the OpenRouter API. The model extracts structured filters (suburb, type, bedrooms, price range) as JSON, which is then applied directly to the existing `SearchProperties` query pipeline — no separate search infrastructure required.

### 4 · GeoJSON Output

All property responses include `location: GeoJsonPoint` per RFC 7946. Coordinates are `[longitude, latitude]` (GeoJSON `[x, y]` ordering). The frontend consumes this directly without coordinate swapping.

### 5 · Nullable `AdvertisedPrice`

AU listings commonly display "Contact Agent". `PropertyListing.AdvertisedPrice` is nullable; `PriceText` always carries a display string.

### 6 · Nullable `DaysOnMarket`

Off-market sales have no listing period. Defaulting to zero would corrupt suburb-level DOM statistics. The field is nullable; AVM and suburb queries filter accordingly.

### 7 · Uniform Auth Error Messages

`LoginCommand` returns `"Invalid email or password"` for both unknown email and wrong password — preventing email enumeration attacks.

### 8 · BCrypt Work Factor 12

~250 ms hash time on modern hardware. `PasswordService.cs` includes a comment citing OWASP guidance to recalibrate every 2 years.

### 9 · "Data Noir" Design System

| Token | Value | Usage |
|---|---|---|
| Background | `#08111F` | Deep navy base |
| Accent 1 | `#E4A53A` | Amber gold — prices, data highlights |
| Accent 2 | `#12C8C0` | Electric teal — interactions, live data |
| Display font | Cormorant | Editorial serif — authority |
| Data font | DM Mono + `tabular-nums` | All prices and metrics |

---

## Running Tests

```bash
dotnet test --logger "console;verbosity=normal"

# Single class
dotnet test --filter "FullyQualifiedName~GeoUtilsTests"
```

Coverage:
- **GeoUtilsTests** — Haversine accuracy against known AU city-pair distances; bounding-box edge cases
- **CreatePropertyCommandTests** — handler happy path + domain validation
- **GetPropertyValuationQueryTests** — AVM confidence tier boundaries; Insufficient Data path
- **SuburbStatisticsQueryTests** — median, growth %, clearance rate; nullable DOM handling

All external dependencies mocked via interfaces — tests run with no database or network.

---

## Docker Operations

```bash
# Full stack
docker compose up -d --build

# Tail API logs
docker compose logs -f api

# Rebuild API only (SQL Server data untouched)
docker compose up -d --build --no-deps api

# Full reset including data
docker compose down -v
```

---

## EF Core Migrations

```bash
# Add a migration
dotnet ef migrations add <MigrationName> \
  --project src/PropIntelligence.Infrastructure \
  --startup-project src/PropIntelligence.API

# Apply
dotnet ef database update \
  --project src/PropIntelligence.Infrastructure \
  --startup-project src/PropIntelligence.API
```

---

## Seeded Data

35 properties across Sydney, Melbourne, Brisbane, Gold Coast, Adelaide, and Perth — all with realistic AU addresses, coordinates, sales history, and active listings. Two properties intentionally have no sales history to exercise the "Insufficient Data" AVM path.

The seeder is idempotent: checks `Properties.Any()` before inserting. Runs automatically on every startup.

---

## Roadmap

- [ ] SQL spatial indexes — swap `double` lat/lon for `geography` + NetTopologySuite
- [ ] Redis caching for suburb statistics (high read, low write)
- [ ] Hangfire background jobs for scheduled AVM pre-computation
- [ ] RS256 + Azure Key Vault for production JWT signing
- [ ] Integration tests — `WebApplicationFactory<Program>` + Testcontainers
- [ ] Token-bucket rate limiting on public search endpoints
