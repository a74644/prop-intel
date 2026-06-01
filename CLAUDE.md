# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Commands

```bash
# Build
dotnet build PropIntelligence.sln

# Run all tests
dotnet test

# Run a specific test class
dotnet test --filter "FullyQualifiedName~GeoUtilsTests"

# Run the API (requires Docker SQL Server running)
cd src/PropIntelligence.API && dotnet run

# Start SQL Server only
docker compose up -d sqlserver

# Start full stack (API + SQL Server)
docker compose up -d --build

# Stop everything
docker compose down

# EF Core migrations
dotnet ef migrations add <MigrationName> \
  --project src/PropIntelligence.Infrastructure \
  --startup-project src/PropIntelligence.API

dotnet ef database update \
  --project src/PropIntelligence.Infrastructure \
  --startup-project src/PropIntelligence.API
```

**API runs at:** `http://localhost:5050` (Docker) or `http://localhost:5050` (local)  
**Swagger UI:** `/swagger`

## Configuration

For local development, create `src/PropIntelligence.API/appsettings.Development.json` (gitignored):

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

For Docker, copy `.env.example` to `.env` and fill in values, including `ADMIN_EMAIL` and `ADMIN_PASSWORD`.

## Architecture

**4-layer Clean Architecture** — `API → Application → Domain ← Infrastructure`

```
PropIntelligence.Domain          — Property, SalesHistory, PropertyListing, User entities
                             Enums: AustralianState, PropertyType, ListingStatus, SaleMethod
                             No external dependencies. Static factory + private setters.

PropIntelligence.Application     — CQRS via MediatR. All external contracts as interfaces.
                             Commands: CreateProperty, UpdateProperty, DeleteProperty,
                                       RecordSale, CreateListing, Register, Login
                             Queries:  GetPropertyById, SearchProperties, GetNearbyProperties,
                                       GetPropertyValuation, GetSuburbStatistics, GetSalesHistory
                             Common:   GeoUtils (Haversine distance + bounding box)
                             DTOs:     all request/response shapes

PropIntelligence.Infrastructure  — EF Core 8 + SQL Server implementations
                              Repositories: Property, SalesHistory, Listing, User
                              Auth:         TokenService (JWT HS256), PasswordService (BCrypt)
                              Seed:         DataSeeder (35 AU properties across 6 cities)

PropIntelligence.API             — ASP.NET Core 8 controllers, JWT middleware, Swagger
                              GlobalExceptionMiddleware, rate limiting
```

## Key Design Decisions

**Geospatial — Haversine vs. NetTopologySuite**  
Lat/lon stored as doubles. Haversine in Application layer for distance calculation.
Bounding-box pre-filter uses indexed lat/lon columns before Haversine.
Upgrade path to NetTopologySuite documented in GeoUtils.cs.

**AVM (Automated Valuation Model)**  
Expanding radius (1 → 2 → 5 km), median price-per-sqm of comparable sales
(±1 bedroom, same property type, last 24 months). Confidence: High/Medium/Low/Insufficient.

**JWT — HS256 for demo; RS256 + key vault for production**  
Comment in TokenService.cs documents the upgrade path.

**Nullable AdvertisedPrice**  
Reflects AU "Contact Agent" listings where price is not publicly advertised.

**Nullable DaysOnMarket on SalesHistory**  
Off-market sales have no listing period, so this field is intentionally nullable.

**BCrypt work factor 12**  
Recalibrate every 2 years per OWASP guidance (comment in PasswordService).

## Seeded Data

35 properties across Sydney, Melbourne, Brisbane, Gold Coast, Adelaide, Perth —
all with realistic AU addresses, coordinates, sales history, and listings.
Two properties intentionally have no sales history to test edge cases.

Run `dotnet run` or `docker compose up -d` and the seeder runs on startup automatically
(idempotent — checks `Properties.Any()` before inserting).

## Testing

xUnit + Moq + FluentAssertions. Unit tests live in `tests/PropIntelligence.Tests/Unit/`.
All external dependencies mocked via interfaces.

```bash
dotnet test --logger "console;verbosity=normal"
```
