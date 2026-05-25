using MediatR;
using Microsoft.Extensions.Logging;
using PropIntelligence.Application.Commands.Properties;
using PropIntelligence.Application.DTOs;
using PropIntelligence.Application.Interfaces;
using PropIntelligence.Domain.Entities;
using PropIntelligence.Domain.Enums;

namespace PropIntelligence.Application.Commands.Sales
{

public record RecordSaleCommand(
    Guid        PropertyId,
    decimal     Price,
    DateTime    SaleDate,
    SaleMethod  SaleMethod,
    string      AgencyName,
    string?     AgentName,
    int?        DaysOnMarket) : IRequest<SalesHistoryDto>;

public class RecordSaleCommandHandler : IRequestHandler<RecordSaleCommand, SalesHistoryDto>
{
    private readonly IPropertyRepository     _properties;
    private readonly ISalesHistoryRepository _sales;
    private readonly IUnitOfWork             _uow;
    private readonly ILogger<RecordSaleCommandHandler> _logger;

    public RecordSaleCommandHandler(
        IPropertyRepository properties,
        ISalesHistoryRepository sales,
        IUnitOfWork uow,
        ILogger<RecordSaleCommandHandler> logger)
    {
        _properties = properties;
        _sales      = sales;
        _uow        = uow;
        _logger     = logger;
    }

    public async Task<SalesHistoryDto> Handle(RecordSaleCommand req, CancellationToken ct)
    {
        var property = await _properties.GetByIdAsync(req.PropertyId, ct)
            ?? throw new KeyNotFoundException($"Property {req.PropertyId} not found.");

        var sale = SalesHistory.Record(req.PropertyId, req.Price, req.SaleDate,
                       req.SaleMethod, req.AgencyName, req.AgentName, req.DaysOnMarket);

        await _sales.AddAsync(sale, ct);
        await _uow.SaveChangesAsync(ct);

        _logger.LogInformation("Sale recorded: {Address} — ${Price:N0} on {Date:d}",
            property.FullAddress, req.Price, req.SaleDate);

        decimal? ppsqm = property.FloorAreaSqm is > 0
            ? Math.Round(req.Price / property.FloorAreaSqm!.Value, 0) : null;

        return new SalesHistoryDto(sale.Id, sale.PropertyId, property.FullAddress,
            sale.Price, sale.SaleDate, sale.SaleMethod.ToString(),
            sale.AgencyName, sale.AgentName, sale.DaysOnMarket, ppsqm);
    }
}

} // namespace PropIntelligence.Application.Commands.Sales

// ── Create Listing ─────────────────────────────────────────────────────────────

namespace PropIntelligence.Application.Commands.Listings
{

public record CreateListingCommand(
    Guid        PropertyId,
    ListingType ListingType,
    decimal?    AdvertisedPrice,
    string      PriceText,
    string      AgencyName,
    string      AgentName,
    string      Description) : IRequest<ListingDto>;

public class CreateListingCommandHandler : IRequestHandler<CreateListingCommand, ListingDto>
{
    private readonly IPropertyRepository _properties;
    private readonly IListingRepository  _listings;
    private readonly IUnitOfWork         _uow;

    public CreateListingCommandHandler(
        IPropertyRepository properties,
        IListingRepository listings,
        IUnitOfWork uow)
    {
        _properties = properties;
        _listings   = listings;
        _uow        = uow;
    }

    public async Task<ListingDto> Handle(CreateListingCommand req, CancellationToken ct)
    {
        var property = await _properties.GetByIdAsync(req.PropertyId, ct)
            ?? throw new KeyNotFoundException($"Property {req.PropertyId} not found.");

        var listing = PropertyListing.Create(req.PropertyId, req.ListingType,
            req.AdvertisedPrice, req.PriceText,
            req.AgencyName, req.AgentName, req.Description, DateTime.UtcNow);

        await _listings.AddAsync(listing, ct);
        await _uow.SaveChangesAsync(ct);

        return PropertyMapper.ToListing(listing) with { FullAddress = property.FullAddress };
    }
}

}
