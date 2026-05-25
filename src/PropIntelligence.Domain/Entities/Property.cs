using PropIntelligence.Domain.Enums;

namespace PropIntelligence.Domain.Entities;

/// <summary>
/// Represents a physical Australian real estate property.
///
/// Design notes:
/// - Latitude/Longitude stored as double (WGS84). Avoids a NetTopologySuite
///   dependency for demo portability; haversine distance computed in the
///   application layer. A production system would swap to geometry columns
///   and SQL Server spatial indexes for sub-millisecond radius queries.
/// - FullAddress is a denormalised convenience column — avoids runtime
///   string concatenation in every LINQ projection.
/// - PricePerSqm is intentionally NOT stored; computed at query time from
///   the most recent sale + FloorAreaSqm to ensure it's always current.
/// </summary>
public class Property
{
    public Guid Id              { get; private set; }
    public string UnitNumber    { get; private set; } = string.Empty;
    public string StreetNumber  { get; private set; } = string.Empty;
    public string StreetName    { get; private set; } = string.Empty;
    public string StreetType    { get; private set; } = string.Empty;   // St, Rd, Ave, etc.
    public string FullAddress   { get; private set; } = string.Empty;   // Denormalised
    public string Suburb        { get; private set; } = string.Empty;
    public AustralianState State { get; private set; }
    public string Postcode      { get; private set; } = string.Empty;
    public double Latitude      { get; private set; }
    public double Longitude     { get; private set; }
    public PropertyType PropertyType { get; private set; }
    public int Bedrooms         { get; private set; }
    public int Bathrooms        { get; private set; }
    public int CarSpaces        { get; private set; }
    public decimal? LandAreaSqm  { get; private set; }
    public decimal? FloorAreaSqm { get; private set; }
    public string? LotNumber    { get; private set; }
    public string? PlanNumber   { get; private set; }
    public DateTime CreatedAt   { get; private set; }
    public DateTime UpdatedAt   { get; private set; }

    // ── Navigation ───────────────────────────────────────────────────────────
    private readonly List<SalesHistory> _salesHistory = new();
    public IReadOnlyCollection<SalesHistory> SalesHistoryRecords => _salesHistory.AsReadOnly();

    private readonly List<PropertyListing> _listings = new();
    public IReadOnlyCollection<PropertyListing> Listings => _listings.AsReadOnly();

    private Property() { } // EF Core

    public static Property Create(
        string unitNumber,
        string streetNumber,
        string streetName,
        string streetType,
        string suburb,
        AustralianState state,
        string postcode,
        double latitude,
        double longitude,
        PropertyType propertyType,
        int bedrooms,
        int bathrooms,
        int carSpaces,
        decimal? landAreaSqm,
        decimal? floorAreaSqm,
        string? lotNumber,
        string? planNumber)
    {
        if (string.IsNullOrWhiteSpace(streetNumber)) throw new ArgumentException("Street number is required.", nameof(streetNumber));
        if (string.IsNullOrWhiteSpace(streetName))   throw new ArgumentException("Street name is required.",   nameof(streetName));
        if (string.IsNullOrWhiteSpace(suburb))        throw new ArgumentException("Suburb is required.",         nameof(suburb));
        if (string.IsNullOrWhiteSpace(postcode) || postcode.Length != 4)
            throw new ArgumentException("AU postcode must be exactly 4 digits.", nameof(postcode));
        if (bedrooms  < 0) throw new ArgumentOutOfRangeException(nameof(bedrooms));
        if (bathrooms < 0) throw new ArgumentOutOfRangeException(nameof(bathrooms));

        var unitPrefix = string.IsNullOrWhiteSpace(unitNumber) ? "" : $"{unitNumber}/";
        var fullAddress = $"{unitPrefix}{streetNumber} {streetName} {streetType}, {suburb} {state} {postcode}".Trim();

        return new Property
        {
            Id           = Guid.NewGuid(),
            UnitNumber   = unitNumber,
            StreetNumber = streetNumber,
            StreetName   = streetName,
            StreetType   = streetType,
            FullAddress  = fullAddress,
            Suburb       = suburb,
            State        = state,
            Postcode     = postcode,
            Latitude     = latitude,
            Longitude    = longitude,
            PropertyType = propertyType,
            Bedrooms     = bedrooms,
            Bathrooms    = bathrooms,
            CarSpaces    = carSpaces,
            LandAreaSqm  = landAreaSqm,
            FloorAreaSqm = floorAreaSqm,
            LotNumber    = lotNumber,
            PlanNumber   = planNumber,
            CreatedAt    = DateTime.UtcNow,
            UpdatedAt    = DateTime.UtcNow
        };
    }

    public void Update(
        PropertyType propertyType,
        int bedrooms,
        int bathrooms,
        int carSpaces,
        decimal? landAreaSqm,
        decimal? floorAreaSqm)
    {
        PropertyType = propertyType;
        Bedrooms     = bedrooms;
        Bathrooms    = bathrooms;
        CarSpaces    = carSpaces;
        LandAreaSqm  = landAreaSqm;
        FloorAreaSqm = floorAreaSqm;
        UpdatedAt    = DateTime.UtcNow;
    }

    /// <summary>
    /// Returns price per sqm based on the most recent sale and floor area.
    /// Returns null if either is unknown — do not default to land area here;
    /// mixing floor/land sqm baselines produces misleading comparisons.
    /// </summary>
    public decimal? LatestPricePerSqm()
    {
        var latestSale = _salesHistory
            .OrderByDescending(s => s.SaleDate)
            .FirstOrDefault();

        if (latestSale is null || FloorAreaSqm is null or 0) return null;
        return Math.Round(latestSale.Price / FloorAreaSqm.Value, 0);
    }
}
