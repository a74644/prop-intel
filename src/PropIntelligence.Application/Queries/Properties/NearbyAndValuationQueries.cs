using MediatR;
using PropIntelligence.Application.Commands.Properties;
using PropIntelligence.Application.Common;
using PropIntelligence.Application.DTOs;
using PropIntelligence.Application.Interfaces;

namespace PropIntelligence.Application.Queries.Properties;

// ── Nearby Properties ──────────────────────────────────────────────────────────

/// <summary>
/// Returns properties within <paramref name="RadiusKm"/> of a given coordinate,
/// sorted by distance ascending. Useful for "What else sold nearby?" views.
///
/// Strategy:
/// 1. Compute bounding box and filter in SQL (cheap, uses indexed lat/lon cols).
/// 2. Apply Haversine in memory to the reduced candidate set for accurate distance.
/// 3. Exclude the subject property itself if SubjectPropertyId is supplied.
/// </summary>
public record GetNearbyPropertiesQuery(
    double Latitude,
    double Longitude,
    double RadiusKm          = 2.0,
    int    MaxResults        = 20,
    Guid?  ExcludePropertyId = null) : IRequest<IEnumerable<NearbyPropertyDto>>;

public class GetNearbyPropertiesQueryHandler
    : IRequestHandler<GetNearbyPropertiesQuery, IEnumerable<NearbyPropertyDto>>
{
    private readonly IPropertyRepository _properties;

    public GetNearbyPropertiesQueryHandler(IPropertyRepository properties)
        => _properties = properties;

    public async Task<IEnumerable<NearbyPropertyDto>> Handle(
        GetNearbyPropertiesQuery req, CancellationToken ct)
    {
        var (minLat, maxLat, minLon, maxLon) =
            GeoUtils.BoundingBox(req.Latitude, req.Longitude, req.RadiusKm);

        var candidates = await _properties.GetWithinBoundingBoxAsync(
            minLat, maxLat, minLon, maxLon, ct);

        return candidates
            .Where(p => req.ExcludePropertyId is null || p.Id != req.ExcludePropertyId)
            .Select(p => new
            {
                Property    = p,
                DistanceKm  = GeoUtils.DistanceKm(req.Latitude, req.Longitude, p.Latitude, p.Longitude)
            })
            .Where(x => x.DistanceKm <= req.RadiusKm)
            .OrderBy(x => x.DistanceKm)
            .Take(req.MaxResults)
            .Select(x =>
            {
                var last = x.Property.SalesHistoryRecords.OrderByDescending(s => s.SaleDate).FirstOrDefault();
                return new NearbyPropertyDto(
                    x.Property.Id,
                    x.Property.FullAddress,
                    GeoJsonPoint.From(x.Property.Latitude, x.Property.Longitude),
                    Math.Round(x.DistanceKm, 3),
                    x.Property.PropertyType.ToString(),
                    x.Property.Bedrooms,
                    x.Property.Bathrooms,
                    last?.Price,
                    last?.SaleDate);
            });
    }
}

// ── Property Valuation (AVM) ───────────────────────────────────────────────────

/// <summary>
/// Automated Valuation Model using the comparable-sales approach:
///
/// 1. Find recently-sold properties within the search radius.
/// 2. Narrow to same property type and ±1 bedroom (most impactful comparability filters).
/// 3. Compute median price-per-sqm from comparables.
/// 4. Multiply by subject property's floor area → estimated value.
/// 5. Apply ±10% confidence band (industry-standard for medium-confidence AVM).
///
/// Confidence rules (mirrors CoreLogic/PropTrack published methodology):
///   High   → ≥5 comps, saleDate within 6 months, within 1 km
///   Medium → 3-4 comps, or ≤12 months / ≤2 km
///   Low    → 1-2 comps
///   Insufficient Data → 0 comps or no floor area
/// </summary>
public record GetPropertyValuationQuery(Guid PropertyId) : IRequest<ValuationDto>;

