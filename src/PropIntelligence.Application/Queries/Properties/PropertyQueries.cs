using MediatR;
using PropIntelligence.Application.Commands.Properties;
using PropIntelligence.Application.DTOs;
using PropIntelligence.Application.DTOs.Common;
using PropIntelligence.Application.Interfaces;
using PropIntelligence.Domain.Enums;

namespace PropIntelligence.Application.Queries.Properties;

// ── Get by ID ─────────────────────────────────────────────────────────────────

public record GetPropertyByIdQuery(Guid Id) : IRequest<PropertyDetailDto>;

public class GetPropertyByIdQueryHandler : IRequestHandler<GetPropertyByIdQuery, PropertyDetailDto>
{
    private readonly IPropertyRepository _properties;

    public GetPropertyByIdQueryHandler(IPropertyRepository properties)
        => _properties = properties;

    public async Task<PropertyDetailDto> Handle(GetPropertyByIdQuery request, CancellationToken ct)
    {
        var property = await _properties.GetByIdAsync(request.Id, ct)
            ?? throw new KeyNotFoundException($"Property {request.Id} not found.");
        return PropertyMapper.ToDetail(property);
    }
}

// ── Search ────────────────────────────────────────────────────────────────────

/// <summary>
/// Paginated, multi-filter property search. All filters are optional and combinable.
/// </summary>
public record SearchPropertiesQuery(
    string?          Suburb,
    AustralianState? State,
    string?          Postcode,
    PropertyType?    PropertyType,
    int?             MinBedrooms,
    int?             MaxBedrooms,
    decimal?         MinPrice,
    decimal?         MaxPrice,
    int              Page     = 1,
    int              PageSize = 20) : IRequest<PagedResult<PropertySummaryDto>>;

public class SearchPropertiesQueryHandler : IRequestHandler<SearchPropertiesQuery, PagedResult<PropertySummaryDto>>
{
    private readonly IPropertyRepository _properties;

    public SearchPropertiesQueryHandler(IPropertyRepository properties)
        => _properties = properties;

    public async Task<PagedResult<PropertySummaryDto>> Handle(
        SearchPropertiesQuery req, CancellationToken ct)
    {
        var (items, total) = await _properties.SearchAsync(
            req.Suburb, req.State, req.Postcode,
            req.PropertyType, req.MinBedrooms, req.MaxBedrooms,
            req.MinPrice, req.MaxPrice,
            req.Page, req.PageSize, ct);

        return new PagedResult<PropertySummaryDto>(
            items.Select(PropertyMapper.ToSummary),
            total, req.Page, req.PageSize);
    }
}
