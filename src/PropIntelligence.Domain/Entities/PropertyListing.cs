using PropIntelligence.Domain.Enums;

namespace PropIntelligence.Domain.Entities;

/// <summary>
/// A current or historical listing for a property (for-sale or for-rent).
///
/// Note: AdvertisedPrice is intentionally nullable. In AU, many properties are
/// listed as "Contact Agent" or "Offers Over $X" — forcing a numeric price would
/// either lose data or require storing misleading zeros. PriceText holds the
/// display string; AdvertisedPrice holds the sortable/filterable value when known.
/// </summary>
public class PropertyListing
{
    public Guid Id                  { get; private set; }
    public Guid PropertyId          { get; private set; }
    public ListingType ListingType  { get; private set; }
    public decimal? AdvertisedPrice { get; private set; }
    public string PriceText         { get; private set; } = string.Empty;
    public ListingStatus Status     { get; private set; }
    public string AgencyName        { get; private set; } = string.Empty;
    public string AgentName         { get; private set; } = string.Empty;
    public string Description       { get; private set; } = string.Empty;
    public DateTime ListedAt        { get; private set; }
    public DateTime? SoldAt         { get; private set; }
    public int? DaysOnMarket        { get; private set; }
    public DateTime CreatedAt       { get; private set; }
    public DateTime UpdatedAt       { get; private set; }

    public Property Property        { get; private set; } = null!;

    private PropertyListing() { }

    public static PropertyListing Create(
        Guid propertyId,
        ListingType listingType,
        decimal? advertisedPrice,
        string priceText,
        string agencyName,
        string agentName,
        string description,
        DateTime listedAt)
    {
        return new PropertyListing
        {
            Id              = Guid.NewGuid(),
            PropertyId      = propertyId,
            ListingType     = listingType,
            AdvertisedPrice = advertisedPrice,
            PriceText       = priceText,
            Status          = ListingStatus.Active,
            AgencyName      = agencyName,
            AgentName       = agentName,
            Description     = description,
            ListedAt        = listedAt,
            CreatedAt       = DateTime.UtcNow,
            UpdatedAt       = DateTime.UtcNow
        };
    }

    public void UpdateStatus(ListingStatus newStatus)
    {
        Status = newStatus;
        if (newStatus is ListingStatus.Sold or ListingStatus.Leased)
        {
            SoldAt = DateTime.UtcNow;
            DaysOnMarket = (int)(SoldAt.Value - ListedAt).TotalDays;
        }
        UpdatedAt = DateTime.UtcNow;
    }
}
