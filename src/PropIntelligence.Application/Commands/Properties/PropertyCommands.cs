using MediatR;
using Microsoft.Extensions.Logging;
using PropIntelligence.Application.DTOs;
using PropIntelligence.Application.Interfaces;
using PropIntelligence.Domain.Entities;
using PropIntelligence.Domain.Enums;

namespace PropIntelligence.Application.Commands.Properties;

// ── Create ────────────────────────────────────────────────────────────────────

public record CreatePropertyCommand(
    string         UnitNumber,
    string         StreetNumber,
    string         StreetName,
    string         StreetType,
    string         Suburb,
    AustralianState State,
    string         Postcode,
    double         Latitude,
    double         Longitude,
    PropertyType   PropertyType,
    int            Bedrooms,
    int            Bathrooms,
    int            CarSpaces,
    decimal?       LandAreaSqm,
    decimal?       FloorAreaSqm,
    string?        LotNumber,
    string?        PlanNumber) : IRequest<PropertyDetailDto>;

public class CreatePropertyCommandHandler : IRequestHandler<CreatePropertyCommand, PropertyDetailDto>
{
    private readonly IPropertyRepository _properties;
    private readonly IUnitOfWork         _uow;
    private readonly ILogger<CreatePropertyCommandHandler> _logger;

    public CreatePropertyCommandHandler(
        IPropertyRepository properties,
        IUnitOfWork uow,
        ILogger<CreatePropertyCommandHandler> logger)
    {
        _properties = properties;
        _uow        = uow;
        _logger     = logger;
    }

    public async Task<PropertyDetailDto> Handle(CreatePropertyCommand req, CancellationToken ct)
    {
        var property = Property.Create(
            req.UnitNumber, req.StreetNumber, req.StreetName, req.StreetType,
            req.Suburb, req.State, req.Postcode,
            req.Latitude, req.Longitude,
            req.PropertyType, req.Bedrooms, req.Bathrooms, req.CarSpaces,
            req.LandAreaSqm, req.FloorAreaSqm, req.LotNumber, req.PlanNumber);

        await _properties.AddAsync(property, ct);
        await _uow.SaveChangesAsync(ct);

        _logger.LogInformation("Created property {Id}: {Address}", property.Id, property.FullAddress);
        return PropertyMapper.ToDetail(property);
    }
}

// ── Update ────────────────────────────────────────────────────────────────────

public record UpdatePropertyCommand(
    Guid         Id,
    PropertyType PropertyType,
    int          Bedrooms,
    int          Bathrooms,
    int          CarSpaces,
    decimal?     LandAreaSqm,
    decimal?     FloorAreaSqm) : IRequest<PropertyDetailDto>;

public class UpdatePropertyCommandHandler : IRequestHandler<UpdatePropertyCommand, PropertyDetailDto>
{
    private readonly IPropertyRepository _properties;
    private readonly IUnitOfWork         _uow;

    public UpdatePropertyCommandHandler(IPropertyRepository properties, IUnitOfWork uow)
    {
        _properties = properties;
        _uow        = uow;
    }

    public async Task<PropertyDetailDto> Handle(UpdatePropertyCommand req, CancellationToken ct)
    {
        var property = await _properties.GetByIdAsync(req.Id, ct)
            ?? throw new KeyNotFoundException($"Property {req.Id} not found.");

        property.Update(req.PropertyType, req.Bedrooms, req.Bathrooms,
                        req.CarSpaces, req.LandAreaSqm, req.FloorAreaSqm);

        await _uow.SaveChangesAsync(ct);
        return PropertyMapper.ToDetail(property);
    }
}

// ── Delete ────────────────────────────────────────────────────────────────────

public record DeletePropertyCommand(Guid Id) : IRequest;

public class DeletePropertyCommandHandler : IRequestHandler<DeletePropertyCommand>
{
    private readonly IPropertyRepository _properties;
    private readonly IUnitOfWork         _uow;
    private readonly ILogger<DeletePropertyCommandHandler> _logger;

    public DeletePropertyCommandHandler(
        IPropertyRepository properties,
        IUnitOfWork uow,
        ILogger<DeletePropertyCommandHandler> logger)
    {
        _properties = properties;
        _uow        = uow;
        _logger     = logger;
    }

    public async Task Handle(DeletePropertyCommand req, CancellationToken ct)
    {
        var property = await _properties.GetByIdAsync(req.Id, ct)
            ?? throw new KeyNotFoundException($"Property {req.Id} not found.");

        await _properties.DeleteAsync(req.Id, ct);
        await _uow.SaveChangesAsync(ct);
        _logger.LogInformation("Deleted property {Id}: {Address}", property.Id, property.FullAddress);
    }
}

// ── Shared mapper (keeps handlers thin) ──────────────────────────────────────

internal static class PropertyMapper
{
    internal static PropertyDetailDto ToDetail(Property p) => new(
        p.Id, p.UnitNumber, p.StreetNumber, p.StreetName, p.StreetType,
        p.FullAddress, p.Suburb, p.State.ToString(), p.Postcode,
        GeoJsonPoint.From(p.Latitude, p.Longitude),
        p.PropertyType.ToString(),
        p.Bedrooms, p.Bathrooms, p.CarSpaces,
        p.LandAreaSqm, p.FloorAreaSqm, p.LotNumber, p.PlanNumber, p.CreatedAt,
        p.SalesHistoryRecords.OrderByDescending(s => s.SaleDate).Select(ToSale),
        p.Listings.Where(l => l.Status == Domain.Enums.ListingStatus.Active).Select(ToListing));

    internal static PropertySummaryDto ToSummary(Property p)
    {
        var lastSale = p.SalesHistoryRecords.OrderByDescending(s => s.SaleDate).FirstOrDefault();
        decimal? ppsqm = (lastSale is not null && p.FloorAreaSqm is > 0)
            ? Math.Round(lastSale.Price / p.FloorAreaSqm!.Value, 0) : null;
        return new(p.Id, p.FullAddress, p.Suburb, p.State.ToString(), p.Postcode,
            GeoJsonPoint.From(p.Latitude, p.Longitude),
            p.PropertyType.ToString(), p.Bedrooms, p.Bathrooms, p.CarSpaces,
            p.LandAreaSqm, p.FloorAreaSqm,
            lastSale?.Price, lastSale?.SaleDate, ppsqm);
    }

    internal static SalesHistoryDto ToSale(SalesHistory s) => new(
        s.Id, s.PropertyId,
        s.Property?.FullAddress ?? string.Empty,
        s.Price, s.SaleDate, s.SaleMethod.ToString(),
        s.AgencyName, s.AgentName, s.DaysOnMarket, null);

    internal static ListingDto ToListing(PropertyListing l) => new(
        l.Id, l.PropertyId,
        l.Property?.FullAddress ?? string.Empty,
        l.ListingType.ToString(), l.AdvertisedPrice, l.PriceText,
        l.Status.ToString(), l.AgencyName, l.AgentName, l.Description,
        l.ListedAt, l.DaysOnMarket);
}
