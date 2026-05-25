using PropIntelligence.Application.DTOs.Common;
using PropIntelligence.Application.Interfaces;
using PropIntelligence.Application.Queries.Suburbs;
using PropIntelligence.Domain.Entities;
using PropIntelligence.Domain.Enums;

namespace PropIntelligence.Tests.Unit;

/// <summary>
/// Tests the suburb statistics aggregation — median price, growth rate,
/// days on market, and the "no data" empty-suburb edge case.
/// </summary>
public class SuburbStatisticsQueryTests
{
    private readonly Mock<IPropertyRepository>     _propertyRepo = new();
    private readonly Mock<ISalesHistoryRepository> _salesRepo    = new();
    private readonly GetSuburbStatisticsQueryHandler _handler;

    public SuburbStatisticsQueryTests()
    {
        _handler = new GetSuburbStatisticsQueryHandler(
            _propertyRepo.Object, _salesRepo.Object);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static Property MakeProperty(
        string suburb = "Surry Hills",
        AustralianState state = AustralianState.NSW,
        PropertyType type = PropertyType.House,
        int bedrooms = 3,
        decimal? floorAreaSqm = 150m)
        => Property.Create("", "1", "Test", "St", suburb, state,
            "2010", -33.88, 151.21, type, bedrooms, 2, 1, 300m, floorAreaSqm, null, null);

    private static void AddSale(Property property, decimal price, DateTime date,
        SaleMethod method = SaleMethod.PrivateTreaty, int? daysOnMarket = 30)
    {
        var sale = SalesHistory.Record(property.Id, price, date, method, "Test Agency", null, daysOnMarket);
        var field = typeof(Property).GetField("_salesHistory",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        ((List<SalesHistory>)field.GetValue(property)!).Add(sale);
    }

    private void SetupSearch(IEnumerable<Property> properties, string suburb, AustralianState state)
    {
        _propertyRepo
            .Setup(r => r.SearchAsync(
                suburb, state, null, null, null, null, null, null, 1, 500,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((properties, properties.Count()));
    }

    // ── Empty suburb ──────────────────────────────────────────────────────────

    [Fact]
    public async Task Handle_NoPropertiesInSuburb_ReturnsNullMedians()
    {
        SetupSearch([], "Nowhere", AustralianState.NT);

        var result = await _handler.Handle(
            new GetSuburbStatisticsQuery("Nowhere", AustralianState.NT),
            CancellationToken.None);

        result.Should().NotBeNull();
        result.MedianSalePrice12Months.Should().BeNull();
        result.MedianSalePrice24Months.Should().BeNull();
        result.AnnualGrowthPct.Should().BeNull();
        result.SalesCount12Months.Should().Be(0);
    }

    // ── Median price calculation ───────────────────────────────────────────────

    [Fact]
    public async Task Handle_ThreeSalesInPastYear_ReturnsCorrectMedianPrice()
    {
        var p1 = MakeProperty(); AddSale(p1, 900_000m,  DateTime.UtcNow.AddMonths(-2));
        var p2 = MakeProperty(); AddSale(p2, 1_000_000m, DateTime.UtcNow.AddMonths(-4));
        var p3 = MakeProperty(); AddSale(p3, 1_100_000m, DateTime.UtcNow.AddMonths(-6));

        SetupSearch(new[] { p1, p2, p3 }, "Surry Hills", AustralianState.NSW);

        var result = await _handler.Handle(
            new GetSuburbStatisticsQuery("Surry Hills", AustralianState.NSW),
            CancellationToken.None);

        // Sorted: 900k, 1m, 1.1m → median = 1m
        result.MedianSalePrice12Months.Should().Be(1_000_000m);
    }

    [Fact]
    public async Task Handle_EvenNumberOfSales_MedianIsAverageOfMiddleTwo()
    {
        var p1 = MakeProperty(); AddSale(p1, 800_000m,  DateTime.UtcNow.AddMonths(-1));
        var p2 = MakeProperty(); AddSale(p2, 1_000_000m, DateTime.UtcNow.AddMonths(-2));
        var p3 = MakeProperty(); AddSale(p3, 1_200_000m, DateTime.UtcNow.AddMonths(-3));
        var p4 = MakeProperty(); AddSale(p4, 1_400_000m, DateTime.UtcNow.AddMonths(-4));

        SetupSearch(new[] { p1, p2, p3, p4 }, "Surry Hills", AustralianState.NSW);

        var result = await _handler.Handle(
            new GetSuburbStatisticsQuery("Surry Hills", AustralianState.NSW),
            CancellationToken.None);

        // Sorted: 800k, 1m, 1.2m, 1.4m → (1m + 1.2m) / 2 = 1.1m
        result.MedianSalePrice12Months.Should().Be(1_100_000m);
    }

    // ── Sales outside the 12-month window are excluded ────────────────────────

    [Fact]
    public async Task Handle_OldSalesExcludedFrom12MonthMedian()
    {
        var p1 = MakeProperty(); AddSale(p1, 500_000m, DateTime.UtcNow.AddMonths(-2));   // in window
        var p2 = MakeProperty(); AddSale(p2, 2_000_000m, DateTime.UtcNow.AddMonths(-14)); // outside 12m

        SetupSearch(new[] { p1, p2 }, "Surry Hills", AustralianState.NSW);

        var result = await _handler.Handle(
            new GetSuburbStatisticsQuery("Surry Hills", AustralianState.NSW),
            CancellationToken.None);

        // Only the recent sale should count for 12m median
        result.MedianSalePrice12Months.Should().Be(500_000m);
    }

    // ── Auction clearance rate ────────────────────────────────────────────────

    [Fact]
    public async Task Handle_MixedSaleMethods_ClearanceRateIsCorrect()
    {
        var p1 = MakeProperty(); AddSale(p1, 1_000_000m, DateTime.UtcNow.AddMonths(-1), SaleMethod.Auction);
        var p2 = MakeProperty(); AddSale(p2, 900_000m,   DateTime.UtcNow.AddMonths(-2), SaleMethod.Auction);
        var p3 = MakeProperty(); AddSale(p3, 800_000m,   DateTime.UtcNow.AddMonths(-3), SaleMethod.PrivateTreaty);
        var p4 = MakeProperty(); AddSale(p4, 850_000m,   DateTime.UtcNow.AddMonths(-4), SaleMethod.PrivateTreaty);

        SetupSearch(new[] { p1, p2, p3, p4 }, "Surry Hills", AustralianState.NSW);

        var result = await _handler.Handle(
            new GetSuburbStatisticsQuery("Surry Hills", AustralianState.NSW),
            CancellationToken.None);

        // 2 auctions out of 4 total → 50%
        result.AuctionClearanceRate12Months.Should().BeApproximately(50.0, precision: 0.1);
    }

    // ── Days on market ────────────────────────────────────────────────────────

    [Fact]
    public async Task Handle_DaysOnMarket_MedianIsCorrect()
    {
        var p1 = MakeProperty(); AddSale(p1, 1_000_000m, DateTime.UtcNow.AddMonths(-1), daysOnMarket: 10);
        var p2 = MakeProperty(); AddSale(p2, 1_000_000m, DateTime.UtcNow.AddMonths(-2), daysOnMarket: 20);
        var p3 = MakeProperty(); AddSale(p3, 1_000_000m, DateTime.UtcNow.AddMonths(-3), daysOnMarket: 30);

        SetupSearch(new[] { p1, p2, p3 }, "Surry Hills", AustralianState.NSW);

        var result = await _handler.Handle(
            new GetSuburbStatisticsQuery("Surry Hills", AustralianState.NSW),
            CancellationToken.None);

        result.MedianDaysOnMarket.Should().BeApproximately(20.0, precision: 0.1);
    }

    // ── Off-market sales with null DaysOnMarket are handled ───────────────────

    [Fact]
    public async Task Handle_NullDaysOnMarket_ExcludedFromDomCalculation()
    {
        var p1 = MakeProperty(); AddSale(p1, 1_000_000m, DateTime.UtcNow.AddMonths(-1), daysOnMarket: null);
        var p2 = MakeProperty(); AddSale(p2, 1_000_000m, DateTime.UtcNow.AddMonths(-2), daysOnMarket: 40);

        SetupSearch(new[] { p1, p2 }, "Surry Hills", AustralianState.NSW);

        var result = await _handler.Handle(
            new GetSuburbStatisticsQuery("Surry Hills", AustralianState.NSW),
            CancellationToken.None);

        // Only p2 has a DOM value — median of one = 40
        result.MedianDaysOnMarket.Should().BeApproximately(40.0, precision: 0.1);
    }
}
