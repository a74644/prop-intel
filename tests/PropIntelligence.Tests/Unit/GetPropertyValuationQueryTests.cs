using PropIntelligence.Application.Interfaces;
using PropIntelligence.Application.Queries.Properties;
using PropIntelligence.Domain.Entities;
using PropIntelligence.Domain.Enums;

namespace PropIntelligence.Tests.Unit;

/// <summary>
/// Tests the AVM (Automated Valuation Model) confidence tiers and
/// the "Insufficient Data" fall-through cases.
/// </summary>
public class GetPropertyValuationQueryTests
{
    private readonly Mock<IPropertyRepository> _propertyRepo = new();
    private readonly GetPropertyValuationQueryHandler _handler;

    public GetPropertyValuationQueryTests()
    {
        _handler = new GetPropertyValuationQueryHandler(_propertyRepo.Object);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// Creates a minimal Property via the public static factory.
    private static Property MakeProperty(
        double lat, double lon,
        int bedrooms = 3,
        decimal? floorAreaSqm = 150m,
        PropertyType type = PropertyType.House)
        => Property.Create("", "1", "Test", "St", "Suburb", AustralianState.NSW,
            "2000", lat, lon, type, bedrooms, 2, 1, 400m, floorAreaSqm, null, null);

    // ── No floor area → Insufficient ─────────────────────────────────────────

    [Fact]
    public async Task Handle_NoFloorArea_ReturnsInsufficientData()
    {
        var subject = MakeProperty(-33.88, 151.21, floorAreaSqm: null);
        _propertyRepo.Setup(r => r.GetByIdAsync(subject.Id, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(subject);

        var result = await _handler.Handle(
            new GetPropertyValuationQuery(subject.Id), CancellationToken.None);

        result.ConfidenceLevel.Should().Be("Insufficient Data");
        result.EstimatedValue.Should().BeNull();
        result.LowEstimate.Should().BeNull();
        result.HighEstimate.Should().BeNull();
    }

    // ── Property not found ─────────────────────────────────────────────────────

    [Fact]
    public async Task Handle_PropertyNotFound_ThrowsKeyNotFoundException()
    {
        _propertyRepo.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
                     .ReturnsAsync((Property?)null);

        var act = () => _handler.Handle(
            new GetPropertyValuationQuery(Guid.NewGuid()), CancellationToken.None);

        await act.Should().ThrowAsync<KeyNotFoundException>();
    }

    // ── No comps at any radius → Insufficient ─────────────────────────────────

    [Fact]
    public async Task Handle_NoComparableSales_ReturnsInsufficientData()
    {
        var subject = MakeProperty(-33.88, 151.21);
        _propertyRepo.Setup(r => r.GetByIdAsync(subject.Id, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(subject);

        // Return only the subject property itself — no comps
        _propertyRepo.Setup(r => r.GetWithinBoundingBoxAsync(
            It.IsAny<double>(), It.IsAny<double>(),
            It.IsAny<double>(), It.IsAny<double>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { subject });

        var result = await _handler.Handle(
            new GetPropertyValuationQuery(subject.Id), CancellationToken.None);

        result.ConfidenceLevel.Should().Be("Insufficient Data");
    }

    // ── Confidence: Low (1-2 comps) ───────────────────────────────────────────

    [Fact]
    public async Task Handle_TwoComps_ConfidenceIsLow()
    {
        var subject = MakeProperty(-33.88, 151.21, bedrooms: 3, floorAreaSqm: 150m);
        var comp1   = MakeProperty(-33.881, 151.211, bedrooms: 3, floorAreaSqm: 140m);
        var comp2   = MakeProperty(-33.882, 151.212, bedrooms: 3, floorAreaSqm: 160m);

        // Add a recent sale to each comp via reflection (private backing field)
        AddSale(comp1, 1_050_000m, DateTime.UtcNow.AddMonths(-3));
        AddSale(comp2, 1_120_000m, DateTime.UtcNow.AddMonths(-5));

        _propertyRepo.Setup(r => r.GetByIdAsync(subject.Id, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(subject);
        _propertyRepo.Setup(r => r.GetWithinBoundingBoxAsync(
            It.IsAny<double>(), It.IsAny<double>(),
            It.IsAny<double>(), It.IsAny<double>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { subject, comp1, comp2 });

        var result = await _handler.Handle(
            new GetPropertyValuationQuery(subject.Id), CancellationToken.None);

        result.ConfidenceLevel.Should().Be("Low");
        result.ComparableCount.Should().Be(2);
    }

    // ── Confidence: Medium (3-4 comps) ────────────────────────────────────────

    [Fact]
    public async Task Handle_ThreeComps_ConfidenceIsMedium()
    {
        var subject = MakeProperty(-33.88, 151.21, bedrooms: 3, floorAreaSqm: 150m);
        var comps   = Enumerable.Range(0, 3)
            .Select(i => MakeProperty(-33.88 - i * 0.001, 151.21 + i * 0.001,
                bedrooms: 3, floorAreaSqm: 145m + i * 5))
            .ToArray();

        foreach (var c in comps)
            AddSale(c, 1_000_000m + comps.ToList().IndexOf(c) * 50_000m, DateTime.UtcNow.AddMonths(-4));

        _propertyRepo.Setup(r => r.GetByIdAsync(subject.Id, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(subject);
        _propertyRepo.Setup(r => r.GetWithinBoundingBoxAsync(
            It.IsAny<double>(), It.IsAny<double>(),
            It.IsAny<double>(), It.IsAny<double>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { subject }.Concat(comps));

        var result = await _handler.Handle(
            new GetPropertyValuationQuery(subject.Id), CancellationToken.None);

        result.ConfidenceLevel.Should().Be("Medium");
        result.ComparableCount.Should().Be(3);
    }

    // ── Confidence Band: ±10% ────────────────────────────────────────────────

    [Fact]
    public async Task Handle_WithComps_LowAndHighEstimateAre10PercentBand()
    {
        var subject = MakeProperty(-33.88, 151.21, bedrooms: 3, floorAreaSqm: 100m);
        var comp    = MakeProperty(-33.881, 151.211, bedrooms: 3, floorAreaSqm: 100m);
        AddSale(comp, 1_000_000m, DateTime.UtcNow.AddMonths(-2));

        _propertyRepo.Setup(r => r.GetByIdAsync(subject.Id, It.IsAny<CancellationToken>()))
                     .ReturnsAsync(subject);
        _propertyRepo.Setup(r => r.GetWithinBoundingBoxAsync(
            It.IsAny<double>(), It.IsAny<double>(),
            It.IsAny<double>(), It.IsAny<double>(),
            It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { subject, comp });

        var result = await _handler.Handle(
            new GetPropertyValuationQuery(subject.Id), CancellationToken.None);

        result.EstimatedValue.Should().NotBeNull();
        var mid  = result.EstimatedValue!.Value;
        var low  = result.LowEstimate!.Value;
        var high = result.HighEstimate!.Value;

        // Low should be ~10% below mid, High ~10% above
        low.Should().BeLessOrEqualTo(mid);
        high.Should().BeGreaterOrEqualTo(mid);
        ((double)(high - low) / (double)mid).Should().BeApproximately(0.20, precision: 0.05);
    }

    // ── Helper: inject sales via reflection (avoids breaking domain encapsulation) ─

    private static void AddSale(Property property, decimal price, DateTime saleDate)
    {
        var sale = SalesHistory.Record(property.Id, price, saleDate, SaleMethod.Auction, "Test Agency", null, null);
        var field = typeof(Property).GetField("_salesHistory",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        var list = (List<SalesHistory>)field.GetValue(property)!;
        list.Add(sale);
    }
}