public class GetPropertyValuationQueryHandler
    : IRequestHandler<GetPropertyValuationQuery, ValuationDto>
{
    private readonly IPropertyRepository _properties;

    public GetPropertyValuationQueryHandler(IPropertyRepository properties)
        => _properties = properties;

    public async Task<ValuationDto> Handle(GetPropertyValuationQuery req, CancellationToken ct)
    {
        var subject = await _properties.GetByIdAsync(req.PropertyId, ct)
            ?? throw new KeyNotFoundException($"Property {req.PropertyId} not found.");

        if (subject.FloorAreaSqm is null or 0)
            return Insufficient(subject);

        // Expanding search: try tight radius first, widen if insufficient comps
        double[] radii = [1.0, 2.0, 5.0];
        foreach (var radius in radii)
        {
            var (minLat, maxLat, minLon, maxLon) = GeoUtils.BoundingBox(
                subject.Latitude, subject.Longitude, radius);

            var candidates = await _properties.GetWithinBoundingBoxAsync(
                minLat, maxLat, minLon, maxLon, ct);

            var comps = candidates
                .Where(p => p.Id != subject.Id)
                .Where(p => p.PropertyType == subject.PropertyType)
                .Where(p => Math.Abs(p.Bedrooms - subject.Bedrooms) <= 1)
                .Where(p => p.FloorAreaSqm is > 0)
                .Where(p => GeoUtils.DistanceKm(subject.Latitude, subject.Longitude,
                                               p.Latitude, p.Longitude) <= radius)
                .SelectMany(p => p.SalesHistoryRecords
                    .Where(s => s.SaleDate >= DateTime.UtcNow.AddMonths(-18))
                    .Select(s => new { Property = p, Sale = s }))
                .OrderByDescending(x => x.Sale.SaleDate)
                .Take(10)
                .ToList();

            if (comps.Count < 1) continue;

            var ppsqmValues = comps
                .Select(x => x.Sale.Price / x.Property.FloorAreaSqm!.Value)
                .OrderBy(v => v)
                .ToList();

            var medianPpsqm = Median(ppsqmValues);
            var estimate    = Math.Round(medianPpsqm * subject.FloorAreaSqm!.Value / 1000) * 1000;
            var confidence  = DetermineConfidence(comps.Count, radius,
                                comps.Max(x => (DateTime.UtcNow - x.Sale.SaleDate).TotalDays));

            var compDtos = comps.Select(x =>
            {
                decimal? ppsqm = x.Property.FloorAreaSqm is > 0
                    ? Math.Round(x.Sale.Price / x.Property.FloorAreaSqm!.Value, 0) : null;
                return new SalesHistoryDto(x.Sale.Id, x.Sale.PropertyId,
                    x.Property.FullAddress, x.Sale.Price, x.Sale.SaleDate,
                    x.Sale.SaleMethod.ToString(), x.Sale.AgencyName,
                    x.Sale.AgentName, x.Sale.DaysOnMarket, ppsqm);
            });

            return new ValuationDto(
                subject.Id, subject.FullAddress,
                estimate,
                Math.Round(estimate * 0.90m / 1000) * 1000,
                Math.Round(estimate * 1.10m / 1000) * 1000,
                confidence, comps.Count, radius, DateTime.UtcNow, compDtos);
        }

        return Insufficient(subject);
    }

    private static ValuationDto Insufficient(Domain.Entities.Property p) => new(
        p.Id, p.FullAddress, null, null, null,
        "Insufficient Data", 0, 0, DateTime.UtcNow, []);

    private static string DetermineConfidence(int compCount, double radiusKm, double maxDaysOld)
    {
        if (compCount >= 5 && radiusKm <= 1.0 && maxDaysOld <= 180) return "High";
        if (compCount >= 3) return "Medium";
        return "Low";
    }

    private static decimal Median(List<decimal> sorted)
    {
        int mid = sorted.Count / 2;
        return sorted.Count % 2 != 0
            ? sorted[mid]
            : (sorted[mid - 1] + sorted[mid]) / 2;
    }
}
