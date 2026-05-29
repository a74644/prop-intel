using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using PropIntelligence.Application.Commands.Properties;
using PropIntelligence.Application.Commands.Sales;
using PropIntelligence.Application.DTOs;
using PropIntelligence.Application.DTOs.Common;
using PropIntelligence.Application.Queries.Properties;
using PropIntelligence.Domain.Enums;

namespace PropIntelligence.API.Controllers;

/// <summary>
/// Core property data endpoints.
/// Read operations are public. Write operations require a valid JWT (Agent or Admin role).
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class PropertiesController : ControllerBase
{
    private readonly IMediator _mediator;
    public PropertiesController(IMediator mediator) => _mediator = mediator;

    // ── GET /api/properties/{id} ──────────────────────────────────────────────

    /// <summary>Get full property detail including sales history and active listings.</summary>
    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(PropertyDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetPropertyByIdQuery(id), ct);
        return Ok(result);
    }

    // ── GET /api/properties/search ────────────────────────────────────────────

    /// <summary>
    /// Search and filter properties. All parameters are optional and combinable.
    /// </summary>
    /// <param name="suburb">Partial suburb name match (e.g. "Fitzroy")</param>
    /// <param name="state">AU state code (NSW, VIC, QLD, WA, SA, TAS, ACT, NT)</param>
    /// <param name="postcode">Exact 4-digit postcode</param>
    /// <param name="propertyType">House, Apartment, Townhouse, Villa, Land, Studio</param>
    /// <param name="minBedrooms">Minimum bedroom count</param>
    /// <param name="maxBedrooms">Maximum bedroom count</param>
    /// <param name="minPrice">Minimum last-sale price</param>
    /// <param name="maxPrice">Maximum last-sale price</param>
    /// <param name="page">1-based page number (default: 1)</param>
    /// <param name="pageSize">Items per page, max 50 (default: 20)</param>
    [HttpGet("search")]
    [ProducesResponseType(typeof(PagedResult<PropertySummaryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Search(
        [FromQuery] string?  suburb,
        [FromQuery] string?  state,
        [FromQuery] string?  postcode,
        [FromQuery] string?  propertyType,
        [FromQuery] int?     minBedrooms,
        [FromQuery] int?     maxBedrooms,
        [FromQuery] decimal? minPrice,
        [FromQuery] decimal? maxPrice,
        [FromQuery] int      page     = 1,
        [FromQuery] int      pageSize = 20,
        CancellationToken    ct       = default)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        page     = Math.Max(1, page);

        AustralianState? parsedState = Enum.TryParse<AustralianState>(state, true, out var s) ? s : null;
        PropertyType?    parsedType  = Enum.TryParse<PropertyType>(propertyType, true, out var pt) ? pt : null;

        var result = await _mediator.Send(new SearchPropertiesQuery(
            suburb, parsedState, postcode, parsedType,
            minBedrooms, maxBedrooms, minPrice, maxPrice,
            page, pageSize), ct);

        return Ok(result);
    }

    // ── GET /api/properties/{id}/nearby ───────────────────────────────────────

    /// <summary>
    /// Returns properties near a given property, sorted by distance.
    /// Useful for "comparable sales" display in property reports.
    /// </summary>
    [HttpGet("{id:guid}/nearby")]
    [ProducesResponseType(typeof(IEnumerable<NearbyPropertyDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNearby(
        Guid  id,
        [FromQuery] double radiusKm   = 2.0,
        [FromQuery] int    maxResults = 10,
        CancellationToken  ct         = default)
    {
        var property = await _mediator.Send(new GetPropertyByIdQuery(id), ct);
        var result = await _mediator.Send(new GetNearbyPropertiesQuery(
            property.Location.Coordinates[1],   // lat = index 1 in GeoJSON
            property.Location.Coordinates[0],   // lon = index 0
            Math.Clamp(radiusKm, 0.5, 20.0),
            Math.Clamp(maxResults, 1, 50),
            id), ct);
        return Ok(result);
    }

    // ── GET /api/properties/nearby ────────────────────────────────────────────

    /// <summary>Returns properties near a given lat/lon coordinate.</summary>
    [HttpGet("nearby")]
    [ProducesResponseType(typeof(IEnumerable<NearbyPropertyDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetNearbyByCoord(
        [FromQuery] double latitude,
        [FromQuery] double longitude,
        [FromQuery] double radiusKm   = 2.0,
        [FromQuery] int    maxResults = 20,
        CancellationToken  ct         = default)
    {
        var result = await _mediator.Send(new GetNearbyPropertiesQuery(
            latitude, longitude,
            Math.Clamp(radiusKm, 0.5, 20.0),
            Math.Clamp(maxResults, 1, 50)), ct);
        return Ok(result);
    }

    // ── GET /api/properties/{id}/valuation ────────────────────────────────────

    /// <summary>
    /// Automated Valuation Model (AVM) for a property.
    /// Uses comparable sales within an expanding radius (1 km → 2 km → 5 km).
    /// Confidence: High (≥5 comps, ≤1 km), Medium (3-4 comps), Low (1-2 comps).
    /// Requires floor area to be known; returns "Insufficient Data" otherwise.
    /// </summary>
    [HttpGet("{id:guid}/valuation")]
    [ProducesResponseType(typeof(ValuationDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetValuation(Guid id, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetPropertyValuationQuery(id), ct);
        return Ok(result);
    }

    // ── POST /api/properties/search/natural ──────────────────────────────────

    /// <summary>
    /// Natural language property search powered by AI.
    /// Pass a plain-English query and the AI extracts search parameters automatically.
    /// Example: "3 bedroom house in Sydney under $2 million"
    /// </summary>
    [HttpPost("search/natural")]
    [ProducesResponseType(typeof(NaturalSearchResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> NaturalSearch(
        [FromBody] NaturalLanguageSearchRequest body,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.Query))
            return BadRequest(new { error = "Query must not be empty." });

        var result = await _mediator.Send(
            new NaturalLanguageSearchQuery(body.Query.Trim(), body.PageSize ?? 20), ct);

        return Ok(result);
    }

    // ── POST /api/properties ──────────────────────────────────────────────────

    /// <summary>Create a new property record. Requires Agent or Admin role.</summary>
    [HttpPost]
    [Authorize(Roles = "Agent,Admin")]
    [ProducesResponseType(typeof(PropertyDetailDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Create([FromBody] CreatePropertyRequest body, CancellationToken ct)
    {
        if (!Enum.TryParse<AustralianState>(body.State, true, out var state))
            return BadRequest(new { error = $"Invalid state '{body.State}'. Valid values: NSW, VIC, QLD, WA, SA, TAS, ACT, NT." });

        if (!Enum.TryParse<PropertyType>(body.PropertyType, true, out var type))
            return BadRequest(new { error = $"Invalid property type '{body.PropertyType}'." });

        var result = await _mediator.Send(new CreatePropertyCommand(
            body.UnitNumber ?? string.Empty,
            body.StreetNumber, body.StreetName, body.StreetType,
            body.Suburb, state, body.Postcode,
            body.Latitude, body.Longitude,
            type, body.Bedrooms, body.Bathrooms, body.CarSpaces,
            body.LandAreaSqm, body.FloorAreaSqm,
            body.LotNumber, body.PlanNumber), ct);

        return CreatedAtAction(nameof(GetById), new { id = result.Id }, result);
    }

    // ── PUT /api/properties/{id} ──────────────────────────────────────────────

    /// <summary>Update property attributes (bedrooms, bathrooms, areas). Requires Agent or Admin.</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Agent,Admin")]
    [ProducesResponseType(typeof(PropertyDetailDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePropertyRequest body, CancellationToken ct)
    {
        if (!Enum.TryParse<PropertyType>(body.PropertyType, true, out var type))
            return BadRequest(new { error = $"Invalid property type '{body.PropertyType}'." });

        var result = await _mediator.Send(new UpdatePropertyCommand(
            id, type, body.Bedrooms, body.Bathrooms, body.CarSpaces,
            body.LandAreaSqm, body.FloorAreaSqm), ct);
        return Ok(result);
    }

    // ── DELETE /api/properties/{id} ───────────────────────────────────────────

    /// <summary>Delete a property and all associated sales history. Requires Admin role.</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new DeletePropertyCommand(id), ct);
        return NoContent();
    }

    // ── POST /api/properties/{id}/sales ───────────────────────────────────────

    /// <summary>Record a sale transaction for a property. Requires Agent or Admin.</summary>
    [HttpPost("{id:guid}/sales")]
    [Authorize(Roles = "Agent,Admin")]
    [ProducesResponseType(typeof(SalesHistoryDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> RecordSale(Guid id, [FromBody] RecordSaleRequest body, CancellationToken ct)
    {
        if (!Enum.TryParse<SaleMethod>(body.SaleMethod, true, out var method))
            return BadRequest(new { error = $"Invalid sale method '{body.SaleMethod}'. Valid: Auction, PrivateTreaty, Tender, SetDateSale." });

        var result = await _mediator.Send(new RecordSaleCommand(
            id, body.Price, body.SaleDate, method,
            body.AgencyName, body.AgentName, body.DaysOnMarket), ct);

        return StatusCode(StatusCodes.Status201Created, result);
    }
}

// ── Request models ────────────────────────────────────────────────────────────

public record CreatePropertyRequest(
    string?  UnitNumber,
    string   StreetNumber,
    string   StreetName,
    string   StreetType,
    string   Suburb,
    string   State,
    string   Postcode,
    double   Latitude,
    double   Longitude,
    string   PropertyType,
    int      Bedrooms,
    int      Bathrooms,
    int      CarSpaces,
    decimal? LandAreaSqm,
    decimal? FloorAreaSqm,
    string?  LotNumber,
    string?  PlanNumber);

public record UpdatePropertyRequest(
    string   PropertyType,
    int      Bedrooms,
    int      Bathrooms,
    int      CarSpaces,
    decimal? LandAreaSqm,
    decimal? FloorAreaSqm);

public record NaturalLanguageSearchRequest(string Query, int? PageSize);
