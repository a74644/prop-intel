using PropIntelligence.Domain.Enums;

namespace PropIntelligence.Application.DTOs;

// ── GeoJSON ───────────────────────────────────────────────────────────────────

/// <summary>
/// GeoJSON Point geometry per RFC 7946.
/// Coordinates are [longitude, latitude] — this is NOT a mistake; GeoJSON
/// always uses [x, y] = [lon, lat]. Consumer UIs need to be aware of this.
/// </summary>
public record GeoJsonPoint(string Type, double[] Coordinates)
{
    public static GeoJsonPoint From(double latitude, double longitude)
        => new("Point", [longitude, latitude]);
}

// ── Property ──────────────────────────────────────────────────────────────────

public record PropertySummaryDto(
    Guid        Id,
    string      FullAddress,
    string      Suburb,
    string      State,
    string      Postcode,
    GeoJsonPoint Location,
    string      PropertyType,
    int         Bedrooms,
    int         Bathrooms,
    int         CarSpaces,
    decimal?    LandAreaSqm,
    decimal?    FloorAreaSqm,
    decimal?    LastSalePrice,
    DateTime?   LastSaleDate,
    decimal?    PricePerSqm);

public record PropertyDetailDto(
    Guid        Id,
    string      UnitNumber,
    string      StreetNumber,
    string      StreetName,
    string      StreetType,
    string      FullAddress,
    string      Suburb,
    string      State,
    string      Postcode,
    GeoJsonPoint Location,
    string      PropertyType,
    int         Bedrooms,
    int         Bathrooms,
    int         CarSpaces,
    decimal?    LandAreaSqm,
    decimal?    FloorAreaSqm,
    string?     LotNumber,
    string?     PlanNumber,
    DateTime    CreatedAt,
    IEnumerable<SalesHistoryDto> SalesHistory,
    IEnumerable<ListingDto>      ActiveListings);

// ── Auth ──────────────────────────────────────────────────────────────────────

public record RegisterRequest(
    string Email,
    string Password,
    string FirstName,
    string LastName);

public record LoginRequest(
    string Email,
    string Password);

public record AuthResultDto(
    string Token,
    DateTime ExpiresAt,
    string Email,
    string FullName,
    string Role);

// ── Sales History ─────────────────────────────────────────────────────────────

public record SalesHistoryDto(
    Guid        Id,
    Guid        PropertyId,
    string      FullAddress,
    decimal     Price,
    DateTime    SaleDate,
    string      SaleMethod,
    string      AgencyName,
    string?     AgentName,
    int?        DaysOnMarket,
    decimal?    PricePerSqm);

// ── Listings ──────────────────────────────────────────────────────────────────

public record ListingDto(
    Guid        Id,
    Guid        PropertyId,
    string      FullAddress,
    string      ListingType,
    decimal?    AdvertisedPrice,
    string      PriceText,
    string      Status,
    string      AgencyName,
    string      AgentName,
    string      Description,
    DateTime    ListedAt,
    int?        DaysOnMarket);

public record CreateListingRequest(
    Guid        PropertyId,
    string      ListingType,
    decimal?    AdvertisedPrice,
    string      PriceText,
    string      AgencyName,
    string      AgentName,
    string      Description);

// ── Suburb Statistics ─────────────────────────────────────────────────────────

/// <summary>
/// Aggregated market statistics for a suburb over a rolling window.
/// Mirrors the kind of data exposed by CoreLogic / PropTrack in AU.
/// </summary>
public record SuburbStatisticsDto(
    string      Suburb,
    string      State,
    string      Postcode,
    int         SalesCount12Months,
    decimal?    MedianSalePrice12Months,
    decimal?    MedianSalePrice24Months,
    double?     AnnualGrowthPct,
    double?     MedianDaysOnMarket,
    decimal?    MedianPricePerSqm,
    /// <summary>
    /// Auction clearance rate across all sales with a known SaleMethod in the past 12 months.
    /// Only meaningful for Sydney/Melbourne where auctions are common.
    /// </summary>
    double?     AuctionClearanceRate12Months,
    Dictionary<string, decimal?> MedianByPropertyType);

// ── Valuation ─────────────────────────────────────────────────────────────────

/// <summary>
/// Automated Valuation Model (AVM) result.
/// Based on the comparable-sales (comps) approach: median price-per-sqm of
/// nearby recently-sold properties, applied to the subject property's floor area.
///
/// Confidence tiers (standard industry thresholds):
///   High   → ≥5 comps within 6 months, ≤1 km
///   Medium → 3-4 comps, or ≤2 km / ≤12 months
///   Low    → &lt;3 comps; treat as indicative only
/// </summary>
public record ValuationDto(
    Guid        PropertyId,
    string      FullAddress,
    decimal?    EstimatedValue,
    decimal?    LowEstimate,
    decimal?    HighEstimate,
    string      ConfidenceLevel,   // "High" | "Medium" | "Low" | "Insufficient Data"
    int         ComparableCount,
    double      SearchRadiusKm,
    DateTime    ValuationDate,
    IEnumerable<SalesHistoryDto> Comparables);

// ── Nearby Properties ─────────────────────────────────────────────────────────

public record NearbyPropertyDto(
    Guid        Id,
    string      FullAddress,
    GeoJsonPoint Location,
    double      DistanceKm,
    string      PropertyType,
    int         Bedrooms,
    int         Bathrooms,
    decimal?    LastSalePrice,
    DateTime?   LastSaleDate);

// ── Record Sale ───────────────────────────────────────────────────────────────

public record RecordSaleRequest(
    Guid        PropertyId,
    decimal     Price,
    DateTime    SaleDate,
    string      SaleMethod,
    string      AgencyName,
    string?     AgentName,
    int?        DaysOnMarket);
