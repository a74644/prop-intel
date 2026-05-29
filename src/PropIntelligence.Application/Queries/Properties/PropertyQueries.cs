using MediatR;
using PropIntelligence.Application.Commands.Properties;
using PropIntelligence.Application.DTOs;
using PropIntelligence.Application.DTOs.Common;
using PropIntelligence.Application.Interfaces;
using PropIntelligence.Domain.Enums;
using PropIntelligence.Domain.Entities;

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

// ── Natural Language Search ───────────────────────────────────────────────────

public record NaturalLanguageSearchQuery(string Query, int PageSize = 20)
    : IRequest<NaturalSearchResultDto>;

public class NaturalLanguageSearchQueryHandler
    : IRequestHandler<NaturalLanguageSearchQuery, NaturalSearchResultDto>
{
    private readonly INaturalLanguageService _nlService;
    private readonly IPropertyRepository    _properties;

    public NaturalLanguageSearchQueryHandler(
        INaturalLanguageService nlService,
        IPropertyRepository     properties)
    {
        _nlService  = nlService;
        _properties = properties;
    }

    public async Task<NaturalSearchResultDto> Handle(
        NaturalLanguageSearchQuery request, CancellationToken ct)
    {
        var parsed = await _nlService.ParseSearchQueryAsync(request.Query, ct);

        AustralianState? state = Enum.TryParse<AustralianState>(parsed.State, true, out var s) ? s : null;
        PropertyType?    type  = Enum.TryParse<PropertyType>(parsed.PropertyType, true, out var pt) ? pt : null;

        var (items, total) = await _properties.SearchAsync(
            parsed.Suburb, state, null,
            type, parsed.MinBedrooms, parsed.MaxBedrooms,
            parsed.MinPrice, parsed.MaxPrice,
            1, request.PageSize, ct);

        var results = new PagedResult<PropertySummaryDto>(
            items.Select(PropertyMapper.ToSummary),
            total, 1, request.PageSize);

        return new NaturalSearchResultDto(request.Query, parsed, results);
    }
}
