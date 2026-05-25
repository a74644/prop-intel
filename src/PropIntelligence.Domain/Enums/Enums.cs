namespace PropIntelligence.Domain.Enums;

public enum PropertyType
{
    House       = 1,
    Apartment   = 2,
    Townhouse   = 3,
    Villa       = 4,
    Land        = 5,
    AcreageSemiRural = 6,
    Rural       = 7,
    Studio      = 8
}

public enum ListingType
{
    ForSale = 1,
    ForRent = 2
}

public enum ListingStatus
{
    Active          = 1,
    UnderContract   = 2,
    Sold            = 3,
    Withdrawn       = 4,
    Leased          = 5
}

public enum SaleMethod
{
    /// <summary>Auction — common for Sydney and Melbourne inner suburbs.</summary>
    Auction         = 1,
    /// <summary>Private treaty / expression of interest.</summary>
    PrivateTreaty   = 2,
    Tender          = 3,
    SetDateSale     = 4
}

public enum UserRole
{
    Consumer = 1,
    Agent    = 2,
    Admin    = 3
}
