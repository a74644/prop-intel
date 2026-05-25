using MediatR;
using Microsoft.AspNetCore.Mvc;
using PropIntelligence.Application.DTOs;
using PropIntelligence.Application.DTOs.Common;
using PropIntelligence.Application.Queries.Sales;
using PropIntelligence.Application.Queries.Suburbs;
using PropIntelligence.Domain.Enums;

namespace PropIntelligence.API.Controllers;

/// <summary>
/// Suburb-level market statistics — median prices, days on market,
/// annual growth and auction clearance rates. Mirrors the analytics
/// exposed by CoreLogic / PropTrack / Domain Insights in production.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class SuburbsController : ControllerBase
{
    private readonly IMediator _mediator;
    public SuburbsController(IMediator mediator) => _mediator = mediator;

    /// <summary>
    /// Get aggregated market statistics for a suburb.
    /// All metrics are computed from properties and sales in the database.
    /// </summary>
    /// <param name="suburb">Suburb name (e.g. "Fitzroy")</param>
    /// <param name="state">AU state code — required to disambiguate same-name suburbs across states</param>
    [HttpGet("{suburb}/statistics")]
    [ProducesResponseType(typeof(SuburbStatisticsDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> GetStatistics(
        string suburb,
        [FromQuery] string state,
        CancellationToken ct = default)
    {
        if (!Enum.TryParse<AustralianState>(state, true, out var parsedState))
            return BadRequest(new { error = $"Invalid state '{state}'. Valid values: NSW, VIC, QLD, WA, SA, TAS, ACT, NT." });

        var result = await _mediator.Send(new GetSuburbStatisticsQuery(suburb, parsedState), ct);
        return Ok(result);
    }
}

// ── Sales History ─────────────────────────────────────────────────────────────

/// <summary>
/// Sales history lookup by property or suburb.
/// </summary>
[ApiController]
[Route("api/sales")]
[Produces("application/json")]
public class SalesController : ControllerBase
{
    private readonly IMediator _mediator;
    public SalesController(IMediator mediator) => _mediator = mediator;

    /// <summary>
    /// Query sales history. Either propertyId OR suburb (+ state) must be provided.
    /// </summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<SalesHistoryDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(
        [FromQuery] Guid?   propertyId,
        [FromQuery] string? suburb,
        [FromQuery] string? state,
        [FromQuery] string? fromDate,
        [FromQuery] string? toDate,
        [FromQuery] int     page     = 1,
        [FromQuery] int     pageSize = 20,
        CancellationToken   ct       = default)
    {
        if (propertyId is null && string.IsNullOrWhiteSpace(suburb))
            return BadRequest(new { error = "Provide either 'propertyId' or 'suburb' query parameter." });

        pageSize = Math.Clamp(pageSize, 1, 100);
        page     = Math.Max(1, page);

        AustralianState? parsedState  = Enum.TryParse<AustralianState>(state, true, out var s) ? s : null;
        DateTime?        parsedFrom   = DateTime.TryParse(fromDate, out var fd) ? fd : null;
        DateTime?        parsedTo     = DateTime.TryParse(toDate,   out var td) ? td : null;

        var result = await _mediator.Send(new GetSalesHistoryQuery(
            propertyId, suburb, parsedState, parsedFrom, parsedTo, page, pageSize), ct);

        return Ok(result);
    }
}
