using PropIntelligence.Domain.Enums;

namespace PropIntelligence.Domain.Entities;

/// <summary>
/// A recorded property sale transaction.
///
/// DaysOnMarket is nullable because:
/// - Off-market sales have no listing period to measure.
/// - Pre-market / off-the-plan sales may not have a publicly listed period.
/// Storing null is more honest than defaulting to 0.
/// </summary>
public class SalesHistory
{
    public Guid Id              { get; private set; }
    public Guid PropertyId      { get; private set; }
    public decimal Price        { get; private set; }
    public DateTime SaleDate    { get; private set; }
    public SaleMethod SaleMethod { get; private set; }
    public string AgencyName    { get; private set; } = string.Empty;
    public string? AgentName    { get; private set; }
    public int? DaysOnMarket    { get; private set; }
    public DateTime CreatedAt   { get; private set; }

    public Property Property    { get; private set; } = null!;

    private SalesHistory() { }

    public static SalesHistory Record(
        Guid propertyId,
        decimal price,
        DateTime saleDate,
        SaleMethod saleMethod,
        string agencyName,
        string? agentName,
        int? daysOnMarket)
    {
        if (price <= 0) throw new ArgumentOutOfRangeException(nameof(price), "Sale price must be positive.");
        if (string.IsNullOrWhiteSpace(agencyName)) throw new ArgumentException("Agency name is required.", nameof(agencyName));

        return new SalesHistory
        {
            Id           = Guid.NewGuid(),
            PropertyId   = propertyId,
            Price        = price,
            SaleDate     = saleDate,
            SaleMethod   = saleMethod,
            AgencyName   = agencyName,
            AgentName    = agentName,
            DaysOnMarket = daysOnMarket,
            CreatedAt    = DateTime.UtcNow
        };
    }
}
