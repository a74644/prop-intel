using MediatR;
using PropIntelligence.Application.Commands.Properties;
using PropIntelligence.Application.DTOs;
using PropIntelligence.Application.DTOs.Common;
using PropIntelligence.Application.Interfaces;
using PropIntelligence.Domain.Enums;

namespace PropIntelligence.Application.Queries.Suburbs
{

/// <summary>
/// Aggregated market statistics for a suburb — the kind of data exposed by
/// CoreLogic / PropTrack / Domain Insights in the Australian market.
///
/// All calculations use the Properties + SalesHistory tables seeded with
/// representative dummy data. In production this would source from a live
/// RP Data / PriceFinder data feed.
/// </summary>
public record GetSuburbStatisticsQuery(
    string          Suburb,
    AustralianState State) : IRequest<SuburbStatisticsDto>;

public class GetSuburbStatisticsQueryHandler
    : IRequestHandler<GetSuburbStatisticsQuery, SuburbStatisticsDto>
{
    private readonly IPropertyRepository     _properties;
    private readonly ISalesHistoryRepository _sales;

    public GetSuburbStatisticsQueryHandler(
        IPropertyRepository properties,
        ISalesHistoryRepository sales)
    {
        _properties = properties;
        _sales      = sales;
    }

    public async Task<SuburbStatisticsDto> Handle(
        GetSuburbStatisticsQuery req, CancellationToken ct)
    {
        var (items, _) = await _properties.SearchAsync(
            suburb: req.Suburb, state: req.State,
            postcode: null, propertyType: null,
            minBedrooms: null, maxBedrooms: null,
            minPrice: null, maxPrice: null,
            page: 1, pageSize: 500, ct);

        var allProperties = items.ToList();

        var now        = DateTime.UtcNow;
        var cutoff12   = now.AddMonths(-12);
        var cutoff24   = now.AddMonths(-24);

        var sales12 = allProperties
            .SelectMany(p => p.SalesHistoryRecords
                .Where(s => s.SaleDate >= cutoff12)
                .Select(s => new { Property = p, Sale = s }))
            .ToList();

        var sales24 = allProperties
            .SelectMany(p => p.SalesHistoryRecords
                .Where(s => s.SaleDate >= cutoff24)
                .Select(s => new { Property = p, Sale = s }))
            .ToList();

        var prices12 = sales12.Select(x => x.Sale.Price).OrderBy(p => p).ToList();
        var prices24 = sales24.Select(x => x.Sale.Price).OrderBy(p => p).ToList();

        decimal? median12 = prices12.Count > 0 ? Median(prices12) : null;
        decimal? median24 = prices24.Count > 0 ? Median(prices24) : null;

        double? growthPct = null;
        if (median12 is not null && median24 is not null && median24 > 0)
        {
            // Annualised from 12-month rolling windows
            growthPct = Math.Round((double)((median12 - median24) / median24 * 100), 1);
        }

        var domValues = sales12
            .Where(x => x.Sale.DaysOnMarket.HasValue)
            .Select(x => (double)x.Sale.DaysOnMarket!.Value)
            .OrderBy(v => v).ToList();
        double? medianDom = domValues.Count > 0 ? MedianDouble(domValues) : null;

        var ppsqmValues = sales12
            .Where(x => x.Property.FloorAreaSqm is > 0)
            .Select(x => x.Sale.Price / x.Property.FloorAreaSqm!.Value)
            .OrderBy(v => v).ToList();
        decimal? medianPpsqm = ppsqmValues.Count > 0 ? Median(ppsqmValues) : null;

        var auctionSales = sales12.Where(x => x.Sale.SaleMethod == SaleMethod.Auction).Count();
        double? clearanceRate = sales12.Count > 0
            ? Math.Round((double)auctionSales / sales12.Count * 100, 1) : null;

        // Median by property type
        var byType = sales12
            .GroupBy(x => x.Property.PropertyType.ToString())
            .ToDictionary(
                g => g.Key,
                g => (decimal?)Median(g.Select(x => x.Sale.Price).OrderBy(p => p).ToList()));

        var postcode = allProperties.FirstOrDefault()?.Postcode ?? string.Empty;

        return new SuburbStatisticsDto(
            req.Suburb, req.State.ToString(), postcode,
            sales12.Count, median12, median24,
            growthPct, medianDom, medianPpsqm,
            clearanceRate, byType);
    }

    private static decimal Median(List<decimal> sorted)
    {
        int mid = sorted.Count / 2;
        return sorted.Count % 2 != 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }

    private static double MedianDouble(List<double> sorted)
    {
        int mid = sorted.Count / 2;
        return sorted.Count % 2 != 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    }
}

} // namespace PropIntelligence.Application.Queries.Suburbs

// ── Sales History Query ───────────────────────────────────────────────────────

namespace PropIntelligence.Application.Queries.Sales
{

public record GetSalesHistoryQuery(
    Guid?            PropertyId,
    string?          Suburb,
    AustralianState? State,
    DateTime?        FromDate,
    DateTime?        ToDate,
    int              Page     = 1,
    int              PageSize = 20) : IRequest<PagedResult<SalesHistoryDto>>;

public class GetSalesHistoryQueryHandler
    : IRequestHandler<GetSalesHistoryQuery, PagedResult<SalesHistoryDto>>
{
    private readonly ISalesHistoryRepository _sales;
    private readonly IPropertyRepository     _properties;

    public GetSalesHistoryQueryHandler(
        ISalesHistoryRepository sales,
        IPropertyRepository properties)
    {
        _sales      = sales;
        _properties = properties;
    }

    public async Task<PagedResult<SalesHistoryDto>> Handle(
        GetSalesHistoryQuery req, CancellationToken ct)
    {
        if (req.PropertyId.HasValue)
        {
            var propSales = await _sales.GetByPropertyIdAsync(req.PropertyId.Value, ct);
            var property  = await _properties.GetByIdAsync(req.PropertyId.Value, ct);
            var list = propSales.OrderByDescending(s => s.SaleDate).ToList();
            return new PagedResult<SalesHistoryDto>(
                list.Select(s =>
                {
                    decimal? ppsqm = property?.FloorAreaSqm is > 0
                        ? Math.Round(s.Price / property.FloorAreaSqm!.Value, 0) : null;
                    return PropertyMapper.ToSale(s) with { PricePerSqm = ppsqm };
                }),
                list.Count, 1, list.Count);
        }

        if (!string.IsNullOrWhiteSpace(req.Suburb))
        {
            var (items, total) = await _sales.GetBySuburbAsync(
                req.Suburb!, req.State, req.FromDate, req.ToDate,
                req.Page, req.PageSize, ct);
            return new PagedResult<SalesHistoryDto>(
                items.Select(s => PropertyMapper.ToSale(s)),
                total, req.Page, req.PageSize);
        }

        return new PagedResult<SalesHistoryDto>([], 0, req.Page, req.PageSize);
    }
}

}
